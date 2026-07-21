import { isSafePublicHttpUrl, isValidHttpUrl, normalizeUrl, readJson, readText, writeText } from './lib.js';

const profile = readJson('config/profile.json');
const skills = readJson('config/skills.json');
const projectsConfig = readJson('config/projects.json');
const githubProfile = readJson('data/github-profile.json');
const repositoryData = readJson('data/repositories.json');
const languageData = readJson('data/language-summary.json');
const status = readJson('data/update-status.json');
const template = readText('templates/README.template.md');
const existing = readText('README.md');
const username = profile.username;

const AUTO_START = '<!-- AUTO-GENERATED:START -->';
const AUTO_END = '<!-- AUTO-GENERATED:END -->';
const MANUAL_START = '<!-- MANUAL-CONTENT:START -->';
const MANUAL_END = '<!-- MANUAL-CONTENT:END -->';

const providerToKey = {
  linkedin: 'linkedin',
  twitter: 'twitter',
  x: 'twitter',
  'dev.to': 'devto',
  devto: 'devto',
  medium: 'medium',
  stackoverflow: 'stackoverflow',
  hashnode: 'hashnode'
};

const links = { ...profile.publicLinks };
for (const account of githubProfile.socialAccounts ?? []) {
  const key = providerToKey[String(account.provider).toLowerCase()];
  if (key && !links[key] && isSafePublicHttpUrl(account.url)) links[key] = normalizeUrl(account.url);
}
if (!links.portfolio && isSafePublicHttpUrl(githubProfile.publicWebsite)) links.portfolio = normalizeUrl(githubProfile.publicWebsite);

const linkLabels = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',
  resume: 'Resume',
  email: 'Email',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  devto: 'Dev.to',
  hashnode: 'Hashnode',
  medium: 'Medium',
  stackoverflow: 'Stack Overflow',
  twitter: 'X / Twitter'
};

function socialMarkdown() {
  return Object.entries(links)
    .filter(([key, value]) => {
      if (!value) return false;
      if (key === 'email') return isValidHttpUrl(value.startsWith('mailto:') ? value : `mailto:${value}`);
      return isSafePublicHttpUrl(value);
    })
    .map(([key, value]) => {
      const href = key === 'email' && !value.startsWith('mailto:') ? `mailto:${value}` : normalizeUrl(value);
      return `[${linkLabels[key] ?? key}](${href})`;
    })
    .join(' · ');
}

function list(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function repositoryByName(name) {
  return (repositoryData.repositories ?? []).find((repo) => repo.name.toLowerCase() === name.toLowerCase());
}

function verifiedLinks(repo, label = 'Repository') {
  if (!repo?.url) return '';
  const parts = [`[${label}](${repo.url})`];
  if (repo.homepageVerified && repo.homepage) parts.push(`[Live demo](${repo.homepage})`);
  return parts.join(' · ');
}

function projectSection() {
  const entries = [
    {
      name: 'NoteNexus AI',
      status: 'In Development',
      repo: repositoryByName('notenexus'),
      problem: 'Academic materials are fragmented across notes, PDFs, assignments, videos, and messaging platforms.',
      solution: 'A unified study platform that organizes learning content and generates summaries, quizzes, flashcards, grounded question answering, and revision plans.',
      technology: 'Full-stack web development · Applied AI · Document processing · Education technology'
    },
    {
      name: 'ResumeAI',
      status: 'In Development',
      repo: repositoryByName('Resume_Forge'),
      linkLabel: 'Related public implementation',
      problem: 'Students and early-career applicants often struggle to evaluate resume quality, identify missing skills, and prepare targeted applications.',
      solution: 'An AI-assisted career platform for resume analysis, ATS-aware improvement, skill-gap guidance, and interview preparation.',
      technology: 'Next.js · Node.js · MongoDB · Applied generative AI'
    },
    {
      name: 'Generative AI Cloud Removal',
      status: 'Research Project / In Development',
      repo: repositoryByName('clearSKY_AI'),
      problem: 'Clouds and shadows obscure useful information in optical satellite imagery and limit downstream analysis.',
      solution: 'A multimodal reconstruction workflow combining optical imagery, SAR data, elevation data, and temporal references while clearly separating prototypes from validated research results.',
      technology: 'Python · Computer vision · Multimodal AI · Geospatial processing'
    }
  ];

  return entries.map((entry) => {
    const projectLinks = verifiedLinks(entry.repo, entry.linkLabel || 'Repository');
    return [
      `### ${entry.name}`,
      `**Status:** ${entry.status}`,
      `**Problem:** ${entry.problem}`,
      `**Proposed solution:** ${entry.solution}`,
      `**Technology areas:** ${entry.technology}`,
      projectLinks ? `**Verified links:** ${projectLinks}` : ''
    ].filter(Boolean).join('\n\n');
  }).join('\n\n---\n\n');
}

function skillSection() {
  const primary = skills.approvedSkills
    .filter((item) => item.visible && item.verificationStatus === 'approved')
    .sort((a, b) => a.priority - b.priority)
    .map((item) => `\`${item.name}\``)
    .join(' · ');

  const grouped = new Map();
  for (const item of skills.approvedSkills
    .filter((item) => !item.visible && item.verificationStatus === 'approved')
    .sort((a, b) => a.priority - b.priority)) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category).push(item.name);
  }
  const detailLines = skills.displayPriority
    .filter((category) => grouped.has(category))
    .map((category) => `**${skills.categories[category]}:** ${grouped.get(category).join(' · ')}`)
    .join('\n\n');

  return `${primary}\n\n> These are active project and learning areas. This profile does not claim advanced expertise in every listed technology.\n\n<details>\n<summary><strong>Additional technologies used or explored</strong></summary>\n\n${detailLines}\n\n</details>`;
}

function featuredSection() {
  const selected = (repositoryData.featured ?? [])
    .map(repositoryByName)
    .filter((repo) => repo && !repo.archived && !repo.fork && repo.size > 0 && repo.description)
    .slice(0, projectsConfig.maximumFeaturedProjects);

  if (selected.length < 2) {
    return 'Public work is currently presented in the Current Projects section while additional repositories are developed and documented.';
  }

  return selected.map((repo) => {
    const metadata = [];
    metadata.push(`- **Languages:** ${repo.languages?.length ? repo.languages.slice(0, 4).join(' · ') : 'Not reported by GitHub'}`);
    if (repo.updatedAt && Number.isFinite(Date.parse(repo.updatedAt))) metadata.push(`- **Last updated:** ${new Date(repo.updatedAt).toISOString().slice(0, 10)}`);
    metadata.push(`- **Links:** ${verifiedLinks(repo)}`);
    return `### [${repo.name}](${repo.url})\n\n${repo.description}\n\n${metadata.join('\n')}`;
  }).join('\n\n---\n\n');
}

function languageSummary() {
  const top = (languageData.languages ?? []).slice(0, 6);
  if (!top.length) return '_Language composition will appear after the next successful verified repository refresh._';
  const rows = top.map((item) => {
    const note = item.displayAdjusted
      ? 'Display-adjusted to reduce generated markup dominance'
      : languageData.method === 'verified-repository-language-occurrence-fallback'
        ? 'Repository occurrence fallback'
        : 'GitHub Linguist composition';
    return `| ${item.name} | ${Number(item.displayPercentage).toFixed(2)}% | ${note} |`;
  }).join('\n');
  return `| Language | Public repository composition | Method |\n|---|---:|---|\n${rows}\n\n> ${languageData.disclaimer}`;
}

function manualContent(text) {
  const newMatch = text.match(/<!-- MANUAL-CONTENT:START -->([\s\S]*?)<!-- MANUAL-CONTENT:END -->/);
  if (newMatch) return newMatch[1];
  const legacyMatch = text.match(/<!-- MANUAL:START -->([\s\S]*?)<!-- MANUAL:END -->/);
  if (legacyMatch) return legacyMatch[1];
  return '\n<!-- Add manually maintained content here. This block is preserved exactly by the generator. -->\n';
}

function buildGeneratedBody(protectedContent) {
  const sections = [
    `<div align="center">\n\n![${profile.displayName} — Computer Engineering Student, Full-Stack Developer, AI and Geospatial Builder](./assets/banner.svg)\n\n![Animated roles: Full-Stack Developer, AI and Geospatial Builder, Computer Engineering Student](./assets/role-line.svg)\n\n<sub>Static fallback: Full-Stack Developer · AI & Geospatial Builder · Computer Engineering Student</sub>\n\n<strong>${profile.headline}</strong>\n\n${profile.tagline}\n\n${profile.location}\n\n${socialMarkdown()}\n\n</div>`,
    `## About Me\n\n${profile.about.join('\n\n')}\n\n![Professional terminal identity card for ${profile.displayName}](./assets/terminal-card.svg)`,
    `## What I’m Focused On\n\n${list([
      'Building practical full-stack applications',
      'Exploring applied AI and computer vision',
      'Developing research-oriented geospatial projects',
      'Improving Data Structures and Algorithms',
      'Participating in hackathons and open-source development'
    ])}`,
    `## Current Projects\n\n${projectSection()}`,
    `## Technologies I Use and Explore\n\n${skillSection()}`,
    `## Featured Repositories\n\n${featuredSection()}`,
    `## Learning Focus\n\n${list(profile.learningFocus)}`,
    `## GitHub Overview\n\n<div align="center">\n\n![Public GitHub overview generated from verified repository data](./assets/generated/metrics.svg)\n\n</div>\n\nThe overview above is generated inside this repository from verified public metadata, so this section remains useful without third-party statistics services.\n\n### Public Repository Language Summary\n\n${languageSummary()}`,
    `## Contribution Activity\n\nA visual representation of my GitHub contribution activity, generated automatically through GitHub Actions.\n\n<div align="center">\n\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake-dark.svg" />\n  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg" />\n  <img width="100%" alt="Animated GitHub contribution graph for ${profile.displayName}" src="https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg" />\n</picture>\n\n</div>`,
    `## 3D Contribution Calendar\n\n<div align="center">\n\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/contribution-3d-dark.svg" />\n  <source media="(prefers-color-scheme: light)" srcset="./assets/generated/contribution-3d-light.svg" />\n  <img width="100%" alt="Three-dimensional GitHub contribution calendar for ${profile.displayName}" src="./assets/generated/contribution-3d-light.svg" />\n</picture>\n\n</div>`,
    `## Collaboration\n\nI am open to collaboration on open-source projects, hackathons, full-stack applications, AI-powered tools, education technology, computer vision, geospatial AI, and research-oriented student projects.\n\n**Ask me about:** ${profile.askMeAbout.join(' · ')}\n\n**Development goal:** ${profile.developmentGoal}`,
    `${MANUAL_START}${protectedContent}${MANUAL_END}`,
    `<div align="center">\n\n![Professional footer for ${profile.displayName}](./assets/footer.svg)\n\n<sub>Profile data last refreshed: ${status.lastMeaningfulRefresh || 'Not yet refreshed'}</sub>\n\n</div>`
  ];
  return sections.join('\n\n');
}

const protectedContent = manualContent(existing);
const generatedBody = buildGeneratedBody(protectedContent);
let output;

const startIndex = existing.indexOf(AUTO_START);
const endIndex = existing.indexOf(AUTO_END);
if (startIndex !== -1 && endIndex > startIndex) {
  const prefix = existing.slice(0, startIndex);
  const suffix = existing.slice(endIndex + AUTO_END.length);
  output = `${prefix}${AUTO_START}\n${generatedBody}\n${AUTO_END}${suffix}`;
} else {
  output = template.replace('{{AUTO-GENERATED}}', generatedBody);
}

if (!output.includes(AUTO_START) || !output.includes(AUTO_END)) throw new Error('Generated block markers are missing.');
if (!output.includes(MANUAL_START) || !output.includes(MANUAL_END)) throw new Error('Protected manual content markers are missing.');
if (/\{\{[^}]+\}\}/.test(output)) throw new Error('Unresolved template placeholders remain in README.md.');

for (const [key, value] of Object.entries(links)) {
  if (!value) continue;
  const candidate = key === 'email' && !value.startsWith('mailto:') ? `mailto:${value}` : value;
  const valid = key === 'email' ? isValidHttpUrl(candidate) : isSafePublicHttpUrl(candidate);
  if (!valid) throw new Error(`Invalid or unsafe configured public link for ${key}.`);
}

writeText('README.md', `${output.trim()}\n`);
console.log('README.md generated by replacing only the automatic block and preserving protected manual content exactly.');
