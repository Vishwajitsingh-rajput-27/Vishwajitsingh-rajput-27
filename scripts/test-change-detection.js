import assert from 'node:assert/strict';
import { hashValue, normalizeUrl } from './lib.js';

function canonicalState(input) {
  return {
    configuration: input.configuration,
    publicLinks: Object.fromEntries(Object.entries(input.publicLinks).sort()),
    repositories: input.repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      url: normalizeUrl(repo.url),
      description: repo.description,
      homepage: normalizeUrl(repo.homepage || ''),
      archived: Boolean(repo.archived),
      languages: [...repo.languages].sort(),
      topics: [...repo.topics].sort()
    })).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    featured: [...input.featured],
    languages: input.languages.map((item) => ({ name: item.name, displayPercentage: item.displayPercentage })).sort((a, b) => a.name.localeCompare(b.name))
  };
}

const base = {
  configuration: { theme: 'cyber-neon-professional' },
  publicLinks: { github: 'https://github.com/example', linkedin: '' },
  repositories: [{ id: 2, name: 'beta', url: 'https://github.com/example/beta/', description: 'B', homepage: '', archived: false, languages: ['Python', 'TypeScript'], topics: ['ai', 'web'] }, { id: 1, name: 'alpha', url: 'https://github.com/example/alpha', description: 'A', homepage: '', archived: false, languages: ['JavaScript'], topics: ['react'] }],
  featured: ['alpha', 'beta'],
  languages: [{ name: 'TypeScript', displayPercentage: 40 }, { name: 'Python', displayPercentage: 60 }],
  fetchedAt: '2026-07-21T10:00:00Z',
  rateLimit: { remaining: 1 }
};
const reordered = {
  ...base,
  repositories: [...base.repositories].reverse().map((repo) => ({ ...repo, languages: [...repo.languages].reverse(), topics: [...repo.topics].reverse() })),
  languages: [...base.languages].reverse(),
  fetchedAt: '2026-07-21T11:00:00Z',
  rateLimit: { remaining: 999 }
};
assert.equal(hashValue(canonicalState(base)), hashValue(canonicalState(reordered)), 'Ordering or temporary metadata changed the semantic fingerprint.');

for (const mutation of [
  { label: 'new repository', apply: (state) => state.repositories.push({ id: 3, name: 'gamma', url: 'https://github.com/example/gamma', description: 'G', homepage: '', archived: false, languages: ['C++'], topics: [] }) },
  { label: 'archive status', apply: (state) => { state.repositories[0].archived = true; } },
  { label: 'rename', apply: (state) => { state.repositories[0].name = 'beta-renamed'; } },
  { label: 'description', apply: (state) => { state.repositories[0].description = 'Changed'; } },
  { label: 'homepage', apply: (state) => { state.repositories[0].homepage = 'https://example.com'; } },
  { label: 'configuration', apply: (state) => { state.configuration.theme = 'different'; } },
  { label: 'public link', apply: (state) => { state.publicLinks.linkedin = 'https://linkedin.com/in/example'; } },
  { label: 'featured selection', apply: (state) => { state.featured = ['beta']; } },
  { label: 'language composition', apply: (state) => { state.languages[0].displayPercentage = 45; } }
]) {
  const changed = structuredClone(base);
  mutation.apply(changed);
  assert.notEqual(hashValue(canonicalState(base)), hashValue(canonicalState(changed)), `${mutation.label} was not detected as meaningful.`);
}
console.log('Meaningful-change tests ignore ordering/timestamps/temporary metadata and detect all required semantic changes.');
