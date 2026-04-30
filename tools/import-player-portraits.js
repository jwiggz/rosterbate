#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const { buildManifest } = require('./build-player-portrait-manifest');
const { buildCoverageReport } = require('./report-player-portrait-coverage');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);
const DEFAULT_DIR = path.join(__dirname, '..', 'assets', 'player-portraits');
const DEFAULT_MANIFEST = path.join(DEFAULT_DIR, 'manifest.json');

function parseArgs(argv) {
  const args = {
    sources: [],
    dir: DEFAULT_DIR,
    manifest: DEFAULT_MANIFEST,
    force: false,
    dryRun: false,
    coverage: 40
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--from') args.sources.push(path.resolve(argv[++index]));
    else if (arg.startsWith('--from=')) args.sources.push(path.resolve(arg.slice('--from='.length)));
    else if (arg === '--dir') args.dir = path.resolve(argv[++index]);
    else if (arg.startsWith('--dir=')) args.dir = path.resolve(arg.slice('--dir='.length));
    else if (arg === '--manifest') args.manifest = path.resolve(argv[++index]);
    else if (arg.startsWith('--manifest=')) args.manifest = path.resolve(arg.slice('--manifest='.length));
    else if (arg === '--force') args.force = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--coverage') args.coverage = Math.max(0, Number(argv[++index]) || 0);
    else if (arg.startsWith('--coverage=')) args.coverage = Math.max(0, Number(arg.slice('--coverage='.length)) || 0);
    else if (arg === '--no-coverage') args.coverage = 0;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else args.sources.push(path.resolve(arg));
  }
  if (args.dir !== DEFAULT_DIR && args.manifest === DEFAULT_MANIFEST) {
    args.manifest = path.join(args.dir, 'manifest.json');
  }
  return args;
}

function usage() {
  return [
    'Usage: node tools/import-player-portraits.js --from FILE_OR_DIR [--from MORE] [--dry-run]',
    '',
    'Copies portrait images into assets/player-portraits, updates manifest.json, and reports coverage.',
    '',
    'Examples:',
    '  npm run portraits:import -- --from "%USERPROFILE%\\Downloads\\luka-doncic-1629029.webp"',
    '  npm run portraits:import -- --from "%USERPROFILE%\\Downloads\\portrait-batch"',
    '',
    'Options:',
    '  --from PATH       File or folder to import from',
    '  --dir DIR         Destination portrait folder',
    '  --force           Replace existing files with the same name',
    '  --dry-run         Show what would copy without writing files',
    '  --coverage N      Print top-N portrait coverage after import',
    '  --no-coverage     Skip coverage output'
  ].join('\n');
}

function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function collectImageFiles(sources) {
  const files = [];
  for (const source of sources) {
    if (!fs.existsSync(source)) continue;
    const stat = fs.statSync(source);
    if (stat.isFile() && isImageFile(source)) {
      files.push(source);
    } else if (stat.isDirectory()) {
      fs.readdirSync(source, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(source, entry.name))
        .filter(isImageFile)
        .forEach((filePath) => files.push(filePath));
    }
  }
  return Array.from(new Set(files));
}

function importPortraits(options = {}) {
  const sources = options.sources || [];
  const dir = options.dir || DEFAULT_DIR;
  const manifest = options.manifest || path.join(dir, 'manifest.json');
  const imageFiles = collectImageFiles(sources);
  const copied = [];
  const skipped = [];

  if (!options.dryRun) fs.mkdirSync(dir, { recursive: true });

  imageFiles.forEach((source) => {
    const target = path.join(dir, path.basename(source));
    const samePath = path.resolve(source).toLowerCase() === path.resolve(target).toLowerCase();
    const exists = fs.existsSync(target);
    if (samePath) {
      skipped.push({ source, target, reason: 'already-in-destination' });
      return;
    }
    if (exists && !options.force) {
      skipped.push({ source, target, reason: 'exists' });
      return;
    }
    if (!options.dryRun) fs.copyFileSync(source, target);
    copied.push({ source, target, replaced: exists });
  });

  const manifestResult = buildManifest({ dir, manifest, force: false });
  if (!options.dryRun && manifestResult.changed) {
    fs.writeFileSync(manifestResult.manifestPath, manifestResult.content);
  }

  const coverageLimit = Math.max(0, Number(options.coverage || 0));
  const coverage = coverageLimit
    ? buildCoverageReport({ manifest, limit: coverageLimit })
    : null;

  return {
    sources,
    dir,
    manifest,
    discovered: imageFiles.length,
    copied,
    skipped,
    manifestChanged: manifestResult.changed,
    manifestWritten: Boolean(!options.dryRun && manifestResult.changed),
    coverage
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }
  if (!args.sources.length) {
    console.error(usage());
    return 1;
  }
  const result = importPortraits(args);
  console.log(`Portrait import: ${result.copied.length} copied, ${result.skipped.length} skipped (${result.discovered} image candidate${result.discovered === 1 ? '' : 's'}).`);
  result.copied.forEach((entry) => {
    const action = entry.replaced ? 'REPLACED' : 'COPIED ';
    console.log(`${action} ${path.basename(entry.source)}`);
  });
  result.skipped.forEach((entry) => {
    console.log(`SKIP   ${path.basename(entry.source)} (${entry.reason})`);
  });
  console.log(result.manifestChanged
    ? (result.manifestWritten ? 'Manifest updated.' : 'Manifest would change.')
    : 'Manifest is already current.');
  if (result.coverage) {
    console.log(`Portrait coverage: ${result.coverage.covered}/${result.coverage.limit} (${result.coverage.coveragePct}%)`);
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

module.exports = {
  collectImageFiles,
  importPortraits,
  isImageFile
};
