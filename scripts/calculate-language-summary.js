const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const profile = JSON.parse(fs.readFileSync(path.join(root, "config", "profile.json"), "utf8"));
const outputPath = path.join(root, "data", "language-summary.json");

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "profile-readme-bot",
      ...(process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {})
    }
  });
  if (!res.ok) throw new Error(`Failed request ${url}: ${res.status}`);
  return res.json();
}

function readExisting() {
  if (!fs.existsSync(outputPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch {
    return null;
  }
}

(async () => {
  const existing = readExisting();
  let repos = [];

  try {
    repos = await fetchJson(`https://api.github.com/users/${profile.username}/repos?per_page=100&sort=updated`);
  } catch {
    if (existing) {
      const fallback = {
        ...existing,
        syncStatus: {
          success: false,
          reason: "GitHub API unavailable; preserved previous language summary"
        }
      };
      fs.writeFileSync(outputPath, `${JSON.stringify(fallback, null, 2)}\n`);
      console.log(`Preserved ${path.relative(root, outputPath)}`);
      return;
    }
  }

  const filtered = repos
    .filter((repo) => !repo.fork && !repo.archived && !repo.private && repo.size > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const totals = {};
  for (const repo of filtered) {
    let langs = {};
    try {
      langs = await fetchJson(repo.languages_url);
    } catch {
      langs = {};
    }
    for (const [language, bytes] of Object.entries(langs)) {
      totals[language] = (totals[language] || 0) + bytes;
    }
  }

  const generatedBiasLanguages = new Set(["HTML", "CSS", "SCSS", "Less", "Smarty"]);
  const totalBytes = Object.values(totals).reduce((acc, value) => acc + value, 0) || 1;

  const languages = Object.entries(totals)
    .map(([name, bytes]) => ({
      language: name,
      bytes,
      percentage: Number(((bytes / totalBytes) * 100).toFixed(2)),
      generatedContentBias: generatedBiasLanguages.has(name)
    }))
    .sort((a, b) => b.bytes - a.bytes || a.language.localeCompare(b.language))
    .slice(0, 12);

  const payload = {
    disclaimer: "Language statistics reflect the composition of public repositories and do not represent absolute proficiency.",
    sources: {
      includeForks: false,
      includeArchived: false,
      includePrivate: false
    },
    repositoryCount: filtered.length,
    languages,
    syncStatus: {
      success: true,
      reason: "Live language composition refreshed from public repositories"
    }
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, outputPath)}`);
})();
