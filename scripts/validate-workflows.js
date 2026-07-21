const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relativePath) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${relativePath}`);
  return fs.readFileSync(full, "utf8");
}

function assertIncludes(content, expected, message) {
  if (!content.includes(expected)) throw new Error(message);
}

const autoUpdate = read(".github/workflows/auto-update-profile.yml");
const snake = read(".github/workflows/snake.yml");
const metrics = read(".github/workflows/metrics.yml");
const contribution3d = read(".github/workflows/contribution-3d.yml");
const validateProfile = read(".github/workflows/validate-profile.yml");
const dependencyReview = read(".github/workflows/dependency-review.yml");

[autoUpdate, snake, metrics, contribution3d, validateProfile, dependencyReview].forEach((content, index) => {
  if (!content.includes("on:")) {
    const names = ["auto-update-profile.yml", "snake.yml", "metrics.yml", "contribution-3d.yml", "validate-profile.yml", "dependency-review.yml"];
    throw new Error(`Workflow missing trigger block: ${names[index]}`);
  }
});

assertIncludes(autoUpdate, "schedule:", "Auto-update workflow must run on schedule.");
assertIncludes(autoUpdate, "workflow_dispatch:", "Auto-update workflow must support manual execution.");
assertIncludes(autoUpdate, "config/**", "Auto-update workflow must react to config changes.");
assertIncludes(autoUpdate, "scripts/**", "Auto-update workflow must react to script changes.");
assertIncludes(autoUpdate, "templates/**", "Auto-update workflow must react to template changes.");
assertIncludes(autoUpdate, "timeout-minutes:", "Auto-update workflow must define timeout.");
assertIncludes(autoUpdate, "concurrency:", "Auto-update workflow must define concurrency.");
assertIncludes(autoUpdate, "contents: write", "Auto-update workflow must use minimum required contents permission.");
assertIncludes(autoUpdate, "github.actor != 'github-actions[bot]'", "Auto-update workflow must prevent workflow loops.");
assertIncludes(autoUpdate, "GITHUB_TOKEN", "Auto-update workflow must use built-in GITHUB_TOKEN.");
assertIncludes(autoUpdate, "npm run update:profile", "Auto-update workflow must refresh profile artifacts.");
assertIncludes(autoUpdate, "npm run validate", "Auto-update workflow must validate artifacts.");
assertIncludes(autoUpdate, "npm run detect-changes", "Auto-update workflow must detect meaningful changes.");

assertIncludes(snake, "workflow_dispatch:", "Snake workflow must support manual execution.");
assertIncludes(snake, "schedule:", "Snake workflow must run on schedule.");
assertIncludes(snake, "github_user_name: Vishwajitsingh-rajput-27", "Snake workflow must target Vishwajitsingh-rajput-27.");
assertIncludes(snake, "github-contribution-grid-snake.svg", "Snake workflow must generate light SVG.");
assertIncludes(snake, "github-contribution-grid-snake-dark.svg", "Snake workflow must generate dark SVG.");
assertIncludes(snake, "github-contribution-grid-snake.gif", "Snake workflow must include GIF generation when supported.");
assertIncludes(snake, "target_branch: output", "Snake workflow must publish assets to output branch.");
assertIncludes(snake, "timeout-minutes:", "Snake workflow must define timeout.");
assertIncludes(snake, "concurrency:", "Snake workflow must define concurrency.");
assertIncludes(snake, "contents: write", "Snake workflow must use minimum contents permission.");
assertIncludes(snake, "GITHUB_TOKEN", "Snake workflow must use built-in GITHUB_TOKEN.");

const dependabot = read(".github/dependabot.yml");
assertIncludes(dependabot, "package-ecosystem: \"npm\"", "Dependabot must monitor npm dependencies.");
assertIncludes(dependabot, "package-ecosystem: \"github-actions\"", "Dependabot must monitor GitHub Actions dependencies.");
assertIncludes(dependabot, "interval: \"weekly\"", "Dependabot must run weekly.");
if (/automerge|auto-merge/i.test(dependabot)) {
  throw new Error("Dependabot config must not auto-merge major updates.");
}

console.log("Workflow and Dependabot validation passed.");
