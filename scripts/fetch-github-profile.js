const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const profilePath = path.join(root, "config", "profile.json");
const outputPath = path.join(root, "data", "github-profile.json");
const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));

const isUrl = (value) => typeof value === "string" && /^https:\/\//.test(value);

function fetchWithGh(username) {
  const result = spawnSync("gh", ["api", `users/${username}`], { encoding: "utf8" });
  if (result.status === 0 && result.stdout) return JSON.parse(result.stdout);
  return null;
}

async function fetchWithRest(username) {
  const response = await fetch(`https://api.github.com/users/${username}`, {
    headers: {
      "User-Agent": "profile-readme-bot",
      ...(process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {})
    }
  });
  if (!response.ok) throw new Error(`GitHub API request failed: ${response.status}`);
  return response.json();
}

(async () => {
  const username = profile.username;
  let user = null;

  try {
    user = fetchWithGh(username);
  } catch {
    user = null;
  }

  if (!user) user = await fetchWithRest(username);

  const verifiedLinks = {
    github: `https://github.com/${username}`,
    portfolio: isUrl(user.blog) ? user.blog : "",
    x: user.twitter_username ? `https://x.com/${user.twitter_username}` : ""
  };

  const payload = {
    username,
    profileUrl: `https://github.com/${username}`,
    profileName: user.name || "",
    bio: user.bio || "",
    followers: typeof user.followers === "number" ? user.followers : null,
    following: typeof user.following === "number" ? user.following : null,
    publicRepos: typeof user.public_repos === "number" ? user.public_repos : null,
    verifiedLinks,
    publicEmail: user.email || "",
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, outputPath)}`);
})();
