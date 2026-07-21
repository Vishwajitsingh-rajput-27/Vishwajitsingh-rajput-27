const { spawnSync } = require("node:child_process");

const targets = process.argv.slice(2);
const diffTargets = targets.length ? targets : ["README.md", "data", "config"];

function runGit(commandArgs) {
  const result = spawnSync("git", commandArgs, { encoding: "utf8" });
  return result.status === 0 ? result.stdout : "";
}

function normalizeDiff(diff) {
  return diff
    .split("\n")
    .filter((line) => {
      const volatilePatterns = [
        /"lastUpdated"\s*:\s*"[^"]+"/,
        /"syncTimestamp"\s*:\s*"[^"]+"/
      ];
      return !volatilePatterns.some((pattern) => pattern.test(line));
    })
    .join("\n")
    .trim();
}

const rawDiff = runGit(["diff", "--", ...diffTargets]);
const normalized = normalizeDiff(rawDiff);
const changed = normalized.length > 0;
const statusLine = `changed=${changed}`;

console.log(statusLine);

if (process.env.GITHUB_OUTPUT) {
  require("node:fs").appendFileSync(process.env.GITHUB_OUTPUT, `${statusLine}\n`);
}

process.exit(0);
