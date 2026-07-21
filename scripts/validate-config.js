const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

const requiredConfigFiles = [
  "config/profile.json",
  "config/skills.json",
  "config/projects.json",
  "config/integrations.json",
  "config/theme.json"
];

const requiredDataFiles = [
  "data/github-profile.json",
  "data/repositories.json",
  "data/language-summary.json"
];

for (const file of [...requiredConfigFiles, ...requiredDataFiles]) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing required JSON file: ${file}`);
  JSON.parse(fs.readFileSync(full, "utf8"));
}

const profile = JSON.parse(fs.readFileSync(path.join(root, "config/profile.json"), "utf8"));
const mandatory = ["username", "fullName", "displayName", "headline", "tagline", "location", "about"];
for (const key of mandatory) {
  if (!profile[key]) throw new Error(`Missing mandatory profile key: ${key}`);
}

if (profile.username !== "Vishwajitsingh-rajput-27") {
  throw new Error("Configured username must remain Vishwajitsingh-rajput-27.");
}

if (!Array.isArray(profile.currentProjects) || profile.currentProjects.length === 0) {
  throw new Error("At least one current project is required.");
}

console.log("Config and JSON validation passed.");
