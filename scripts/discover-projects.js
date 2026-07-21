import {
  daysSince,
  fetchJson,
  fetchPublicRepositories,
  fetchPublicUrl,
  githubApiUrl,
  normalizeUrl,
  isSafePublicHttpUrl,
  readJson,
  repositoryUrl,
  writeJson
} from './lib.js';

const profile = readJson('config/profile.json');
const config = readJson('config/projects.json');
const cache = readJson('data/repositories.json', { repositories: [], featured: [] });
const skills = readJson('config/skills.json');
const username = profile.username;
const profileRepositoryName = username.toLowerCase();
const excluded = new Set(config.excludedRepositories.map((name) => name.toLowerCase()));
const pinned = config.pinnedRepositories.map((name) => name.toLowerCase());
const priorById = new Map((cache.repositories ?? []).map((repo) => [String(repo.id), repo]));
const testNamePattern = /(^|[-_.])(test|tests|demo|sample|template|tutorial|practice|hello[-_.]?world|sandbox|playground)([-_.]|$)/i;
const relevanceTerms = [
  'ai', 'artificial intelligence', 'full-stack', 'fullstack', 'next.js', 'nextjs', 'react', 'node',
  'computer vision', 'opencv', 'geospatial', 'satellite', 'education', 'automation', 'resume', 'road',
  'research', 'android', 'kotlin'
];

function cleanMarkdownText(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readmeDescription(readmeText) {
  const paragraphs = readmeText
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/)
    .map(cleanMarkdownText)
    .filter((text) => text.length >= 35 && !/^(license|installation|setup|features|documentation|table of contents)$/i.test(text));
  return paragraphs.find((text) => !text.toLowerCase().startsWith('badge'))?.slice(0, 220) ?? '';
}

function scoreRepository(repo, readmeText, languages, homepageVerified, description) {
  const age = daysSince(repo.pushed_at || repo.updated_at);
  const recentActivity = age <= 14 ? 20 : age <= 45 ? 17 : age <= 120 ? 13 : age <= 365 ? 8 : 3;
  const readmeLength = readmeText.trim().length;
  const headingCount = (readmeText.match(/^#{1,3}\s+/gm) ?? []).length;
  const readmeQuality = readmeLength >= 2500 && headingCount >= 5 ? 20 : readmeLength >= 1000 && headingCount >= 3 ? 15 : readmeLength >= 300 ? 9 : 0;
  const descriptionLength = description.trim().length;
  const descriptionQuality = descriptionLength >= 60 ? 12 : descriptionLength >= 25 ? 9 : descriptionLength > 0 ? 5 : 0;
  const repositoryCompleteness = Math.min(
    14,
    (repo.size > 100 ? 5 : repo.size > 10 ? 3 : 0) +
      (readmeLength > 300 ? 5 : 0) +
      (Object.keys(languages).length >= 2 ? 2 : Object.keys(languages).length === 1 ? 1 : 0) +
      (repo.license ? 2 : 0)
  );
  const originality = repo.fork ? 0 : 8;
  const haystack = `${repo.name} ${description} ${(repo.topics ?? []).join(' ')}`.toLowerCase();
  const relevanceMatches = relevanceTerms.filter((term) => haystack.includes(term)).length;
  const profileRelevance = Math.min(16, relevanceMatches * 4);
  const topics = Math.min(5, (repo.topics ?? []).length);
  const verifiedHomepage = homepageVerified ? 3 : 0;
  const communitySignal = Math.min(2, Math.log2((repo.stargazers_count ?? 0) + 1)) + Math.min(1, Math.log2((repo.forks_count ?? 0) + 1));
  const total = Math.round(recentActivity + readmeQuality + descriptionQuality + repositoryCompleteness + originality + profileRelevance + topics + verifiedHomepage + communitySignal);
  return {
    total,
    breakdown: {
      recentActivity,
      readmeQuality,
      descriptionQuality,
      repositoryCompleteness,
      originality,
      profileRelevance,
      topics,
      verifiedHomepage,
      communitySignal: Number(communitySignal.toFixed(2))
    }
  };
}

async function verifyHomepage(homepage, repoId) {
  if (!homepage || !isSafePublicHttpUrl(homepage)) return { verified: false, source: 'none' };
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetchPublicUrl(homepage, {
        method,
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'github-profile-readme-automation' }
      });
      if (response.ok) return { verified: true, source: 'network' };
      if (![403, 405, 429].includes(response.status)) return { verified: false, source: 'network' };
    } catch {
      // Try the next method, then use a matching previously verified value.
    }
  }
  const prior = priorById.get(String(repoId));
  const retained = prior?.homepageVerified === true && normalizeUrl(prior.homepage) === homepage;
  return { verified: retained, source: retained ? 'cached-verified' : 'none' };
}

async function readRepositoryEvidence(repo) {
  const prior = priorById.get(String(repo.id));
  let readmeText = '';
  let readmeFetched = false;
  let languages = prior?.languageBytes && Object.keys(prior.languageBytes).length ? prior.languageBytes : {};
  try {
    const readme = await fetchJson(githubApiUrl(`/repos/${repo.full_name}/readme`));
    if (readme?.content) {
      readmeText = Buffer.from(readme.content, readme.encoding || 'base64').toString('utf8');
      readmeFetched = true;
    }
  } catch {
    // A missing or temporarily unavailable README must not erase cached descriptions.
  }
  try {
    const response = await fetchJson(githubApiUrl(`/repos/${repo.full_name}/languages`));
    if (response && typeof response === 'object' && !Array.isArray(response) && Object.keys(response).length) languages = response;
  } catch {
    if (!Object.keys(languages).length && repo.language) languages = { [repo.language]: 1 };
  }
  const homepage = normalizeUrl(repo.homepage ?? prior?.homepage ?? '');
  const homepageResult = await verifyHomepage(homepage, repo.id);
  return {
    readmeText,
    readmeFetched,
    languages,
    homepage,
    homepageVerified: homepageResult.verified,
    homepageVerificationSource: homepageResult.source
  };
}

function isEligibleBase(repo) {
  if (repo.private || repo.fork || repo.archived || repo.disabled) return false;
  if ((repo.name ?? '').toLowerCase() === profileRepositoryName) return false;
  if (excluded.has((repo.name ?? '').toLowerCase())) return false;
  if ((repo.size ?? 0) <= 0) return false;
  if (testNamePattern.test(repo.name ?? '')) return false;
  return true;
}

try {
  const { repositories: publicRepos, source } = await fetchPublicRepositories(username);
  if (!Array.isArray(publicRepos)) throw new Error('Public repository response was invalid.');
  if (publicRepos.length === 0 && (cache.repositories ?? []).length > 0) {
    throw new Error('GitHub returned an unexpectedly empty repository list; cached discovery data was retained.');
  }

  const candidates = [];
  const suggestedTechnologyNames = new Set();

  for (const repo of publicRepos.filter(isEligibleBase)) {
    const evidence = await readRepositoryEvidence(repo);
    const prior = priorById.get(String(repo.id));
    const apiDescription = (repo.description ?? '').trim();
    const derivedDescription = readmeDescription(evidence.readmeText);
    const description = prior?.manualDescriptionLocked
      ? prior.description
      : apiDescription || derivedDescription || prior?.description || '';
    const score = scoreRepository(repo, evidence.readmeText, evidence.languages, evidence.homepageVerified, description);
    const languageNames = Object.keys(evidence.languages);
    languageNames.forEach((name) => suggestedTechnologyNames.add(name));
    (repo.topics ?? []).forEach((topic) => suggestedTechnologyNames.add(topic));

    candidates.push({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url || repositoryUrl(username, repo.name),
      description,
      descriptionSource: prior?.manualDescriptionLocked ? 'manual-locked' : apiDescription ? 'github-api' : derivedDescription ? 'repository-readme' : 'cached',
      manualDescriptionLocked: Boolean(prior?.manualDescriptionLocked),
      homepage: evidence.homepageVerified ? evidence.homepage : '',
      homepageVerified: evidence.homepageVerified,
      homepageVerificationSource: evidence.homepageVerificationSource,
      languages: languageNames,
      languageBytes: evidence.languages,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      updatedAt: repo.updated_at ?? '',
      pushedAt: repo.pushed_at ?? '',
      archived: false,
      fork: false,
      size: repo.size ?? 0,
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      license: repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : '',
      readmeQuality: evidence.readmeFetched
        ? score.breakdown.readmeQuality >= 15 ? 'strong' : score.breakdown.readmeQuality >= 9 ? 'adequate' : 'limited'
        : prior?.readmeQuality || (score.breakdown.readmeQuality >= 9 ? 'adequate' : 'limited'),
      score: score.total,
      scoreBreakdown: score.breakdown
    });
  }

  const byName = new Map(candidates.map((repo) => [repo.name.toLowerCase(), repo]));
  const featured = [];
  for (const name of pinned) {
    const repo = byName.get(name);
    if (repo && !featured.includes(repo.name)) featured.push(repo.name);
  }
  const ranked = [...candidates]
    .filter((repo) => repo.description && repo.readmeQuality !== 'limited' && repo.score >= 45)
    .sort((a, b) => b.score - a.score || Date.parse(b.pushedAt || b.updatedAt || 0) - Date.parse(a.pushedAt || a.updatedAt || 0) || a.name.localeCompare(b.name));
  for (const repo of ranked) {
    if (featured.length >= config.maximumFeaturedProjects) break;
    if (!featured.includes(repo.name)) featured.push(repo.name);
  }

  const approvedNames = new Set(skills.approvedSkills.map((item) => item.name.toLowerCase()));
  const existingSuggestions = new Map(skills.suggestedSkills.map((item) => [item.name.toLowerCase(), item]));
  for (const name of suggestedTechnologyNames) {
    const normalized = String(name).trim();
    if (!normalized || approvedNames.has(normalized.toLowerCase()) || existingSuggestions.has(normalized.toLowerCase())) continue;
    existingSuggestions.set(normalized.toLowerCase(), {
      name: normalized,
      detectedFrom: 'public repository metadata',
      verificationStatus: 'suggested',
      visible: false
    });
  }
  skills.suggestedSkills = [...existingSuggestions.values()].sort((a, b) => a.name.localeCompare(b.name));
  writeJson('config/skills.json', skills);

  writeJson('data/repositories.json', {
    username,
    source,
    fetchedAt: new Date().toISOString(),
    stale: false,
    repositories: candidates.sort((a, b) => a.name.localeCompare(b.name)),
    featured,
    selectionPolicy: 'Pinned valid repositories first, followed by transparent quality scoring across recency, README quality, description quality, completeness, originality, profile relevance, topics, verified homepages, and a small community signal. Stars are never the sole ranking criterion.'
  });
  console.log(`Discovered ${candidates.length} eligible public repositories; selected ${featured.length} featured repositories.`);
} catch (error) {
  writeJson('data/repositories.json', {
    ...cache,
    stale: true,
    lastAttempt: new Date().toISOString()
  });
  console.warn(`Repository discovery failed; retained the last valid repository data. ${error.message}`);
}
