import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readText, writeText } from './lib.js';

const original = readText('README.md');
const start = '<!-- MANUAL-CONTENT:START -->';
const end = '<!-- MANUAL-CONTENT:END -->';
const sentinel = '\nProtected test content: punctuation, spacing, and <details> remain unchanged.\n\n- Exact line one\n- Exact line two\n';

function runGenerator() {
  const result = spawnSync(process.execPath, ['scripts/generate-readme.js'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'README generation failed.');
}

try {
  assert.ok(original.includes(start) && original.includes(end), 'Required manual markers are missing.');
  const injected = original.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}${sentinel}${end}`);
  writeText('README.md', injected);
  runGenerator();
  const once = readText('README.md');
  const manualOnce = once.match(/<!-- MANUAL-CONTENT:START -->([\s\S]*?)<!-- MANUAL-CONTENT:END -->/)?.[1];
  assert.equal(manualOnce, sentinel, 'Manual content changed after one generation run.');
  runGenerator();
  const twice = readText('README.md');
  const manualTwice = twice.match(/<!-- MANUAL-CONTENT:START -->([\s\S]*?)<!-- MANUAL-CONTENT:END -->/)?.[1];
  assert.equal(manualTwice, sentinel, 'Manual content changed after two generation runs.');
  assert.equal(twice, once, 'A second generation run was not deterministic.');
  console.log('Protected manual content survived two deterministic generation runs exactly.');
} finally {
  writeText('README.md', original);
}
