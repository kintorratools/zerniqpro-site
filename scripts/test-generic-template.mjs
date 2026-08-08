import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

const PATTERNS = [
  'zerniqpro.com',
  'screwfast.uk',
  'ScrewFast',
  'ZERNIQ',
  'MEITE',
  'AussieSteel',
];

// Domains/strings that are explicitly allowed (e.g. generic fixture data).
// These take precedence over PATTERNS — a line matching an allowed pattern
// will NOT be flagged even if it also matches a forbidden pattern.
const ALLOWED = new Set(['store-us.example']);

const EXCLUDE_DIRS = new Set([
  join(PROJECT_ROOT, 'src', 'content'),
  join(PROJECT_ROOT, 'scripts'),
  join(PROJECT_ROOT, 'docs'),
  join(PROJECT_ROOT, 'node_modules'),
  join(PROJECT_ROOT, '.git'),
  join(PROJECT_ROOT, 'dist'),
]);

// Files to ignore by name (binary, images, etc.)
const IGNORE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.avif',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.webm',
  '.lock',
  '.gz',
  '.zip',
]);

function findPattern(line) {
  const lower = line.toLowerCase();
  // Check allowed patterns first — they take precedence
  for (const allowed of ALLOWED) {
    if (lower.includes(allowed.toLowerCase())) {
      return null;
    }
  }
  for (const pat of PATTERNS) {
    if (lower.includes(pat.toLowerCase())) {
      return pat;
    }
  }
  return null;
}

function isExcludedDir(absPath) {
  for (const excluded of EXCLUDE_DIRS) {
    if (
      absPath === excluded ||
      absPath.startsWith(excluded + '\\') ||
      absPath.startsWith(excluded + '/')
    ) {
      return true;
    }
  }
  return false;
}

function walkDir(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (isExcludedDir(full)) continue;

    const st = statSync(full);
    if (st.isDirectory()) {
      walkDir(full, files);
    } else if (st.isFile()) {
      const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase();
      if (!IGNORE_EXTENSIONS.has(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

function scanFile(filePath) {
  const matches = [];
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const found = findPattern(lines[i]);
      if (found) {
        matches.push({
          file: relative(PROJECT_ROOT, filePath),
          line: i + 1,
          pattern: found,
          content: lines[i].trim(),
        });
      }
    }
  } catch {
    // Skip files that can't be read as UTF-8
  }
  return matches;
}

// Collect files
const srcDir = join(PROJECT_ROOT, 'src');
const astroConfig = join(PROJECT_ROOT, 'astro.config.mjs');

let allFiles = [];
try {
  allFiles = walkDir(srcDir);
} catch {
  console.error('ERROR: Could not scan src/ directory');
  process.exit(1);
}

// Add astro.config.mjs if it exists
try {
  statSync(astroConfig);
  allFiles.push(astroConfig);
} catch {
  /* file not found — skip */
}

// Scan
const allMatches = [];
for (const file of allFiles) {
  const found = scanFile(file);
  allMatches.push(...found);
}

if (allMatches.length === 0) {
  console.log(
    'Generic template scan: CLEAN — no brand-specific strings found.'
  );
  process.exit(0);
}

console.log(`Generic template scan: ${allMatches.length} match(es) found:\n`);
for (const m of allMatches) {
  console.log(`  ${m.file}:${m.line}  [${m.pattern}]  ${m.content}`);
}

console.log('\nGeneric template scan FAILED');
process.exit(1);
