import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { ROOT } from './lib.js';

const parser = new XMLParser({ ignoreAttributes: false, allowBooleanAttributes: true });
const errors = [];
const files = [];
const directoryIndex = process.argv.indexOf('--directory');
const requestedDirectory = directoryIndex >= 0 ? process.argv[directoryIndex + 1] : 'assets';
if (!requestedDirectory) throw new Error('--directory requires a path.');
const targetDirectory = path.resolve(ROOT, requestedDirectory);
if (!targetDirectory.startsWith(`${ROOT}${path.sep}`) && targetDirectory !== ROOT) throw new Error('SVG validation directory must remain inside the repository.');
if (!fs.existsSync(targetDirectory)) throw new Error(`SVG validation directory does not exist: ${requestedDirectory}`);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.toLowerCase().endsWith('.svg')) files.push(full);
  }
}
walk(targetDirectory);

for (const file of files) {
  const relative = path.relative(ROOT, file);
  const size = fs.statSync(file).size;
  const text = fs.readFileSync(file, 'utf8');
  if (size > 5 * 1024 * 1024) errors.push(`${relative}: SVG exceeds the 5 MiB profile-asset limit.`);
  try {
    const parsed = parser.parse(text);
    if (!parsed.svg) errors.push(`${relative}: root <svg> element is missing.`);
  } catch (error) {
    errors.push(`${relative}: invalid XML (${error.message})`);
    continue;
  }
  const viewBox = text.match(/\bviewBox="\s*([^"\s]+)\s+([^"\s]+)\s+([^"\s]+)\s+([^"\s]+)\s*"/i);
  if (!viewBox) errors.push(`${relative}: responsive viewBox is missing or invalid.`);
  else if (!(Number(viewBox[3]) > 0 && Number(viewBox[4]) > 0)) errors.push(`${relative}: viewBox width and height must be positive.`);
  if (!/<title\b[^>]*>[^<]+<\/title>/.test(text)) errors.push(`${relative}: accessible <title> is missing.`);
  if (!/<desc\b[^>]*>[^<]+<\/desc>/.test(text)) errors.push(`${relative}: accessible <desc> is missing.`);
  if (/<script\b|javascript:|<foreignObject\b/i.test(text)) errors.push(`${relative}: unsafe SVG content detected.`);
  if (/<(?:image|use)\b[^>]+(?:href|xlink:href)=["']https?:/i.test(text)) errors.push(`${relative}: external image or symbol resource detected.`);
  const withoutNamespace = text.replaceAll('http://www.w3.org/2000/svg', '');
  if (/(?:@import|url\s*\(\s*["']?https?:\/\/)/i.test(withoutNamespace)) errors.push(`${relative}: external stylesheet or font resource detected.`);
  if (/font-family="[^"]*(Google|Roboto|Inter)[^"]*"/i.test(text)) errors.push(`${relative}: external font dependency is not allowed.`);
  if (/<(?:animate|animateTransform|set)\b[^>]*\bdur=["'](?:0(?:\.[0-9]+)?|1(?:\.0+)?)s["']/i.test(text)) errors.push(`${relative}: rapid animation may flash and is not allowed.`);
}

if (!files.length) errors.push(`${requestedDirectory}: no SVG files were found.`);
if (errors.length) {
  console.error(`SVG validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Validated ${files.length} SVG assets in ${requestedDirectory} for XML structure, size, accessibility, responsiveness, and unsafe content.`);
