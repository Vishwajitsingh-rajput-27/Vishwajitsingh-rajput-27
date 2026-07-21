const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const readmePath = path.join(root, "README.md");
const profile = JSON.parse(fs.readFileSync(path.join(root, "config", "profile.json"), "utf8"));
const skills = JSON.parse(fs.readFileSync(path.join(root, "config", "skills.json"), "utf8"));
const repos = JSON.parse(fs.readFileSync(path.join(root, "data", "repositories.json"), "utf8"));
const languages = JSON.parse(fs.readFileSync(path.join(root, "data", "language-summary.json"), "utf8"));
const template = fs.readFileSync(path.join(root, "templates", "README.template.md"), "utf8");

const AUTO_START = "<!-- PROFILE-AUTO:START -->";
const AUTO_END = "<!-- PROFILE-AUTO:END -->";
const PROTECTED_BLOCKS = ["PROFILE-MANUAL-NOTES"];

function extractProtectedBlock(content, key) {
  const blockRegex = new RegExp(`<!-- ${key}:START -->([\\s\\S]*?)<!-- ${key}:END -->`, "m");
  const match = content.match(blockRegex);
  return match ? match[1] : null;
}

function restoreProtectedBlocks(nextContent, currentReadme) {
  let output = nextContent;
  for (const key of PROTECTED_BLOCKS) {
    const existing = extractProtectedBlock(currentReadme, key);
    if (existing === null) continue;
    const blockRegex = new RegExp(`(<!-- ${key}:START -->)([\\s\\S]*?)(<!-- ${key}:END -->)`, "m");
    output = output.replace(blockRegex, `$1${existing}$3`);
  }
  return output;
}

function stableJoin(items) {
  return [...items].filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
}

const socialEntries = [
  ["GitHub", profile.publicLinks.github],
  ["LinkedIn", profile.publicLinks.linkedin],
  ["Portfolio", profile.publicLinks.portfolio],
  ["Resume", profile.publicLinks.resume],
  ["LeetCode", profile.publicLinks.leetcode]
].filter(([, url]) => typeof url === "string" && url.trim().length > 0);

const socialText = socialEntries.length
  ? socialEntries.map(([label, url]) => `- [${label}](${url})`).join("\n")
  : "- Additional verified links will be added when publicly available.";

const aboutText = [
  profile.about,
  "",
  `- **Display Name:** ${profile.displayName}`,
  `- **Configured Name:** ${profile.fullName}`,
  `- **Headline:** ${profile.headline}`,
  `- **Tagline:** ${profile.tagline}`,
  `- **Location:** ${profile.location}`,
  `- **Education:** ${profile.education.degree}, ${profile.education.institution} (${profile.education.affiliation})`,
  `- **Academic Status:** ${profile.education.year}`,
  "- **Verified Links:**",
  socialText
].join("\n");

const projectsText = profile.currentProjects
  .map((project) => {
    const links = [];
    if (project.repository) links.push(`[Repository](${project.repository})`);
    if (project.demo) links.push(`[Deployment](${project.demo})`);
    return [
      `### ${project.name}`,
      `- **Status:** ${project.status}`,
      `- **Description:** ${project.solution}`,
      `- **Verified Technologies:** ${stableJoin(project.technologies).join(", ") || "Pending"}`,
      links.length ? `- **Verified Links:** ${links.join(" | ")}` : "- **Verified Links:** Public repository and deployment links will be added after verification."
    ].join("\n");
  })
  .join("\n\n");

const featured = Array.isArray(repos.featured) ? repos.featured : [];

const featuredRepos = featured.length >= 2
  ? featured
      .slice(0, 4)
      .map((repo) => {
        const languageText = Array.isArray(repo.languages) && repo.languages.length ? repo.languages.join(", ") : "Not specified";
        const homepage = repo.homepage ? ` | [Verified Homepage](${repo.homepage})` : "";
        return `- **[${repo.name}](${repo.url})** — ${repo.description || "No description."}  \n  Languages: ${languageText} | ⭐ ${repo.stars} | 🍴 ${repo.forks}${homepage}`;
      })
      .join("\n")
  : [
      "### Projects in Development",
      "Public repositories are currently being curated. In the meantime, active project work is tracked in the Current Projects section above."
    ].join("\n");

const languageRows = Array.isArray(languages.languages) && languages.languages.length > 0
  ? languages.languages.slice(0, 6).map((item) => `| ${item.language} | ${item.percentage}% |`).join("\n")
  : "| Data | Pending |";

const generatedContent = template
  .replace("{{BANNER}}", "![Professional Hero Banner](./assets/banner.svg)")
  .replace(
    "{{ROLE_LINE}}",
    [
      '<p align="left">',
      '  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&duration=2500&pause=1000&color=22D3EE&width=620&lines=Full-Stack+Developer;AI+%26+Geospatial+Builder;Computer+Engineering+Student" alt="Animated roles: Full-Stack Developer, AI and Geospatial Builder, Computer Engineering Student" />',
      "</p>",
      "",
      "**Fallback:** Full-Stack Developer • AI & Geospatial Builder • Computer Engineering Student"
    ].join("\n")
  )
  .replace("{{ABOUT}}", aboutText)
  .replace("{{FOCUS}}", profile.currentFocus.map((item) => `- ${item}`).join("\n"))
  .replace("{{CURRENT_PROJECTS}}", projectsText)
  .replace(
    "{{TECHNOLOGIES}}",
    [
      "### Core Technologies",
      ...skills.displayPriority.map((item) => `- ${item}`),
      "",
      "### Additional Tools (Learning and Exploration)",
      stableJoin(skills.suggestedSkills).join(" • ")
    ].join("\n")
  )
  .replace("{{FEATURED_REPOSITORIES}}", featuredRepos)
  .replace("{{LEARNING_FOCUS}}", profile.learningFocus.map((item) => `- ${item}`).join("\n"))
  .replace(
    "{{GITHUB_OVERVIEW}}",
    [
      "| GitHub Stats | Contribution Streak |",
      "| --- | --- |",
      `| ![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${profile.username}&show_icons=true&hide_border=true&bg_color=070B14&title_color=22D3EE&text_color=E5E7EB&icon_color=3B82F6) | ![GitHub Streak](https://streak-stats.demolab.com?user=${profile.username}&theme=transparent&ring=22D3EE&fire=3B82F6&currStreakLabel=E5E7EB&sideLabels=94A3B8&dates=94A3B8) |`,
      "",
      "### Public Repository Language Summary",
      languages.disclaimer || "Language statistics reflect the composition of public repositories and do not represent absolute proficiency.",
      "",
      "| Language | Share |",
      "| --- | --- |",
      languageRows
    ].join("\n")
  )
  .replace(
    "{{CONTRIBUTION_ACTIVITY}}",
    [
      "A visual representation of my GitHub contribution activity, generated automatically through GitHub Actions.",
      "",
      "<p align=\"center\">",
      "<picture>",
      `  <source media=\"(prefers-color-scheme: dark)\" srcset=\"https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake-dark.svg\">`,
      `  <source media=\"(prefers-color-scheme: light)\" srcset=\"https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake.svg\">`,
      `  <img alt=\"GitHub contribution snake animation\" src=\"https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake.svg\">`,
      "</picture>",
      "</p>"
    ].join("\n")
  )
  .replace(
    "{{COLLABORATION}}",
    [
      "I am open to collaborating on:",
      ...profile.collaborationInterests.map((item) => `- ${item}`),
      "",
      "If you would like to collaborate, connect through my GitHub profile."
    ].join("\n")
  )
  .replace("{{FOOTER}}", "![Professional Footer](./assets/footer.svg)")
  .trim();

const existingReadme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8") : "";
const contentWithProtectedBlocks = restoreProtectedBlocks(generatedContent, existingReadme);

let finalReadme;
if (existingReadme.includes(AUTO_START) && existingReadme.includes(AUTO_END)) {
  const replaceRegex = new RegExp(`${AUTO_START}[\\s\\S]*?${AUTO_END}`, "m");
  finalReadme = existingReadme.replace(replaceRegex, `${AUTO_START}\n${contentWithProtectedBlocks}\n${AUTO_END}`);
} else {
  finalReadme = [
    AUTO_START,
    contentWithProtectedBlocks,
    AUTO_END
  ].join("\n");
}

fs.writeFileSync(readmePath, `${finalReadme.trim()}\n`);
console.log("Generated README.md");
