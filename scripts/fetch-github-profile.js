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

function readExisting() {
  if (!fs.existsSync(outputPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch {
    return null;
  }
}

(async () => {
  const username = profile.username;
  const existing = readExisting();
  let user = null;

  try {
    user = fetchWithGh(username);
  } catch {
    user = null;
  }

  if (!user) {
    try {
      user = await fetchWithRest(username);
    } catch {
      user = null;
    }
  }

  if (!user && existing) {
    const fallback = {
      ...existing,
      syncStatus: {
        success: false,
        reason: "GitHub API unavailable; preserved previous profile snapshot"
      }
    };
    fs.writeFileSync(outputPath, `${JSON.stringify(fallback, null, 2)}\n`);
    console.log(`Preserved ${path.relative(root, outputPath)}`);
    return;
  }

  const source = user || {
    name: profile.fullName,
    bio: profile.headline,
    followers: null,
    following: null,
    public_repos: null,
    blog: "",
    twitter_username: "",
    email: ""
  };

  const verifiedLinks = {
    github: `https://github.com/${username}`,
    portfolio: isUrl(source.blog) ? source.blog : "",
    x: source.twitter_username ? `https://x.com/${source.twitter_username}` : ""
  };

  const payload = {
    username,
    profileUrl: `https://github.com/${username}`,
    profileName: source.name || "",
    bio: source.bio || "",
    followers: typeof source.followers === "number" ? source.followers : null,
    following: typeof source.following === "number" ? source.following : null,
    publicRepos: typeof source.public_repos === "number" ? source.public_repos : null,
    verifiedLinks,
    publicEmail: source.email || "",
    syncStatus: {
      success: Boolean(user),
      reason: user ? "Live profile metadata refreshed from GitHub" : "Live profile data unavailable; using configured defaults"
    }
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, outputPath)}`);
})();
