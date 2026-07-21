const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const profile = JSON.parse(fs.readFileSync(path.join(root, "config", "profile.json"), "utf8"));
const skills = JSON.parse(fs.readFileSync(path.join(root, "config", "skills.json"), "utf8"));
const repos = JSON.parse(fs.readFileSync(path.join(root, "data", "repositories.json"), "utf8"));
const languages = JSON.parse(fs.readFileSync(path.join(root, "data", "language-summary.json"), "utf8"));
const template = fs.readFileSync(path.join(root, "templates", "README.template.md"), "utf8");

const socialEntries = [
  ["GitHub", profile.publicLinks.github],
  ["LinkedIn", profile.publicLinks.linkedin],
  ["Portfolio", profile.publicLinks.portfolio],
  ["Resume", profile.publicLinks.resume],
  ["LeetCode", profile.publicLinks.leetcode],
  ["Codeforces", profile.publicLinks.codeforces],
  ["Dev.to", profile.publicLinks.devto],
  ["Hashnode", profile.publicLinks.hashnode],
  ["Medium", profile.publicLinks.medium],
  ["Stack Overflow", profile.publicLinks.stackoverflow],
  ["X", profile.publicLinks.x]
].filter(([, url]) => typeof url === "string" && url.trim().length > 0);

const socialText = socialEntries.length
  ? socialEntries.map(([label, url]) => `- [${label}](${url})`).join("\n")
  : "- No additional verified public links configured yet.";

const projectsText = profile.currentProjects
  .map((project) => {
    const links = [];
    if (project.repository) links.push(`[Repository](${project.repository})`);
    if (project.demo) links.push(`[Live Demo](${project.demo})`);
    return [
      `### ${project.name}`,
      `- **Problem:** ${project.problem}`,
      `- **Proposed Solution:** ${project.solution}`,
      `- **Main Technology Categories:** ${project.technologies.join(", ")}`,
      `- **Status:** ${project.status}`,
      links.length ? `- **Links:** ${links.join(" | ")}` : "- **Links:** Public repository/demo link will be added after verification."
    ].join("\n");
  })
  .join("\n\n");

const featuredRepos = Array.isArray(repos.featured) && repos.featured.length > 0
  ? repos.featured.map((repo) => {
      const homepage = repo.homepage ? ` | [Homepage](${repo.homepage})` : "";
      const languageText = Array.isArray(repo.languages) && repo.languages.length ? repo.languages.join(", ") : "Not specified";
      const updated = repo.updatedAt ? String(repo.updatedAt).slice(0, 10) : "Unknown";
      return `- **[${repo.name}](${repo.url})** — ${repo.description || "No description."}  \n  Languages: ${languageText} | ⭐ ${repo.stars} | 🍴 ${repo.forks} | Updated: ${updated}${homepage}`;
    }).join("\n")
  : "- Featured repositories will appear automatically after discovery runs against public repositories.";

const languageRows = Array.isArray(languages.languages) && languages.languages.length > 0
  ? languages.languages.slice(0, 6).map((item) => `| ${item.language} | ${item.percentage}% |`).join("\n")
  : "| Data | Pending |";

const readme = template
  .replace("{{BANNER}}", "![Professional Hero Banner](./assets/banner.svg)")
  .replace("{{ROLE_LINE}}", [
    '<p align="left">',
    '  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&duration=2500&pause=1000&color=22D3EE&width=620&lines=Full-Stack+Developer;AI+%26+Geospatial+Builder;Computer+Engineering+Student" alt="Animated role line" />',
    '</p>',
    '',
    '**Fallback:** Full-Stack Developer • AI & Geospatial Builder • Computer Engineering Student'
  ].join("\n"))
  .replace("{{SOCIAL_LINKS}}", socialText)
  .replace("{{ABOUT}}", profile.about)
  .replace("{{TERMINAL_CARD}}", "![Terminal Identity Card](./assets/terminal-card.svg)")
  .replace("{{FOCUS}}", profile.currentFocus.map((item) => `- ${item}`).join("\n"))
  .replace("{{CURRENT_PROJECTS}}", projectsText)
  .replace("{{TECHNOLOGIES}}", [
    "### Core Stack",
    ...skills.displayPriority.map((item) => `- ${item}`),
    "",
    "<details>",
    "<summary>Secondary technologies and active exploration areas</summary>",
    "",
    ...skills.suggestedSkills.map((item) => `- ${item}`),
    "</details>"
  ].join("\n"))
  .replace("{{FEATURED_REPOSITORIES}}", featuredRepos)
  .replace("{{LEARNING_FOCUS}}", profile.learningFocus.map((item) => `- ${item}`).join("\n"))
  .replace("{{GITHUB_OVERVIEW}}", [
    "| GitHub Stats | Contribution Streak |",
    "| --- | --- |",
    `| ![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${profile.username}&show_icons=true&hide_border=true&bg_color=070B14&title_color=22D3EE&text_color=E5E7EB&icon_color=3B82F6) | ![GitHub Streak](https://streak-stats.demolab.com?user=${profile.username}&theme=transparent&ring=22D3EE&fire=3B82F6&currStreakLabel=E5E7EB&sideLabels=94A3B8&dates=94A3B8) |`,
    "",
    "### Public Repository Language Summary",
    languages.disclaimer,
    "",
    "| Language | Share |",
    "| --- | --- |",
    languageRows,
    "",
    `Last update: ${languages.lastUpdated || "Pending first automation run"}`
  ].join("\n"))
  .replace("{{CONTRIBUTION_ACTIVITY}}", [
    "A visual representation of my GitHub contribution activity, generated automatically through GitHub Actions.",
    "",
    "<picture>",
    `  <source media=\"(prefers-color-scheme: dark)\" srcset=\"https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake-dark.svg\">`,
    `  <source media=\"(prefers-color-scheme: light)\" srcset=\"https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake.svg\">`,
    `  <img alt=\"GitHub contribution snake animation\" src=\"https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/github-contribution-grid-snake.svg\">`,
    "</picture>"
  ].join("\n"))
  .replace("{{THREE_D}}", `![3D Contribution Calendar](https://raw.githubusercontent.com/${profile.username}/${profile.username}/output/profile-3d-contrib/profile-night-rainbow.svg)`)
  .replace("{{COLLABORATION}}", [
    "I am open to collaborating on:",
    ...profile.collaborationInterests.map((item) => `- ${item}`),
    "",
    "If you would like to collaborate, connect with me through my GitHub profile."
  ].join("\n"))
  .replace("{{FOOTER}}", "![Professional Footer](./assets/footer.svg)");

fs.writeFileSync(path.join(root, "README.md"), `${readme.trim()}\n`);
console.log("Generated README.md");
