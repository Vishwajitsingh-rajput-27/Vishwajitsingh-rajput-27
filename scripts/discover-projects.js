const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const profile = JSON.parse(fs.readFileSync(path.join(root, "config", "profile.json"), "utf8"));
const projectConfig = JSON.parse(fs.readFileSync(path.join(root, "config", "projects.json"), "utf8"));
const outputPath = path.join(root, "data", "repositories.json");

const ignoredNamePattern = /(test|template|hello-world|practice|sandbox|demo)/i;
const relevanceKeywords = ["ai", "full-stack", "nextjs", "react", "automation", "computer-vision", "geospatial", "ml"];

function runGhApi(endpoint) {
  const result = spawnSync("gh", ["api", endpoint], { encoding: "utf8" });
  if (result.status === 0 && result.stdout) return JSON.parse(result.stdout);
  return null;
}

async function fetchRepos(username) {
  const repos = [];
  let page = 1;
  while (true) {
    const ghResponse = runGhApi(`users/${username}/repos?per_page=100&page=${page}&sort=updated`);
    let chunk = ghResponse;
    if (!chunk) {
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`, {
        headers: {
          "User-Agent": "profile-readme-bot",
          ...(process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {})
        }
      });
      if (!res.ok) throw new Error(`Repo fetch failed at page ${page}: ${res.status}`);
      chunk = await res.json();
    }
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    repos.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
  }
  return repos;
}

async function fetchReadmeLength(owner, repo) {
  const endpoint = `repos/${owner}/${repo}/readme`;
  const ghResult = runGhApi(endpoint);
  let content = ghResult;
  if (!content) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "profile-readme-bot",
        ...(process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {})
      }
    });
    if (res.ok) content = await res.json();
  }
  return content?.size || 0;
}

function scoreRepository(repo, readmeSize) {
  const now = new Date();
  const updated = new Date(repo.updated_at);
  const days = Math.max(1, Math.floor((now - updated) / (1000 * 60 * 60 * 24)));
  const activityScore = Math.max(0, 30 - Math.min(30, Math.floor(days / 6)));
  const readmeScore = Math.min(20, Math.floor(readmeSize / 250));
  const descriptionScore = repo.description ? Math.min(12, Math.floor(repo.description.length / 20)) : 0;
  const completenessScore = (repo.homepage ? 4 : 0) + (repo.license ? 4 : 0) + ((repo.topics || []).length > 0 ? 4 : 0);
  const originalityScore = repo.fork ? 0 : 12;
  const relevanceScore = (repo.topics || []).reduce((acc, topic) => acc + (relevanceKeywords.includes(topic.toLowerCase()) ? 3 : 0), 0);
  const popularitySignal = Math.min(8, (repo.stargazers_count || 0) + (repo.forks_count || 0));
  return activityScore + readmeScore + descriptionScore + completenessScore + originalityScore + relevanceScore + popularitySignal;
}

(async () => {
  let repos = [];
  try {
    repos = await fetchRepos(profile.username);
  } catch {
    repos = [];
  }
  const excluded = new Set(projectConfig.excludedRepositories.map((r) => r.toLowerCase()));

  const candidates = repos.filter((repo) => {
    if (repo.private || repo.fork || repo.archived) return false;
    if (repo.size === 0) return false;
    if (excluded.has(repo.name.toLowerCase())) return false;
    if (ignoredNamePattern.test(repo.name)) return false;
    return true;
  });

  const enriched = [];
  for (const repo of candidates) {
    const readmeSize = await fetchReadmeLength(repo.owner.login, repo.name);
    const score = scoreRepository(repo, readmeSize);
    enriched.push({ repo, readmeSize, score });
  }

  const pinned = projectConfig.pinnedRepositories.map((name) => name.toLowerCase());
  const pinnedRepos = enriched.filter(({ repo }) => pinned.includes(repo.name.toLowerCase()));
  const others = enriched.filter(({ repo }) => !pinned.includes(repo.name.toLowerCase()));

  const sorted = [...pinnedRepos.sort((a, b) => b.score - a.score), ...others.sort((a, b) => b.score - a.score)]
    .slice(0, Math.max(1, projectConfig.maximumFeaturedProjects || 4));

  const featured = sorted.map(({ repo, score, readmeSize }) => ({
    name: repo.name,
    url: repo.html_url,
    description: repo.description || "",
    languages: repo.language ? [repo.language] : [],
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    updatedAt: repo.updated_at,
    homepage: repo.homepage || "",
    archived: !!repo.archived,
    score,
    readmeSize
  }));

  const payload = {
    featured,
    scoringModel: {
      factors: [
        "recent_activity",
        "readme_quality",
        "description_quality",
        "repository_completeness",
        "originality",
        "profile_relevance",
        "topics",
        "verified_homepage",
        "documentation_quality"
      ]
    },
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, outputPath)}`);
})();
