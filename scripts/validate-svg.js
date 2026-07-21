const fs = require("node:fs");
const path = require("node:path");

const required = [
  "assets/banner.svg",
  "assets/terminal-card.svg",
  "assets/neon-divider.svg",
  "assets/footer.svg"
];

for (const file of required) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) throw new Error(`Missing SVG asset: ${file}`);
  const content = fs.readFileSync(full, "utf8");
  if (!content.includes("<title")) throw new Error(`SVG missing title for accessibility: ${file}`);
  if (!content.includes("<desc")) throw new Error(`SVG missing description for accessibility: ${file}`);
  if (/<script[\s>]/i.test(content)) throw new Error(`SVG contains forbidden script tag: ${file}`);
}

console.log("SVG validation passed.");
