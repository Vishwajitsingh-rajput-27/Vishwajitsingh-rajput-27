const fs = require("node:fs");
const path = require("node:path");

const required = [
  "config/profile.json",
  "config/skills.json",
  "config/projects.json",
  "config/integrations.json",
  "config/theme.json"
];

for (const file of required) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) throw new Error(`Missing required config file: ${file}`);
  JSON.parse(fs.readFileSync(full, "utf8"));
}

const profile = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config/profile.json"), "utf8"));
const mandatory = ["username", "fullName", "displayName", "headline", "tagline", "location"];
for (const key of mandatory) {
  if (!profile[key]) throw new Error(`Missing mandatory profile key: ${key}`);
}

console.log("Config validation passed.");
