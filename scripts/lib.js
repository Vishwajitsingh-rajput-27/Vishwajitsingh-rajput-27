import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import dns from 'node:dns';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GITHUB_API_BASE_URL = (process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/+$/, '');

export function readJson(relativePath, fallback = null) {
  const file = path.join(ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (fallback !== null) return structuredClone(fallback);
    throw new Error(`Unable to read ${relativePath}: ${error.message}`);
  }
}

export function writeJson(relativePath, value) {
  const file = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

export function readText(relativePath, fallback = '') {
  try {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  } catch {
    return fallback;
  }
}

export function writeText(relativePath, value) {
  const file = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, value, 'utf8');
  fs.renameSync(tmp, file);
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function normalizeUrl(value = '') {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return String(value).trim();
  }
}

export function stableSortObject(value) {
  if (Array.isArray(value)) return value.map(stableSortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableSortObject(item)])
  );
}

export function stableStringify(value) {
  return JSON.stringify(stableSortObject(value));
}

export function hashValue(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function commandExists(command) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    encoding: 'utf8'
  });
  return result.status === 0;
}

export function ghApi(endpoint) {
  if (process.env.PROFILE_DISABLE_GH_CLI === '1' || !commandExists('gh')) return null;
  const env = { ...process.env };
  if (process.env.GITHUB_TOKEN && !env.GH_TOKEN) env.GH_TOKEN = process.env.GITHUB_TOKEN;
  const auth = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8', env });
  if (auth.status !== 0) return null;
  const result = spawnSync('gh', ['api', '--paginate', '--slurp', endpoint], {
    encoding: 'utf8',
    maxBuffer: 25 * 1024 * 1024,
    env
  });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  try {
    const pages = JSON.parse(result.stdout);
    return Array.isArray(pages) ? pages.flatMap((page) => (Array.isArray(page) ? page : [page])) : null;
  } catch {
    return null;
  }
}

export async function fetchJson(url, {
  token = process.env.GITHUB_TOKEN,
  timeoutMs = Number(process.env.PROFILE_FETCH_TIMEOUT_MS || 8000),
  retries = Number(process.env.PROFILE_FETCH_RETRIES || 1)
} = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'github-profile-readme-automation',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timer);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} for ${new URL(url).origin}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timer);
      const origin = (() => { try { return new URL(url).origin; } catch { return 'configured endpoint'; } })();
      lastError = new Error(`Request to ${origin} failed: ${error.name === 'AbortError' ? 'timeout' : error.message}`);
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function githubApiUrl(pathname) {
  return `${GITHUB_API_BASE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export async function fetchPublicRepositories(username) {
  // The public user endpoint already excludes private repositories. `type=owner`
  // excludes organization-member repositories and is a supported API value.
  const endpoint = `/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100`;
  const viaGh = ghApi(endpoint);
  if (viaGh?.length) return { repositories: viaGh, source: 'gh-cli' };

  const repositories = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await fetchJson(githubApiUrl(`${endpoint}&page=${page}`));
    if (!Array.isArray(batch)) throw new Error('GitHub repositories response was not an array.');
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  return { repositories, source: 'github-rest' };
}

export function daysSince(dateString) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const time = Date.parse(dateString);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - time) / 86_400_000);
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function repositoryUrl(username, name) {
  return `https://github.com/${username}/${name}`;
}

export function isValidHttpUrl(value, { allowMailto = true } = {}) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:', ...(allowMailto ? ['mailto:'] : [])].includes(url.protocol);
  } catch {
    return false;
  }
}

function isPrivateOrReservedIp(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return true;
}

export function isSafePublicHttpUrl(value) {
  if (!value || !isValidHttpUrl(value, { allowMailto: false })) return false;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (net.isIP(host) && isPrivateOrReservedIp(host)) return false;
  return true;
}

async function assertPublicDns(hostname, timeoutMs = 3500) {
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) throw new Error('URL resolves to a private or reserved address.');
    return;
  }

  await new Promise((resolve, reject) => {
    const resolver = new dns.Resolver();
    const addresses = [];
    const failures = [];
    let pending = 2;
    let settled = false;

    const finish = () => {
      pending -= 1;
      if (pending > 0 || settled) return;
      settled = true;
      clearTimeout(timer);
      if (addresses.some((address) => isPrivateOrReservedIp(address))) {
        reject(new Error('URL resolves to a private or reserved address.'));
      } else if (addresses.length > 0) {
        resolve();
      } else {
        reject(new Error(failures[0] || 'DNS lookup returned no public address.'));
      }
    };

    const collect = (error, records = []) => {
      if (settled) return;
      if (error && !['ENODATA', 'ENOTFOUND'].includes(error.code)) failures.push(error.message);
      addresses.push(...records);
      finish();
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolver.cancel();
      reject(new Error('DNS lookup timed out.'));
    }, timeoutMs);
    timer.unref?.();

    resolver.resolve4(hostname, collect);
    resolver.resolve6(hostname, collect);
  });
}

export async function fetchPublicUrl(value, options = {}) {
  let current = normalizeUrl(value);
  const maxRedirects = Number(options.maxRedirects ?? 5);
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    if (!isSafePublicHttpUrl(current)) throw new Error('Unsafe public URL.');
    const url = new URL(current);
    await assertPublicDns(url.hostname, Math.min(Number(options.dnsTimeoutMs ?? 3500), 10000));
    const response = await fetch(url, {
      ...options,
      maxRedirects: undefined,
      dnsTimeoutMs: undefined,
      redirect: 'manual'
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    current = new URL(location, url).toString();
  }
  throw new Error('Too many redirects while checking public URL.');
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
