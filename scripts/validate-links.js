const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const profile = JSON.parse(fs.readFileSync(path.join(root, "config", "profile.json"), "utf8"));
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const links = profile.publicLinks || {};

for (const [label, url] of Object.entries(links)) {
  if (!url) continue;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol for ${label}`);
    }
  } catch {
    throw new Error(`Invalid URL for ${label}: ${url}`);
  }
}

if (!links.github || !links.github.includes("github.com/Vishwajitsingh-rajput-27")) {
  throw new Error("GitHub profile link must be present and correct.");
}

const markdownLinks = [...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
for (const url of markdownLinks) {
  if (/^https?:\/\//.test(url)) continue;
  if (url.startsWith("#")) continue;
  if (url.startsWith("./")) {
    const fullPath = path.join(root, url.replace(/^\.\//, ""));
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Broken internal path in README: ${url}`);
    }
  }
}

const requiredExternal = [
  "https://raw.githubusercontent.com/Vishwajitsingh-rajput-27/Vishwajitsingh-rajput-27/output/github-contribution-grid-snake.svg",
  "https://raw.githubusercontent.com/Vishwajitsingh-rajput-27/Vishwajitsingh-rajput-27/output/github-contribution-grid-snake-dark.svg"
];

for (const url of requiredExternal) {
  if (!readme.includes(url)) throw new Error(`Required URL missing from README: ${url}`);
}

console.log("Link and internal path validation passed.");
