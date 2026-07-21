import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.js';

const ignoredDirectories = new Set(['.git', 'node_modules', 'coverage', 'dist', 'publish', 'profile-3d-contrib', '.cache', '.npm']);
const ignoredFiles = new Set(['package-lock.json']);
const suspiciousFilenames = [
  /(^|[-_.])\.env($|[-_.])/i,
  /(^|[-_.])(credentials?|client[-_]?secret|service[-_]?account|auth[-_]?export|tokens?|cookies?|session)([-_.]|$)/i,
  /\.(pem|p12|pfx|jks|keystore)$/i
];
const tokenPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/g],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g],
  ['literal bearer credential', /\bAuthorization\s*[:=]\s*["']Bearer\s+[A-Za-z0-9._~+\/-]{20,}["']/gi],
  ['session identifier', /\bsessionid\s*[:=]\s*["'][^"'\s]{16,}["']/gi]
];
const assignmentPattern = /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|secret|cookie)\b\s*[:=]\s*["']([^"']+)["']/gi;
const allowedEmailPatterns = [
  /@users\.noreply\.github\.com$/i,
  /@example\.(?:com|org|net)$/i
];
const findings = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else inspect(full);
  }
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function record(file, line, category) {
  findings.push(`${path.relative(ROOT, file)}:${line} (${category})`);
}

function inspect(file) {
  const relative = path.relative(ROOT, file);
  if (ignoredFiles.has(path.basename(file))) return;
  if (suspiciousFilenames.some((pattern) => pattern.test(path.basename(file))) && path.basename(file) !== '.env.example') {
    record(file, 1, 'suspicious credential filename');
  }
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) return;
  const text = buffer.toString('utf8');

  for (const [category, pattern] of tokenPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) record(file, lineNumber(text, match.index), category);
  }

  assignmentPattern.lastIndex = 0;
  for (const match of text.matchAll(assignmentPattern)) {
    const value = match[2].trim();
    if (/^(?:your[-_ ]|replace[-_ ]|example|placeholder|process\.env|\$\{\{|<)/i.test(value)) continue;
    if (/^(?:true|false|null|undefined)$/i.test(value)) continue;
    if (value.length >= 12) record(file, lineNumber(text, match.index), 'literal credential assignment');
  }

  for (const match of text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    if (!allowedEmailPatterns.some((pattern) => pattern.test(match[0]))) record(file, lineNumber(text, match.index), 'unexpected email address');
  }
}

walk(ROOT);

if (findings.length) {
  console.error(`Secret scan failed with ${findings.length} finding(s). Values are intentionally redacted:`);
  for (const finding of [...new Set(findings)].sort()) console.error(`- ${finding}`);
  process.exit(1);
}
console.log('Secret scan passed: no high-confidence credentials, private keys, session identifiers, cookies, or unexpected email addresses were found.');
