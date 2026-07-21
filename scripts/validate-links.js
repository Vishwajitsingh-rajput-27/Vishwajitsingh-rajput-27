import fs from 'node:fs';
import path from 'node:path';
import { ROOT, fetchPublicUrl, isSafePublicHttpUrl, isValidHttpUrl, readJson, readText, unique } from './lib.js';

const errors = [];
const warnings = [];
const profile = readJson('config/profile.json');
const repositories = readJson('data/repositories.json');
const readme = readText('README.md');

for (const match of readme.matchAll(/(?:src|srcset)="(\.\/[^" ]+)"/g)) {
  const relative = match[1].replace(/^\.\//, '');
  if (!fs.existsSync(path.join(ROOT, relative))) errors.push(`Missing internal asset referenced by README: ${match[1]}`);
}
for (const match of readme.matchAll(/!\[[^\]]*\]\((\.\/[^)]+)\)/g)) {
  const relative = match[1].replace(/^\.\//, '');
  if (!fs.existsSync(path.join(ROOT, relative))) errors.push(`Missing internal Markdown asset: ${match[1]}`);
}

const configuredLinks = Object.entries(profile.publicLinks ?? {})
  .filter(([, value]) => value)
  .map(([key, value]) => ({ label: `profile.${key}`, url: key === 'email' && !String(value).startsWith('mailto:') ? `mailto:${value}` : value }));
const repositoryLinks = (repositories.repositories ?? []).flatMap((repo) => [
  { label: repo.name, url: repo.url },
  ...(repo.homepageVerified && repo.homepage ? [{ label: `${repo.name} homepage`, url: repo.homepage }] : [])
]);
const snakeLinks = [...readme.matchAll(/https:\/\/raw\.githubusercontent\.com\/[^" )]+github-contribution-grid-snake(?:-dark)?\.svg/g)]
  .map((match, index) => ({ label: `snake asset ${index + 1}`, url: match[0] }));
const links = unique([...configuredLinks, ...repositoryLinks, ...snakeLinks].map((item) => `${item.label}\u0000${item.url}`)).map((item) => {
  const [label, url] = item.split('\u0000');
  return { label, url };
});

await Promise.all(links.map(async (item) => {
  if (item.url.startsWith('mailto:')) {
    if (!isValidHttpUrl(item.url)) errors.push(`Invalid mail link for ${item.label}.`);
    return;
  }
  if (!isSafePublicHttpUrl(item.url)) {
    errors.push(`Invalid or unsafe public URL for ${item.label}.`);
    return;
  }
  if (process.env.SKIP_NETWORK_LINK_CHECKS === '1') return;
  try {
    let response = await fetchPublicUrl(item.url, {
      method: 'HEAD',
      dnsTimeoutMs: 3000,
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'github-profile-link-validator' }
    });
    if (response.status === 405) {
      response = await fetchPublicUrl(item.url, {
        method: 'GET',
        dnsTimeoutMs: 3000,
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'github-profile-link-validator', Range: 'bytes=0-64' }
      });
    }
    if (response.status === 404 || response.status === 410) errors.push(`Broken verified link for ${item.label} (${response.status}).`);
    else if (!response.ok && response.status !== 429) warnings.push(`Could not fully verify ${item.label} (${response.status}).`);
  } catch (error) {
    warnings.push(`Temporary network failure while checking ${item.label}: ${error.message}`);
  }
}));

for (const warning of warnings) console.warn(`Warning: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Validated ${links.length} configured, repository, and snake links plus all local README asset paths.`);
