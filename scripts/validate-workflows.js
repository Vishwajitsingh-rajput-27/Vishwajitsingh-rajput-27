import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { ROOT, readText } from './lib.js';

const workflowDir = path.join(ROOT, '.github/workflows');
const files = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name)).sort();
const errors = [];
const groups = new Map();
const actionPattern = /^\s*uses:\s*([^\s#]+)(?:\s+#\s*(.+))?\s*$/gm;
const allowedWriteJobs = new Map([
  ['auto-update-profile.yml:refresh', new Set(['contents'])],
  ['auto-update-profile.yml:open-pull-request', new Set(['pull-requests'])],
  ['snake.yml:publish', new Set(['contents'])],
  ['metrics.yml:metrics', new Set(['contents'])],
  ['contribution-3d.yml:publish', new Set(['contents'])]
]);

function permissionEntries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value);
}

for (const file of files) {
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8');
  let document;
  try {
    document = YAML.parse(text);
  } catch (error) {
    errors.push(`${file}: YAML parse failure (${error.message})`);
    continue;
  }

  if (!document.permissions) errors.push(`${file}: explicit workflow permissions are required.`);
  if (/pull_request_target\s*:/i.test(text)) errors.push(`${file}: pull_request_target is forbidden.`);
  if (/git\s+push[^\n]*(--force|-f\b)/i.test(text)) errors.push(`${file}: force-push behavior is forbidden.`);
  if (/\bset\s+-x\b|echo[^\n]*(?:github\.token|GITHUB_TOKEN|GH_TOKEN|secrets\.)/i.test(text)) errors.push(`${file}: token or secret material could be printed.`);
  if (/secrets\.(?!GITHUB_TOKEN\b)[A-Z0-9_]+/g.test(text)) errors.push(`${file}: unexpected custom secret reference detected.`);
  if (/permissions:\s*(write-all|read-all)/i.test(text)) errors.push(`${file}: broad permissions shortcuts are forbidden.`);

  const scheduleMatches = [...text.matchAll(/-\s+cron:\s*["']([^"']+)["']/g)].map((match) => match[1]);
  if (scheduleMatches.length > 1) errors.push(`${file}: more than one scheduled execution is configured.`);
  for (const cron of scheduleMatches) {
    const fields = cron.trim().split(/\s+/);
    if (fields.length !== 5) errors.push(`${file}: invalid cron expression ${cron}.`);
    else if (fields[1] === '*' || fields[1].includes('/') || fields[0].includes('/')) errors.push(`${file}: scheduled workflows must not run more than once daily.`);
  }

  const group = document.concurrency?.group;
  if (!group) errors.push(`${file}: explicit concurrency protection is required.`);
  else if (groups.has(String(group))) errors.push(`${file}: concurrency group duplicates ${groups.get(String(group))}.`);
  else groups.set(String(group), file);

  for (const [jobName, job] of Object.entries(document.jobs ?? {})) {
    if (!job['timeout-minutes']) errors.push(`${file}:${jobName}: timeout-minutes is required.`);
    const effective = job.permissions ?? document.permissions;
    for (const [scope, level] of permissionEntries(effective)) {
      if (level !== 'write') continue;
      const allowed = allowedWriteJobs.get(`${file}:${jobName}`);
      if (!allowed?.has(scope)) errors.push(`${file}:${jobName}: unexpected ${scope}: write permission.`);
    }
    const allowed = allowedWriteJobs.get(`${file}:${jobName}`);
    if (allowed) {
      for (const scope of allowed) if (effective?.[scope] !== 'write') errors.push(`${file}:${jobName}: required scoped ${scope}: write permission is missing.`);
    }
  }

  for (const match of text.matchAll(actionPattern)) {
    const reference = match[1];
    if (reference.startsWith('./')) continue;
    const at = reference.lastIndexOf('@');
    if (at < 1) {
      errors.push(`${file}: action reference has no version: ${reference}.`);
      continue;
    }
    const revision = reference.slice(at + 1);
    if (!/^[0-9a-f]{40}$/i.test(revision)) errors.push(`${file}: action must be pinned to a full 40-character commit SHA: ${reference}.`);
    if (!match[2] || !/^v?\d+(?:\.\d+){0,2}\b/.test(match[2].trim())) errors.push(`${file}: pinned action ${reference.slice(0, at)} needs a human-readable release comment.`);
  }
}

function requireText(file, patterns) {
  const text = readText(`.github/workflows/${file}`);
  for (const [pattern, message] of patterns) if (!pattern.test(text)) errors.push(`${file}: ${message}`);
}

requireText('snake.yml', [
  [/github_user_name:\s*Vishwajitsingh-rajput-27/, 'exact username is missing.'],
  [/Platane\/snk@d8f6715049803e982ee5ff501b6b9b7d5deeb09b\s+# v3\.5\.0/, 'verified immutable Platane/snk v3.5.0 pin is missing.'],
  [/github_token:\s*\$\{\{\s*github\.token\s*\}\}/, 'built-in GitHub token is not passed to the snake action.'],
  [/github-contribution-grid-snake\.svg/, 'light SVG output is missing.'],
  [/github-contribution-grid-snake-dark\.svg/, 'dark SVG output is missing.'],
  [/github-contribution-grid-snake\.gif/, 'supported GIF output is missing.'],
  [/publish:[\s\S]*permissions:[\s\S]*contents:\s*write/, 'output publishing must be isolated in the publish job.'],
  [/generate:[\s\S]*permissions:[\s\S]*contents:\s*read/, 'snake generation must remain read-only.'],
  [/git(?:\s+-C\s+publish)?\s+push\s+origin\s+output/, 'output branch publishing is missing.'],
  [/workflow_dispatch:/, 'manual dispatch is missing.'],
  [/schedule:[\s\S]*cron:/, 'daily schedule is missing.'],
  [/push:[\s\S]*branches:[\s\S]*main/, 'initial main publication trigger is missing.']
]);

requireText('auto-update-profile.yml', [
  [/schedule:[\s\S]*cron:/, 'daily schedule is missing.'],
  [/workflow_dispatch:/, 'manual dispatch is missing.'],
  [/paths:[\s\S]*"config\/\*\*"[\s\S]*"templates\/\*\*"[\s\S]*"scripts\/\*\*"/, 'config, template, and script triggers are incomplete.'],
  [/chore\(profile\): refresh public GitHub data/, 'required automatic commit message is missing.'],
  [/npm run fetch-profile/, 'profile fetch step is missing.'],
  [/npm run discover/, 'repository discovery step is missing.'],
  [/npm run languages/, 'language summary step is missing.'],
  [/npm run detect-changes/, 'change detection step is missing.'],
  [/npm run validate\n[\s\S]*npm run check-links\n[\s\S]*npm run validate-workflows\n[\s\S]*npm run validate-svg\n[\s\S]*npm run scan-secrets\n[\s\S]*npm run build/, 'pre-commit validation command order is incomplete.'],
  [/git diff --quiet/, 'empty commit prevention is missing.'],
  [/git pull --rebase origin main/, 'safe history-preserving synchronization is missing.'],
  [/startsWith\(github\.event\.head_commit\.message, 'chore\(profile\): refresh public GitHub data'\)/, 'automatic commit loop prevention is missing.'],
  [/GITHUB_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/, 'built-in GitHub token is not configured.']
]);

requireText('contribution-3d.yml', [
  [/yoshi389111\/github-profile-3d-contrib@7d95e7d4cdc028dd1e1cbd957d65f35efb12ae39\s+# v0\.9\.3/, 'immutable 3D action v0.9.3 pin is missing.'],
  [/generate:[\s\S]*permissions:[\s\S]*contents:\s*read/, 'third-party 3D generation must be read-only.'],
  [/publish:[\s\S]*permissions:[\s\S]*contents:\s*write/, '3D publishing must be isolated in a write job.'],
  [/prepare-external-svg\.js/, 'external SVG safety and accessibility preparation is missing.'],
  [/contribution-3d-light\.svg/, 'light asset path is missing.'],
  [/contribution-3d-dark\.svg/, 'dark asset path is missing.']
]);

requireText('metrics.yml', [
  [/permissions:\s*\n\s*contents:\s*read/, 'workflow default must be read-only.'],
  [/metrics:[\s\S]*permissions:[\s\S]*contents:\s*write/, 'metrics write permission must be scoped to its job.']
]);

requireText('validate-profile.yml', [
  [/permissions:[\s\S]*contents:\s*read/, 'read-only permission is required.'],
  [/persist-credentials:\s*false/, 'validation checkout must not persist credentials.'],
  [/pull_request:/, 'pull request trigger is missing.'],
  [/workflow_dispatch:/, 'manual dispatch is missing.'],
  [/npm run scan-secrets/, 'secret scanning is missing.']
]);

requireText('dependency-review.yml', [
  [/actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294\s+# v5\.0\.0/, 'immutable dependency review v5.0.0 pin is missing.'],
  [/pull-requests:\s*read/, 'pull-requests: read permission is required.'],
  [/persist-credentials:\s*false/, 'dependency review checkout must not persist credentials.']
]);

const readme = readText('README.md');
const snakeWorkflow = readText('.github/workflows/snake.yml');
for (const filename of ['github-contribution-grid-snake.svg', 'github-contribution-grid-snake-dark.svg']) {
  if (!readme.includes(filename) || !snakeWorkflow.includes(filename)) errors.push(`README and snake workflow do not agree on ${filename}.`);
}
for (const filename of ['contribution-3d-light.svg', 'contribution-3d-dark.svg']) {
  if (!readme.includes(filename) || !readText('.github/workflows/contribution-3d.yml').includes(filename)) errors.push(`README and 3D workflow do not agree on ${filename}.`);
}

if (errors.length) {
  console.error(`Workflow validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Validated ${files.length} workflow files for immutable action pins, scoped permissions, schedules, timeouts, output paths, and loop protection.`);
