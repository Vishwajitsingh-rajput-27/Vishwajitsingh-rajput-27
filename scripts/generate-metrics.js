import { escapeHtml, readJson, writeText } from './lib.js';

const profile = readJson('config/profile.json');
const github = readJson('data/github-profile.json');
const repositories = readJson('data/repositories.json');
const languageData = readJson('data/language-summary.json');
const eligible = repositories.repositories ?? [];
const featuredCount = (repositories.featured ?? []).length;
const publicCount = github.publicRepositoryCount || eligible.length;
const topLanguages = (languageData.languages ?? []).slice(0, 5);
const maxPercentage = Math.max(1, ...topLanguages.map((item) => item.displayPercentage));
const bars = topLanguages.map((item, index) => {
  const y = 166 + index * 31;
  const width = Math.round((item.displayPercentage / maxPercentage) * 310);
  return `<text x="640" y="${y}" fill="#CBD5E1" font-family="Arial, Helvetica, sans-serif" font-size="14">${escapeHtml(item.name)}</text><rect x="760" y="${y - 13}" width="${width}" height="11" rx="5.5" fill="url(#accent)" opacity="${Math.max(0.45, 1 - index * 0.1).toFixed(2)}"/><text x="1080" y="${y}" text-anchor="end" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="13">${item.displayPercentage.toFixed(1)}%</text>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 360" role="img" aria-labelledby="title desc">
<title id="title">Public GitHub overview for ${escapeHtml(profile.displayName)}</title>
<desc id="desc">Repository counts, featured project count, focus areas, and public repository language composition.</desc>
<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22D3EE"/><stop offset="0.55" stop-color="#3B82F6"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070B14"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>
<rect x="1" y="1" width="1118" height="358" rx="24" fill="url(#bg)" stroke="#334155"/>
<text x="42" y="55" fill="#E5E7EB" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700">Public GitHub Overview</text>
<text x="42" y="83" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="14">Generated from public repository metadata; no private repositories are queried.</text>
<rect x="42" y="104" width="1036" height="2" rx="1" fill="url(#accent)" opacity="0.72"/>
<g font-family="Arial, Helvetica, sans-serif">
<text x="58" y="172" fill="#22D3EE" font-size="44" font-weight="700">${publicCount}</text><text x="58" y="199" fill="#94A3B8" font-size="15">public repositories</text>
<text x="270" y="172" fill="#3B82F6" font-size="44" font-weight="700">${featuredCount}</text><text x="270" y="199" fill="#94A3B8" font-size="15">featured repositories</text>
<text x="58" y="252" fill="#E5E7EB" font-size="18" font-weight="700">Current engineering focus</text>
<text x="58" y="284" fill="#CBD5E1" font-size="15">Full-stack applications · Applied AI · Computer vision</text>
<text x="58" y="310" fill="#CBD5E1" font-size="15">Automation · Geospatial and satellite-image workflows</text>
<text x="640" y="137" fill="#E5E7EB" font-size="18" font-weight="700">Public repository composition</text>
${bars || '<text x="640" y="180" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="15">Language data will appear after a successful public-data refresh.</text>'}
<text x="640" y="332" fill="#64748B" font-size="12">Composition does not represent absolute proficiency.</text>
</g></svg>`;
writeText('assets/generated/metrics.svg', `${svg}\n`);
console.log('Generated assets/generated/metrics.svg.');
