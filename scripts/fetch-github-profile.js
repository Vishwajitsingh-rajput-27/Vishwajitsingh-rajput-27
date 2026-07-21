import { fetchJson, fetchPublicRepositories, githubApiUrl, readJson, writeJson } from './lib.js';

const profileConfig = readJson('config/profile.json');
const cached = readJson('data/github-profile.json', {});
const username = profileConfig.username;
const now = new Date().toISOString();

function mergeNonEmpty(current, incoming) {
  return incoming === undefined || incoming === null || incoming === '' ? current : incoming;
}

function normalizeRepositories(repositories) {
  return repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? '',
    homepage: repo.homepage ?? '',
    fork: Boolean(repo.fork),
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    private: Boolean(repo.private),
    size: repo.size ?? 0,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    language: repo.language ?? '',
    updatedAt: repo.updated_at ?? '',
    pushedAt: repo.pushed_at ?? ''
  }));
}

try {
  const user = await fetchJson(githubApiUrl(`/users/${encodeURIComponent(username)}`));
  const { repositories, source } = await fetchPublicRepositories(username);
  const cachedRepositories = Array.isArray(cached.repositories) ? cached.repositories : [];
  const reportedCount = Number.isInteger(user.public_repos) ? user.public_repos : null;

  if (!Array.isArray(repositories)) throw new Error('Public repository response was invalid.');
  if (repositories.length === 0 && (reportedCount > 0 || cachedRepositories.length > 0)) {
    throw new Error('GitHub returned an unexpectedly empty public repository list; cached data was retained.');
  }

  let socialAccounts = [];
  try {
    const response = await fetchJson(githubApiUrl(`/users/${encodeURIComponent(username)}/social_accounts`));
    socialAccounts = Array.isArray(response) ? response : [];
  } catch {
    socialAccounts = cached.socialAccounts ?? [];
  }

  const next = {
    username,
    publicDisplayName: mergeNonEmpty(cached.publicDisplayName, user.name),
    publicBio: mergeNonEmpty(cached.publicBio, user.bio),
    publicLocation: mergeNonEmpty(cached.publicLocation, user.location),
    publicWebsite: mergeNonEmpty(cached.publicWebsite, user.blog),
    socialAccounts: socialAccounts
      .filter((item) => item?.url && item?.provider)
      .map((item) => ({ provider: item.provider, url: item.url })),
    publicRepositoryCount: reportedCount ?? repositories.length,
    followers: profileConfig.showFollowerCounts ? user.followers : null,
    following: profileConfig.showFollowerCounts ? user.following : null,
    accountCreatedAt: mergeNonEmpty(cached.accountCreatedAt, user.created_at),
    repositories: normalizeRepositories(repositories),
    cache: {
      status: 'fresh',
      stale: false,
      source,
      lastSuccessfulFetch: now
    }
  };

  writeJson('data/github-profile.json', next);
  console.log(`Fetched public GitHub profile and ${next.repositories.length} public repositories for ${username}.`);
} catch (error) {
  const fallback = {
    ...cached,
    username,
    cache: {
      ...(cached.cache ?? {}),
      status: 'cached-after-fetch-failure',
      stale: true,
      lastAttempt: now
    }
  };
  writeJson('data/github-profile.json', fallback);
  console.warn(`GitHub fetch failed; retained the last valid cache. ${error.message}`);
}
