import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readJson, readText, writeJson, writeText } from './lib.js';

const files = ['data/github-profile.json', 'data/repositories.json', 'data/language-summary.json'];
const backups = new Map(files.map((file) => [file, readJson(file)]));
const readmeBackup = readText('README.md');
const baselineRepositories = backups.get('data/repositories.json');
const baselineFeatured = [...(baselineRepositories.featured ?? [])];
const baselineCount = (baselineRepositories.repositories ?? []).length;

function run(script, extraEnv = {}) {
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_API_BASE_URL: 'http://127.0.0.1:9',
      PROFILE_FETCH_TIMEOUT_MS: '150',
      PROFILE_FETCH_RETRIES: '0',
      PROFILE_DISABLE_GH_CLI: '1',
      ...extraEnv
    }
  });
  assert.equal(result.status, 0, `${script} failed unexpectedly: ${result.stderr || result.stdout}`);
}

try {
  assert.ok(baselineCount > 0 && baselineFeatured.length > 0, 'Failure resilience test requires a valid cached repository baseline.');
  run('scripts/fetch-github-profile.js');
  run('scripts/discover-projects.js');
  run('scripts/calculate-language-summary.js');
  run('scripts/generate-readme.js', { GITHUB_API_BASE_URL: process.env.GITHUB_API_BASE_URL || 'https://api.github.com' });

  const afterRepositories = readJson('data/repositories.json');
  assert.equal((afterRepositories.repositories ?? []).length, baselineCount, 'Repository cache was erased after API failure.');
  assert.deepEqual(afterRepositories.featured, baselineFeatured, 'Featured repositories changed after API failure.');
  const readme = readText('README.md');
  assert.ok(!/fetch failed|HTTP \d{3}|ECONNREFUSED|rate limit/i.test(readme), 'Internal API failure text leaked into README.md.');
  for (const name of baselineFeatured) assert.ok(readme.includes(name), `Featured repository ${name} disappeared after API failure.`);
  console.log('Temporary API failure preserved cached data, featured repositories, and public README content.');
} finally {
  for (const [file, value] of backups) writeJson(file, value);
  writeText('README.md', readmeBackup);
}
