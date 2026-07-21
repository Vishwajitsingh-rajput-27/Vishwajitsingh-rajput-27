const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const profile = JSON.parse(fs.readFileSync(path.join(root, "config", "profile.json"), "utf8"));
const projectConfig = JSON.parse(fs.readFileSync(path.join(root, "config", "projects.json"), "utf8"));
const outputPath = path.join(root, "data", "repositories.json");

const ignoredNamePattern = /(test|template|hello-world|practice|sandbox|demo|sample|assignment)/i;
const relevanceKeywords = [
  "ai",
  "full-stack",
  "fullstack",
  "next",
  "react",
  "automation",
  "computer vision",
  "geospatial",
  "satellite",
  "resume",
  "study",
  "developer"
];

function runGhApi(endpoint) {
  const result = spawnSync("gh", ["api", endpoint], { encoding: "utf8" });
  if (result.status === 0 && result.stdout) return JSON.parse(result.stdout);
  return null;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "profile-readme-bot",
      ...(process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {})
    }
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${url}`);
  return res.json();
}

async function fetchRepos(username) {
  const repos = [];
  let page = 1;
  while (true) {
    const endpoint = `users/${username}/repos?per_page=100&page=${page}&sort=updated`;
    const ghResponse = runGhApi(endpoint);
    const chunk = ghResponse || (await fetchJson(`https://api.github.com/${endpoint}`));
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    repos.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
  }
  return repos;
}

async function fetchLanguages(repo) {
  try {
    const languageMap = await fetchJson(repo.languages_url);
    return Object.entries(languageMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name]) => name);
  } catch {
    return repo.language ? [repo.language] : [];
  }
}

function scoreRepository(repo) {
  const description = (repo.description || "").toLowerCase();
  const topics = Array.isArray(repo.topics) ? repo.topics.map((topic) => topic.toLowerCase()) : [];
  const language = (repo.language || "").toLowerCase();

  let relevance = 0;
  for (const keyword of relevanceKeywords) {
    if (description.includes(keyword) || topics.some((topic) => topic.includes(keyword)) || language.includes(keyword)) {
      relevance += 3;
    }
  }

  const completeness = (repo.homepage ? 3 : 0) + (repo.description ? 3 : 0) + (topics.length > 0 ? 2 : 0);
  const quality = Math.min(8, Math.floor((repo.size || 0) / 150)) + Math.min(8, (repo.stargazers_count || 0) + (repo.forks_count || 0));

  return relevance + completeness + quality;
}

function readExistingData() {
  if (!fs.existsSync(outputPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch {
    return null;
  }
}

(async () => {
  const existing = readExistingData();
  const excluded = new Set((projectConfig.excludedRepositories || []).map((name) => name.toLowerCase()));
  excluded.add(profile.username.toLowerCase());

  let repos;
  try {
    repos = await fetchRepos(profile.username);
  } catch (error) {
    if (existing) {
      const fallback = {
        ...existing,
        syncStatus: {
          success: false,
          reason: "GitHub API unavailable; preserved previous repository snapshot"
        }
      };
      fs.writeFileSync(outputPath, `${JSON.stringify(fallback, null, 2)}\n`);
      console.log("GitHub API unavailable. Preserved previous repositories.json");
      process.exit(0);
    }
    throw error;
  }

  const candidates = repos
    .filter((repo) => {
      if (repo.private || repo.fork || repo.archived) return false;
      if ((repo.size || 0) < 50) return false;
      if (excluded.has(repo.name.toLowerCase())) return false;
      if (ignoredNamePattern.test(repo.name)) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const enriched = [];
  for (const repo of candidates) {
    const languages = await fetchLanguages(repo);
    const score = scoreRepository(repo);
    enriched.push({ repo, languages, score });
  }

  const pinned = (projectConfig.pinnedRepositories || []).map((name) => name.toLowerCase());
  const sorted = enriched.sort((a, b) => {
    const aPinned = pinned.includes(a.repo.name.toLowerCase()) ? 1 : 0;
    const bPinned = pinned.includes(b.repo.name.toLowerCase()) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    if (a.score !== b.score) return b.score - a.score;
    return new Date(b.repo.updated_at).getTime() - new Date(a.repo.updated_at).getTime();
  });

  const featured = sorted
    .slice(0, Math.max(1, projectConfig.maximumFeaturedProjects || 4))
    .map(({ repo, languages, score }) => ({
      name: repo.name,
      url: repo.html_url,
      description: repo.description || "",
      languages,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      homepage: repo.homepage || "",
      archived: Boolean(repo.archived),
      score,
      updatedAt: repo.updated_at
    }));

  const eligible = sorted.map(({ repo, languages, score }) => ({
    name: repo.name,
    url: repo.html_url,
    description: repo.description || "",
    languages,
    score,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    size: repo.size || 0,
    homepage: repo.homepage || "",
    updatedAt: repo.updated_at
  }));

  const payload = {
    featured,
    eligible,
    filters: {
      includeForks: false,
      includeArchived: false,
      includePrivate: false,
      minimumRepositorySize: 50,
      excludedRepositories: [...excluded].sort()
    },
    syncStatus: {
      success: true,
      reason: "Live repository metadata refreshed from GitHub"
    }
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, outputPath)}`);
})();
