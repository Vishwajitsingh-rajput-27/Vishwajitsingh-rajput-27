import { readJson, writeJson } from './lib.js';

const repositories = readJson('data/repositories.json', { repositories: [] });
const previous = readJson('data/language-summary.json', {});
const excluded = new Set(['Jupyter Notebook']);
const displayWeight = { HTML: 0.45, CSS: 0.55 };
const totals = new Map();
let totalBytes = 0;

for (const repo of repositories.repositories ?? []) {
  if (repo.fork || repo.archived) continue;
  for (const [language, bytes] of Object.entries(repo.languageBytes ?? {})) {
    if (excluded.has(language) || !Number.isFinite(bytes) || bytes <= 0) continue;
    totals.set(language, (totals.get(language) ?? 0) + bytes);
    totalBytes += bytes;
  }
}

let method = 'github-linguist-bytes';
if (totalBytes === 0) {
  const occurrenceTotals = new Map();
  let occurrences = 0;
  for (const repo of repositories.repositories ?? []) {
    if (repo.fork || repo.archived) continue;
    for (const language of repo.languages ?? []) {
      if (excluded.has(language)) continue;
      occurrenceTotals.set(language, (occurrenceTotals.get(language) ?? 0) + 1);
      occurrences += 1;
    }
  }

  if (occurrences > 0) {
    method = 'verified-repository-language-occurrence-fallback';
    for (const [language, count] of occurrenceTotals) totals.set(language, count);
    totalBytes = occurrences;
  } else if (Array.isArray(previous.languages) && previous.languages.length) {
    writeJson('data/language-summary.json', {
      ...previous,
      stale: true,
      lastAttempt: new Date().toISOString()
    });
    console.warn('No fresh language data was available; retained the last valid language summary.');
    process.exit(0);
  }
}

const weightedTotal = [...totals.entries()].reduce((sum, [language, value]) => sum + value * (displayWeight[language] ?? 1), 0);
const languages = [...totals.entries()]
  .map(([name, value]) => ({
    name,
    bytes: method === 'github-linguist-bytes' ? value : null,
    repositoryOccurrences: method === 'github-linguist-bytes' ? null : value,
    rawPercentage: Number(((value / totalBytes) * 100).toFixed(2)),
    displayPercentage: Number((((value * (displayWeight[name] ?? 1)) / weightedTotal) * 100).toFixed(2)),
    displayAdjusted: Boolean(displayWeight[name])
  }))
  .sort((a, b) => b.displayPercentage - a.displayPercentage || a.name.localeCompare(b.name));

writeJson('data/language-summary.json', {
  generatedAt: new Date().toISOString(),
  source: method === 'github-linguist-bytes'
    ? 'GitHub Linguist language composition for public, non-fork, non-archived repositories'
    : 'Verified language lists from public, non-fork, non-archived repositories; used only when byte totals are temporarily unavailable',
  method,
  stale: Boolean(repositories.stale),
  totalBytes: method === 'github-linguist-bytes' ? totalBytes : null,
  totalRepositoryLanguageOccurrences: method === 'github-linguist-bytes' ? null : totalBytes,
  languages,
  excludedLanguages: [...excluded],
  displayAdjustments: displayWeight,
  disclaimer: 'Language statistics reflect the composition of public repositories and do not represent absolute proficiency.'
});
console.log(`Calculated a language summary across ${languages.length} languages using ${method}.`);
