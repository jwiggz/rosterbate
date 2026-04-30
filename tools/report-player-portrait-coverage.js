#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SOURCE = path.join(__dirname, '..', 'Nba500.csv');
const DEFAULT_MANIFEST = path.join(__dirname, '..', 'assets', 'player-portraits', 'manifest.json');

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    manifest: DEFAULT_MANIFEST,
    limit: 40,
    json: false,
    missingOnly: false
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--source') args.source = path.resolve(argv[++index]);
    else if (arg.startsWith('--source=')) args.source = path.resolve(arg.slice('--source='.length));
    else if (arg === '--manifest') args.manifest = path.resolve(argv[++index]);
    else if (arg.startsWith('--manifest=')) args.manifest = path.resolve(arg.slice('--manifest='.length));
    else if (arg === '--limit') args.limit = Math.max(1, Number(argv[++index]) || args.limit);
    else if (arg.startsWith('--limit=')) args.limit = Math.max(1, Number(arg.slice('--limit='.length)) || args.limit);
    else if (arg === '--json') args.json = true;
    else if (arg === '--missing-only') args.missingOnly = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function usage() {
  return [
    'Usage: node tools/report-player-portrait-coverage.js [--limit N] [--json] [--missing-only]',
    '',
    'Reports manifest coverage for ranked player sources such as Nba500.csv.',
    '',
    'Options:',
    '  --source FILE       CSV with RANK,PLAYER,TEAM columns',
    '  --manifest FILE     portrait manifest to inspect',
    '  --limit N           ranked players to inspect',
    '  --missing-only      only print players without real manifest art',
    '  --json              print machine-readable JSON'
  ].join('\n');
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function readRankedPlayers(sourcePath) {
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toUpperCase());
  const rankIndex = headers.indexOf('RANK');
  const nameIndex = headers.indexOf('PLAYER');
  const teamIndex = headers.indexOf('TEAM');
  if (nameIndex < 0) throw new Error(`Missing PLAYER column in ${sourcePath}`);
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    const rank = Number(rankIndex >= 0 ? cells[rankIndex] : index + 1);
    return {
      rank: Number.isFinite(rank) ? rank : index + 1,
      name: String(cells[nameIndex] || '').trim(),
      team: teamIndex >= 0 ? String(cells[teamIndex] || '').trim().toUpperCase() : ''
    };
  }).filter((player) => player.name);
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return {};
  const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8') || '{}');
  if (!parsed || typeof parsed !== 'object') return {};
  const players = parsed.players || parsed.portraits || parsed;
  if (Array.isArray(players)) {
    return players.reduce((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const url = String(entry.url || entry.src || entry.portraitUrl || entry.imageUrl || '').trim();
      const name = String(entry.name || entry.playerName || entry.fullName || '').trim();
      const team = String(entry.team || entry.teamCode || entry.abbr || '').trim().toUpperCase();
      if (!url || !name) return acc;
      acc[team ? `${name}|${team}` : name] = url;
      return acc;
    }, {});
  }
  return players && typeof players === 'object' ? players : {};
}

function hasPortrait(manifestPlayers, player) {
  const exactKey = `${player.name}|${player.team}`;
  return Boolean(manifestPlayers[exactKey] || manifestPlayers[player.name]);
}

function buildCoverageReport(options = {}) {
  const source = options.source || DEFAULT_SOURCE;
  const manifest = options.manifest || DEFAULT_MANIFEST;
  const limit = Math.max(1, Number(options.limit || 40));
  const rankedPlayers = readRankedPlayers(source).slice(0, limit);
  const manifestPlayers = readManifest(manifest);
  const rows = rankedPlayers.map((player) => ({
    ...player,
    covered: hasPortrait(manifestPlayers, player),
    key: `${player.name}|${player.team}`
  }));
  const covered = rows.filter((row) => row.covered).length;
  return {
    source,
    manifest,
    limit,
    covered,
    missing: rows.length - covered,
    coveragePct: rows.length ? Math.round((covered / rows.length) * 1000) / 10 : 0,
    rows
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }
  const report = buildCoverageReport(args);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }
  console.log(`Portrait coverage: ${report.covered}/${report.limit} (${report.coveragePct}%)`);
  console.log(`Source: ${path.relative(process.cwd(), report.source) || report.source}`);
  console.log(`Manifest: ${path.relative(process.cwd(), report.manifest) || report.manifest}`);
  const rows = args.missingOnly ? report.rows.filter((row) => !row.covered) : report.rows;
  rows.forEach((row) => {
    const mark = row.covered ? 'OK ' : 'MISS';
    console.log(`${mark} #${String(row.rank).padStart(3, ' ')} ${row.name} (${row.team || '--'})`);
  });
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
  buildCoverageReport,
  hasPortrait,
  parseCsvLine,
  readRankedPlayers
};
