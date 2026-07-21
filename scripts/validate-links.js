const fs = require("node:fs");
const path = require("node:path");

const profile = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config/profile.json"), "utf8"));
const links = profile.publicLinks || {};

for (const [label, url] of Object.entries(links)) {
  if (!url) continue;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol for ${label}`);
    }
  } catch (error) {
    throw new Error(`Invalid URL for ${label}: ${url}`);
  }
}

if (!links.github || !links.github.includes("github.com/Vishwajitsingh-rajput-27")) {
  throw new Error("GitHub profile link must be present and correct.");
}

console.log("Link validation passed.");
