const fs = require("node:fs");
const path = require("node:path");

const workflows = [
  "auto-update-profile.yml",
  "snake.yml",
  "metrics.yml",
  "contribution-3d.yml",
  "validate-profile.yml",
  "dependency-review.yml"
];

for (const wf of workflows) {
  const full = path.join(process.cwd(), ".github", "workflows", wf);
  if (!fs.existsSync(full)) throw new Error(`Missing workflow: ${wf}`);
  const content = fs.readFileSync(full, "utf8");
  if (!content.includes("on:")) throw new Error(`Workflow missing trigger block: ${wf}`);
}

console.log("Workflow validation passed.");
