#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);
const DEFAULT_DIR = path.join(__dirname, '..', 'assets', 'player-portraits');
const DEFAULT_MANIFEST = path.join(DEFAULT_DIR, 'manifest.json');

function parseArgs(argv) {
  const args = {
    dir: DEFAULT_DIR,
    manifest: DEFAULT_MANIFEST,
    write: false,
    check: false,
    force: false,
    json: false
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--write') args.write = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--dir') args.dir = path.resolve(argv[++index]);
    else if (arg.startsWith('--dir=')) args.dir = path.resolve(arg.slice('--dir='.length));
    else if (arg === '--manifest') args.manifest = path.resolve(argv[++index]);
    else if (arg.startsWith('--manifest=')) args.manifest = path.resolve(arg.slice('--manifest='.length));
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  if (args.dir !== DEFAULT_DIR && args.manifest === DEFAULT_MANIFEST) {
    args.manifest = path.join(args.dir, 'manifest.json');
  }
  return args;
}

function usage() {
  return [
    'Usage: node tools/build-player-portrait-manifest.js [--write] [--check] [--dir DIR] [--manifest FILE]',
    '',
    'Filename convention:',
    '  michael-jordan__CHI.png -> "Michael Jordan|CHI"',
    '  nikola-jokic.png        -> "Nikola Jokic"',
    '',
    'Options:',
    '  --write   Update manifest.json',
    '  --check   Exit non-zero if the manifest is missing discovered images',
    '  --force   Replace existing entries when discovered filenames collide',
    '  --json    Print summary as JSON'
  ].join('\n');
}

function titleFromSlug(slug) {
  return String(slug || '')
    .replace(/[-_]\d{5,}$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (['ii', 'iii', 'iv', 'jr', 'sr'].includes(lower)) return lower.toUpperCase().replace(/^JR$/, 'Jr.').replace(/^SR$/, 'Sr.');
      if (lower === 'mc') return 'Mc';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function entryFromFilename(fileName, relativePath) {
  const ext = path.extname(fileName).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return null;
  const base = path.basename(fileName, ext);
  const parts = base.split('__');
  const name = titleFromSlug(parts[0]);
  if (!name) return null;
  const team = parts[1] ? String(parts[1]).trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  return {
    key: team ? `${name}|${team}` : name,
    url: relativePath.replace(/\\/g, '/')
  };
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return { '$schema': 'rosterbate-player-portrait-manifest-v1', players: {} };
  }
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  if (!parsed || typeof parsed !== 'object') return { '$schema': 'rosterbate-player-portrait-manifest-v1', players: {} };
  if (!parsed.players || Array.isArray(parsed.players) || typeof parsed.players !== 'object') parsed.players = {};
  return parsed;
}

function discoverPortraits(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const relativePath = path.posix.join('assets/player-portraits', entry.name);
      return entryFromFilename(entry.name, relativePath);
    })
    .filter(Boolean)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function buildManifest(options = {}) {
  const dir = options.dir || DEFAULT_DIR;
  const manifestPath = options.manifest || path.join(dir, 'manifest.json');
  const manifest = readManifest(manifestPath);
  const before = JSON.stringify(manifest.players || {});
  const discovered = discoverPortraits(dir);
  const added = [];
  const kept = [];
  const replaced = [];
  const players = { ...(manifest.players || {}) };
  for (const entry of discovered) {
    if (players[entry.key] && !options.force) {
      kept.push(entry.key);
      continue;
    }
    if (players[entry.key] && options.force) replaced.push(entry.key);
    else added.push(entry.key);
    players[entry.key] = entry.url;
  }
  manifest.players = Object.fromEntries(Object.entries(players).sort(([a], [b]) => a.localeCompare(b)));
  const content = `${JSON.stringify(manifest, null, 2)}\n`;
  const changed = before !== JSON.stringify(manifest.players || {});
  return { manifest, content, changed, discovered, added, kept, replaced, manifestPath };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }
  const result = buildManifest(args);
  if (args.write && result.changed) {
    fs.mkdirSync(path.dirname(result.manifestPath), { recursive: true });
    fs.writeFileSync(result.manifestPath, result.content);
  }
  const summary = {
    manifest: path.relative(process.cwd(), result.manifestPath) || result.manifestPath,
    discovered: result.discovered.length,
    added: result.added.length,
    kept: result.kept.length,
    replaced: result.replaced.length,
    changed: result.changed,
    written: !!(args.write && result.changed)
  };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`Portrait manifest: ${summary.manifest}`);
    console.log(`Discovered ${summary.discovered} image(s), added ${summary.added}, kept ${summary.kept}, replaced ${summary.replaced}.`);
    console.log(summary.changed ? (summary.written ? 'Manifest updated.' : 'Manifest would change. Run with --write to update.') : 'Manifest is already current.');
  }
  if (args.check && result.changed) return 1;
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  buildManifest,
  discoverPortraits,
  entryFromFilename,
  titleFromSlug
};
