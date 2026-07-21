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

(async () => {
  const repos = await fetchJson(`https://api.github.com/users/${profile.username}/repos?per_page=100&sort=updated`);
  const filtered = repos.filter((repo) => !repo.fork && !repo.archived && !repo.private && repo.size > 0);

  const totals = {};
  for (const repo of filtered) {
    const langs = await fetchJson(repo.languages_url);
    for (const [language, bytes] of Object.entries(langs)) {
      totals[language] = (totals[language] || 0) + bytes;
    }
  }

  const generatedBiasLanguages = new Set(["HTML", "CSS", "SCSS", "Less", "Smarty"]);
  const totalBytes = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(totals)
    .map(([name, bytes]) => ({
      language: name,
      bytes,
      percentage: Number(((bytes / totalBytes) * 100).toFixed(2)),
      generatedContentBias: generatedBiasLanguages.has(name)
    }))
    .sort((a, b) => b.bytes - a.bytes)
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
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, outputPath)}`);
})();
