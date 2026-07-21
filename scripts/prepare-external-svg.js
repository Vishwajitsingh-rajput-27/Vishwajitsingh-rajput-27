import fs from 'node:fs';
import path from 'node:path';

const [source, destination, title, description] = process.argv.slice(2);
if (!source || !destination || !title || !description) {
  console.error('Usage: node scripts/prepare-external-svg.js <source> <destination> <title> <description>');
  process.exit(2);
}

const input = fs.readFileSync(source, 'utf8');
if (!/<svg\b/i.test(input)) throw new Error(`${source} does not contain an SVG root.`);
if (/<script\b|javascript:|<foreignObject\b|<(?:image|use)\b[^>]+(?:href|xlink:href)=["']https?:/i.test(input)) {
  throw new Error(`${source} contains unsafe or externally loaded SVG content.`);
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

let output = input;
output = output.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, '');
output = output.replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/i, '');
output = output.replace(/<svg\b([^>]*)>/i, (match, attributes) => {
  let attrs = attributes;
  if (!/\bviewBox\s*=/.test(attrs)) {
    const width = attrs.match(/\bwidth\s*=\s*["']([0-9.]+)(?:px)?["']/i)?.[1];
    const height = attrs.match(/\bheight\s*=\s*["']([0-9.]+)(?:px)?["']/i)?.[1];
    if (!width || !height) throw new Error(`${source} has no viewBox and no numeric width/height fallback.`);
    attrs += ` viewBox="0 0 ${width} ${height}"`;
  }
  attrs = attrs.replace(/\s+(?:aria-labelledby|aria-describedby)=["'][^"']*["']/gi, '');
  return `<svg${attrs} role="img" aria-labelledby="external-svg-title external-svg-description">\n<title id="external-svg-title">${escapeXml(title)}</title>\n<desc id="external-svg-description">${escapeXml(description)}</desc>`;
});

fs.mkdirSync(path.dirname(destination), { recursive: true });
const temporary = `${destination}.tmp`;
fs.writeFileSync(temporary, output, 'utf8');
fs.renameSync(temporary, destination);
console.log(`Prepared safe, accessible SVG: ${destination}`);
