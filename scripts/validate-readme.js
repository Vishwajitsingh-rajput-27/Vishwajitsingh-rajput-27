const fs = require("node:fs");
const path = require("node:path");

const readmePath = path.join(process.cwd(), "README.md");
if (!fs.existsSync(readmePath)) throw new Error("README.md not found");

const readme = fs.readFileSync(readmePath, "utf8");

const requiredHeadings = [
  "## About Me",
  "## What I’m Focused On",
  "## Current Projects",
  "## Technologies I Use and Explore",
  "## Featured Repositories",
  "## Learning Focus",
  "## GitHub Overview",
  "## Contribution Activity",
  "## Collaboration"
];

for (const heading of requiredHeadings) {
  if (!readme.includes(heading)) throw new Error(`Missing required heading: ${heading}`);
}

const requiredMarkers = [
  "<!-- PROFILE-AUTO:START -->",
  "<!-- PROFILE-AUTO:END -->",
  "<!-- PROFILE-MANUAL-NOTES:START -->",
  "<!-- PROFILE-MANUAL-NOTES:END -->"
];

for (const marker of requiredMarkers) {
  if (!readme.includes(marker)) throw new Error(`Missing required generated/protected marker: ${marker}`);
}

const forbiddenPhrases = [
  "Coding ninja",
  "AI wizard",
  "Master developer",
  "World-class programmer",
  "Future billionaire",
  "Expert in everything",
  "Revolutionary product",
  "Best developer",
  "Legendary coder",
  "Industry-leading engineer"
];

for (const phrase of forbiddenPhrases) {
  const pattern = new RegExp(phrase, "i");
  if (pattern.test(readme)) throw new Error(`Forbidden hype phrase found: ${phrase}`);
}

if (!readme.includes("Language statistics reflect the composition of public repositories and do not represent absolute proficiency.")) {
  throw new Error("Required language disclaimer is missing.");
}

const roleLine = "Full-Stack+Developer;AI+%26+Geospatial+Builder;Computer+Engineering+Student";
if (!readme.includes(roleLine)) {
  throw new Error("Animated roles are not aligned with the approved role list.");
}

if (!readme.includes("username=Vishwajitsingh-rajput-27") || !readme.includes("user=Vishwajitsingh-rajput-27")) {
  throw new Error("GitHub overview cards must target Vishwajitsingh-rajput-27.");
}

const imageAlts = [...readme.matchAll(/!\[([^\]]*)\]\(/g)];
for (const [, alt] of imageAlts) {
  if (!alt.trim()) throw new Error("README contains an image without alt text.");
}

if (/<details>[\s\S]*Contribution Activity[\s\S]*<\/details>/m.test(readme)) {
  throw new Error("Contribution Activity section must not be inside a collapsed block.");
}

console.log("README structure and content validation passed.");
