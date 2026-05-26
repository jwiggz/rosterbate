const fs = require('node:fs');
const path = require('node:path');

const SAVE_ENDPOINT_PATH = '/.rosterbate/portrait-assets/save';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_BODY_BYTES = 12 * 1024 * 1024;

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value) {
  return String(value || 'player')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'player';
}

function playerFromPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  return {
    id: String(source.id || source.playerId || source.nbaId || '').trim(),
    name: String(source.name || source.playerName || source.fullName || 'Player').trim(),
    team: String(source.team || source.teamCode || source.abbr || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
    pos: String(source.pos || source.position || source.primaryPosition || '').trim().toUpperCase()
  };
}

function buildAssetPath(player) {
  const source = playerFromPayload(player);
  const teamSuffix = source.team ? `__${source.team}` : '';
  return `assets/player-portraits/${slugify(source.name)}${teamSuffix}.png`;
}

function manifestKey(player) {
  const source = playerFromPayload(player);
  if (source.name && source.team) return `${source.name}|${source.team}`;
  if (source.id) return `id:${normalize(source.id)}`;
  return source.name || 'Player';
}

function normalizeAssetPath(assetPath, player) {
  const raw = String(assetPath || buildAssetPath(player)).trim().replace(/\\/g, '/');
  const clean = raw.replace(/^\/+/, '');
  if (!clean.startsWith('assets/player-portraits/')) {
    throw new Error('Portrait asset path must stay inside assets/player-portraits/');
  }
  const ext = path.extname(clean).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) {
    throw new Error('Portrait asset path must end in .png, .jpg, .jpeg, or .webp');
  }
  return clean;
}

function assertInsideRoot(root, target) {
  const relative = path.relative(root, target);
  if (relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative))) return;
  throw new Error('Resolved portrait asset path escaped the project root');
}

function assertInsideDirectory(directory, target) {
  const relative = path.relative(directory, target);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return;
  throw new Error('Resolved portrait asset path escaped assets/player-portraits/');
}

function decodeImageDataUrl(dataUrl) {
  const source = String(dataUrl || '').trim();
  const match = source.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new Error('Expected a PNG, JPEG, or WebP data URL');
  return Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return { '$schema': 'rosterbate-player-portrait-manifest-v1', players: {} };
  }
  const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8') || '{}');
  if (!parsed.players || Array.isArray(parsed.players) || typeof parsed.players !== 'object') parsed.players = {};
  return parsed;
}

function savePortraitAsset(payload = {}) {
  const root = path.resolve(payload.root || path.join(__dirname, '..'));
  const player = playerFromPayload(payload.player || payload);
  const assetPath = normalizeAssetPath(payload.assetPath, player);
  const absoluteAssetPath = path.resolve(root, assetPath);
  assertInsideRoot(root, absoluteAssetPath);
  const portraitDir = path.resolve(root, 'assets', 'player-portraits');
  assertInsideDirectory(portraitDir, absoluteAssetPath);
  const manifestPath = path.join(portraitDir, 'manifest.json');
  fs.mkdirSync(path.dirname(absoluteAssetPath), { recursive: true });
  fs.writeFileSync(absoluteAssetPath, decodeImageDataUrl(payload.imageDataUrl || payload.dataUrl));

  const manifest = readManifest(manifestPath);
  const key = manifestKey(player);
  manifest.players[key] = assetPath;
  manifest.players = Object.fromEntries(Object.entries(manifest.players).sort(([a], [b]) => a.localeCompare(b)));
  fs.mkdirSync(portraitDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    ok: true,
    assetPath,
    manifestEntry: { [key]: assetPath },
    manifestPath: path.relative(root, manifestPath).replace(/\\/g, '/')
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function writeJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function createPortraitAssetHandler(options = {}) {
  return async function handlePortraitAsset(req, res) {
    if (req.method === 'OPTIONS') {
      writeJson(res, 204, {});
      return;
    }
    if (req.method !== 'POST') {
      writeJson(res, 405, { ok: false, error: 'Use POST to save portrait assets.' });
      return;
    }
    try {
      const rawBody = await readBody(req);
      const payload = JSON.parse(rawBody || '{}');
      const result = savePortraitAsset({ ...payload, root: options.root });
      writeJson(res, 200, result);
    } catch (error) {
      writeJson(res, 400, { ok: false, error: String(error?.message || error) });
    }
  };
}

module.exports = {
  SAVE_ENDPOINT_PATH,
  buildAssetPath,
  createPortraitAssetHandler,
  manifestKey,
  savePortraitAsset
};
