import { hashValue, normalizeUrl, readJson, todayUtc, writeJson } from './lib.js';

const status = readJson('data/update-status.json', {});
const profile = readJson('config/profile.json');
const skills = readJson('config/skills.json');
const projectsConfig = readJson('config/projects.json');
const integrations = readJson('config/integrations.json');
const theme = readJson('config/theme.json');
const githubProfile = readJson('data/github-profile.json');
const repositoryData = readJson('data/repositories.json');
const languageData = readJson('data/language-summary.json');

function normalizeRepository(repo) {
  return {
    id: repo.id,
    name: repo.name,
    url: normalizeUrl(repo.url),
    description: repo.description ?? '',
    homepage: repo.homepageVerified ? normalizeUrl(repo.homepage) : '',
    languages: [...(repo.languages ?? [])].sort(),
    stars: repo.stars ?? 0,
    forks: repo.forks ?? 0,
    archived: Boolean(repo.archived),
    topics: [...(repo.topics ?? [])].sort(),
    score: repo.score ?? 0
  };
}

const state = {
  profile,
  approvedSkills: skills.approvedSkills.map((item) => ({ name: item.name, category: item.category, priority: item.priority, visible: item.visible, verificationStatus: item.verificationStatus })).sort((a, b) => a.name.localeCompare(b.name)),
  suggestedSkills: skills.suggestedSkills.map((item) => item.name).sort(),
  projectsConfig,
  integrations,
  theme,
  publicProfile: {
    displayName: githubProfile.publicDisplayName ?? '',
    bio: githubProfile.publicBio ?? '',
    location: githubProfile.publicLocation ?? '',
    website: normalizeUrl(githubProfile.publicWebsite ?? ''),
    socialAccounts: (githubProfile.socialAccounts ?? []).map((item) => ({ provider: item.provider, url: normalizeUrl(item.url) })).sort((a, b) => a.provider.localeCompare(b.provider))
  },
  repositories: (repositoryData.repositories ?? []).map(normalizeRepository).sort((a, b) => String(a.id).localeCompare(String(b.id))),
  featured: [...(repositoryData.featured ?? [])],
  languages: (languageData.languages ?? []).map((item) => ({ name: item.name, displayPercentage: item.displayPercentage })).sort((a, b) => a.name.localeCompare(b.name))
};

const fingerprint = hashValue(state);
const previousState = status.state;
const summary = [];

if (!previousState) {
  summary.push('Initial profile state recorded.');
} else {
  const previousRepos = new Map((previousState.repositories ?? []).map((repo) => [String(repo.id), repo]));
  const currentRepos = new Map(state.repositories.map((repo) => [String(repo.id), repo]));
  for (const [id, repo] of currentRepos) {
    const prior = previousRepos.get(id);
    if (!prior) summary.push(`New eligible public repository: ${repo.name}.`);
    else {
      if (prior.name !== repo.name || prior.url !== repo.url) summary.push(`Repository renamed or URL corrected: ${prior.name} → ${repo.name}.`);
      if (prior.description !== repo.description) summary.push(`Repository description updated: ${repo.name}.`);
      if (prior.homepage !== repo.homepage) summary.push(`Verified homepage changed: ${repo.name}.`);
      if (prior.archived !== repo.archived) summary.push(`Archive status changed: ${repo.name}.`);
      if (prior.stars !== repo.stars || prior.forks !== repo.forks) summary.push(`Repository community metrics changed: ${repo.name}.`);
      if (JSON.stringify(prior.languages) !== JSON.stringify(repo.languages)) summary.push(`Repository languages changed: ${repo.name}.`);
      if (JSON.stringify(prior.topics) !== JSON.stringify(repo.topics)) summary.push(`Repository topics changed: ${repo.name}.`);
    }
  }
  for (const [id, repo] of previousRepos) if (!currentRepos.has(id)) summary.push(`Repository removed from eligible public discovery: ${repo.name}.`);
  if (JSON.stringify(previousState.featured ?? []) !== JSON.stringify(state.featured)) summary.push('Featured repository selection changed.');
  if (hashValue(previousState.profile) !== hashValue(state.profile)) summary.push('Profile configuration changed.');
  if (hashValue(previousState.approvedSkills) !== hashValue(state.approvedSkills)) summary.push('Approved skill configuration changed.');
  if (hashValue(previousState.theme) !== hashValue(state.theme)) summary.push('Theme configuration changed.');
  if (hashValue(previousState.publicProfile) !== hashValue(state.publicProfile)) summary.push('Verified public GitHub profile information changed.');
  const previousLanguageMap = new Map((previousState.languages ?? []).map((item) => [item.name, item.displayPercentage]));
  const significantLanguageChange = state.languages.some((item) => Math.abs(item.displayPercentage - (previousLanguageMap.get(item.name) ?? 0)) >= 1.0) || (previousState.languages ?? []).some((item) => !state.languages.find((current) => current.name === item.name));
  if (significantLanguageChange) summary.push('Public repository language composition changed significantly.');
}

const meaningfulChanges = fingerprint !== status.fingerprint;
const next = {
  ...status,
  lastRunAt: new Date().toISOString(),
  meaningfulChanges,
  summary: meaningfulChanges ? (summary.length ? summary : ['Meaningful configuration or public-data change detected.']) : ['No meaningful profile changes detected.'],
  fingerprint,
  state,
  errors: []
};
if (meaningfulChanges) next.lastMeaningfulRefresh = todayUtc();
writeJson('data/update-status.json', next);
console.log(next.summary.join('\n'));
