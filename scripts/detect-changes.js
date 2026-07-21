const { spawnSync } = require("node:child_process");

const targets = process.argv.slice(2);
const args = ["diff", "--quiet", "--", ...(targets.length ? targets : ["README.md", "data", "config"])];
const result = spawnSync("git", args, { stdio: "ignore" });

if (result.status === 0) {
  console.log("changed=false");
  process.exit(0);
}

console.log("changed=true");
process.exit(0);
