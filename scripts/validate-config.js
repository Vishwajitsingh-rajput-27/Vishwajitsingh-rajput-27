import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  isSafePublicHttpUrl,
  isValidHttpUrl,
  normalizeUrl,
  readJson,
  readText
} from './lib.js';

const errors = [];
const warnings = [];
const profile = readJson('config/profile.json');
const skills = readJson('config/skills.json');
const projects = readJson('config/projects.json');
const integrations = readJson('config/integrations.json');
const theme = readJson('config/theme.json');
const repositories = readJson('data/repositories.json', { repositories: [], featured: [] });
const languageSummary = readJson('data/language-summary.json', { languages: [] });
const readme = readText('README.md');

const expected = {
  username: 'Vishwajitsingh-rajput-27',
  fullName: 'Vishwajitsingh Dilipsingh Rajput',
  displayName: 'Vishwajitsingh Rajput',
  headline: 'Computer Engineering Student | Full-Stack Developer | AI & Geospatial Builder',
  tagline: 'Building intelligent systems, practical developer tools, and ambitious AI-powered products.',
  location: 'Pune, Maharashtra, India'
};
for (const [key, value] of Object.entries(expected)) {
  if (profile[key] !== value) errors.push(`config/profile.json ${key} must exactly equal ${JSON.stringify(value)}.`);
}

if (profile.education?.degree !== 'B.Tech in Computer Engineering') errors.push('Configured degree is incorrect.');
if (profile.education?.institution !== 'Indira College of Engineering and Management, Pune') errors.push('Configured institution is incorrect.');
if (profile.education?.affiliation !== 'Savitribai Phule Pune University') errors.push('Configured university affiliation is incorrect.');
if (profile.education?.year !== 'Second-year engineering student') errors.push('Configured academic status is incorrect.');

const requiredAbout = [
  'I am a second-year Computer Engineering student at Indira College of Engineering and Management, affiliated with Savitribai Phule Pune University. My current focus includes full-stack development, applied artificial intelligence, computer vision, automation, and geospatial technology.',
  'I enjoy converting complex ideas into structured and practical products with strong interfaces, reliable workflows, and clear documentation. Alongside project development, I am strengthening my problem-solving skills through Data Structures and Algorithms using Striver’s roadmap.'
];
if (JSON.stringify(profile.about) !== JSON.stringify(requiredAbout)) errors.push('About Me content does not match the approved professional standard.');

const requiredRoles = ['Full-Stack Developer', 'AI & Geospatial Builder', 'Computer Engineering Student'];
if (JSON.stringify(profile.animatedRoles) !== JSON.stringify(requiredRoles)) errors.push('Animated roles must contain exactly the three approved phrases in the approved order.');

for (const [name, value] of Object.entries(profile.publicLinks ?? {})) {
  if (!value) continue;
  const candidate = name === 'email' && !value.startsWith('mailto:') ? `mailto:${value}` : value;
  const valid = name === 'email' ? isValidHttpUrl(candidate) : isSafePublicHttpUrl(candidate);
  if (!valid) errors.push(`Invalid or unsafe public link in profile.publicLinks.${name}.`);
}
if (profile.publicLinks?.email && !profile.publicLinks.email.startsWith('mailto:')) warnings.push('A public email is configured without a mailto: prefix; the generator will normalize it.');

const approvedNames = skills.approvedSkills.map((item) => item.name.toLowerCase());
if (new Set(approvedNames).size !== approvedNames.length) errors.push('Duplicate approved skills detected.');
for (const item of skills.suggestedSkills) {
  if (item.visible) errors.push(`Suggested skill ${item.name} must not be visible.`);
  if (readme.includes(`\`${item.name}\``)) errors.push(`Suggested skill ${item.name} appears publicly without approval.`);
}
for (const item of skills.approvedSkills.filter((entry) => entry.visible)) {
  if (item.verificationStatus !== 'approved') errors.push(`Visible skill ${item.name} is not approved.`);
  if (!readme.includes(`\`${item.name}\``)) errors.push(`Approved visible skill ${item.name} is missing from README.md.`);
}

if (projects.autoDiscovery !== true) errors.push('Project autoDiscovery must remain enabled.');
if (!Number.isInteger(projects.maximumFeaturedProjects) || projects.maximumFeaturedProjects < 1 || projects.maximumFeaturedProjects > 4) errors.push('maximumFeaturedProjects must be between 1 and 4.');
for (const manual of projects.manualProjects ?? []) {
  if (manual.visible && (!manual.name || !manual.description || !manual.status)) errors.push(`Visible manual project ${manual.name || '(unnamed)'} is incomplete.`);
}

if (!['direct-commit', 'pull-request'].includes(integrations.automaticUpdates?.mode)) errors.push('automaticUpdates.mode must be direct-commit or pull-request.');
if (integrations.snake?.enabled !== true) errors.push('Snake integration is mandatory and must remain enabled.');
for (const color of Object.values(theme.colors ?? {})) if (!/^#[0-9A-F]{6}$/i.test(color)) errors.push(`Invalid theme color ${color}.`);

const requiredAssets = [
  'assets/banner.svg',
  'assets/role-line.svg',
  'assets/terminal-card.svg',
  'assets/neon-divider.svg',
  'assets/footer.svg',
  'assets/generated/metrics.svg',
  'assets/generated/contribution-3d-light.svg',
  'assets/generated/contribution-3d-dark.svg'
];
for (const file of requiredAssets) if (!fs.existsSync(path.join(ROOT, file))) errors.push(`Missing required asset: ${file}.`);

const markers = [
  '<!-- AUTO-GENERATED:START -->',
  '<!-- AUTO-GENERATED:END -->',
  '<!-- MANUAL-CONTENT:START -->',
  '<!-- MANUAL-CONTENT:END -->'
];
for (const marker of markers) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if ((readme.match(new RegExp(escaped, 'g')) ?? []).length !== 1) errors.push(`README must contain exactly one ${marker}.`);
}
if (/<!-- (?:GENERATED:[A-Z_]+|MANUAL):(?:START|END) -->/.test(readme)) errors.push('Legacy generated/manual markers must not remain in README.md.');

const autoStart = readme.indexOf(markers[0]);
const autoEnd = readme.indexOf(markers[1]);
const manualStart = readme.indexOf(markers[2]);
const manualEnd = readme.indexOf(markers[3]);
if (!(autoStart < manualStart && manualStart < manualEnd && manualEnd < autoEnd)) errors.push('The protected manual block must be nested inside the automatic block in the correct order.');
if (/\{\{[^}]+\}\}/.test(readme)) errors.push('Visible unresolved template placeholders detected in README.md.');

const requiredHeadings = [
  '## About Me',
  '## What I’m Focused On',
  '## Current Projects',
  '## Technologies I Use and Explore',
  '## Featured Repositories',
  '## Learning Focus',
  '## GitHub Overview',
  '## Contribution Activity',
  '## Collaboration'
];
for (const heading of requiredHeadings) if (!readme.includes(heading)) errors.push(`Required heading is missing: ${heading}`);
if (readme.includes('## Featured Public Repositories')) errors.push('Use the approved heading “Featured Repositories”.');

for (const phrase of Object.values(expected)) if (!readme.includes(phrase) && !['fullName'].includes(Object.keys(expected).find((key) => expected[key] === phrase))) warnings.push(`Configured identity phrase is not visible in README.md: ${phrase}`);
for (const paragraph of requiredAbout) if (!readme.includes(paragraph)) errors.push('Approved About Me paragraph is missing from README.md.');

const bannedClaims = [
  'coding ninja', 'ai wizard', 'master developer', 'world-class programmer', 'future billionaire',
  'expert in everything', 'revolutionary product', 'best developer', 'legendary coder', 'industry-leading engineer',
  'award-winning', 'world-class developer', 'senior software engineer'
];
const loweredReadme = readme.toLowerCase();
for (const phrase of bannedClaims) if (loweredReadme.includes(phrase)) errors.push(`Unsupported or unprofessional claim appears publicly: ${phrase}`);


if (!profile.publicLinks?.email && /mailto:|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(readme)) errors.push('README exposes an email address even though no public email is configured.');
if (/github-readme-stats|streak-stats|github-profile-trophy|quotes-github-readme|komarev/i.test(readme)) errors.push('README contains an unapproved or redundant third-party statistics widget.');
if ((readme.match(/shields\.io/gi) ?? []).length > 2) errors.push('README contains an excessive badge wall.');

const visibleReadme = readme.replace(/<!--[\s\S]*?-->/g, '');
if (/\b(TODO|TBD|YOUR_USERNAME|YOUR_NAME|INSERT_|PLACEHOLDER)\b/i.test(visibleReadme)) errors.push('Visible placeholder text detected in README.md.');
if (/<\s*(script|iframe|object|embed|form|input|button|video|audio)\b/i.test(readme)) errors.push('Unsafe raw HTML element detected in README.md.');

for (const match of readme.matchAll(/<img\b[^>]*>/gi)) {
  if (!/\balt="[^"]+"/i.test(match[0])) errors.push(`Missing alt text: ${match[0].slice(0, 120)}.`);
}
for (const match of readme.matchAll(/!\[([^\]]*)\]\([^)]+\)/g)) {
  if (!match[1].trim()) errors.push(`Markdown image is missing alt text: ${match[0].slice(0, 120)}.`);
}

const featured = new Set(repositories.featured ?? []);
if (featured.size > projects.maximumFeaturedProjects) errors.push('Too many featured repositories are selected.');
for (const name of featured) {
  const repo = repositories.repositories.find((item) => item.name === name);
  if (!repo) errors.push(`Featured repository ${name} is absent from repository data.`);
  else if (repo.private === true || repo.archived || repo.fork || repo.size <= 0 || !repo.description) errors.push(`Featured repository ${name} is not eligible.`);
  else {
    const expectedUrl = `https://github.com/${profile.username}/${repo.name}`;
    if (normalizeUrl(repo.url) !== normalizeUrl(expectedUrl)) errors.push(`Featured repository ${name} has an incorrect repository URL.`);
    if (repo.fullName && repo.fullName !== `${profile.username}/${repo.name}`) errors.push(`Featured repository ${name} has an incorrect fullName.`);
    if (!Array.isArray(repo.languages) || !repo.languages.length) errors.push(`Featured repository ${name} has no verified language metadata.`);
    if (!Number.isInteger(repo.stars) || repo.stars < 0 || !Number.isInteger(repo.forks) || repo.forks < 0) errors.push(`Featured repository ${name} has invalid stars or forks metadata.`);
    if (repo.updatedAt && !Number.isFinite(Date.parse(repo.updatedAt))) errors.push(`Featured repository ${name} has an invalid updated date.`);
    if (!readme.includes(repo.url)) errors.push(`Featured repository ${name} URL is missing from README.md.`);
    if (repo.homepageVerified && repo.homepage && !isSafePublicHttpUrl(repo.homepage)) errors.push(`Featured repository ${name} has an unsafe verified homepage.`);
    if (repo.homepage && !repo.homepageVerified && readme.includes(normalizeUrl(repo.homepage))) errors.push(`Unverified homepage for ${name} appears publicly.`);
  }
}

const exactSnakeDescription = 'A visual representation of my GitHub contribution activity, generated automatically through GitHub Actions.';
if (!readme.includes(exactSnakeDescription)) errors.push('Required contribution activity description is missing.');
const lightSnakeUrl = `https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake.svg`;
const darkSnakeUrl = `https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake-dark.svg`;
if (!readme.includes(lightSnakeUrl) || !readme.includes(darkSnakeUrl)) errors.push('README snake URLs do not match required output paths.');
if (!readme.includes('./assets/generated/contribution-3d-dark.svg') || !readme.includes('./assets/generated/contribution-3d-light.svg')) errors.push('README 3D contribution paths are incomplete.');

const snakePicture = /<picture>[\s\S]*?github-contribution-grid-snake-dark\.svg[\s\S]*?github-contribution-grid-snake\.svg[\s\S]*?<img[^>]+width="100%"[^>]+alt="[^"]+"[^>]*>[\s\S]*?<\/picture>/i;
if (!snakePicture.test(readme)) errors.push('Contribution Activity must use a responsive, theme-aware picture element with alt text.');
const contribution3dPicture = /<picture>[\s\S]*?contribution-3d-dark\.svg[\s\S]*?contribution-3d-light\.svg[\s\S]*?<img[^>]+width="100%"[^>]+alt="[^"]+"[^>]*>[\s\S]*?<\/picture>/i;
if (!contribution3dPicture.test(readme)) errors.push('3D contribution calendar must use a responsive, theme-aware picture element with alt text.');


if (languageSummary.disclaimer !== 'Language statistics reflect the composition of public repositories and do not represent absolute proficiency.') errors.push('Language disclaimer is missing or modified.');
if (!readme.includes(languageSummary.disclaimer)) errors.push('Language disclaimer is not visible in README.md.');

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
for (const warning of warnings) console.warn(`Warning: ${warning}`);
console.log('Configuration, identity, professional claims, README markers, assets, project links, skills, and contribution paths are valid.');
