#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 8888);
const FUNCTION_PATH = '/.netlify/functions/generate-player-portrait';
const {
  SAVE_ENDPOINT_PATH,
  createPortraitAssetHandler
} = require('./player-portrait-save-service');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnvFile(path.join(ROOT, '.env.local'));
loadEnvFile(path.join(ROOT, '.env'));

const { handler } = require(path.join(ROOT, 'netlify', 'functions', 'generate-player-portrait.js'));
const portraitAssetHandler = createPortraitAssetHandler({ root: ROOT });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 128 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function serve(req, res) {
  if (req.url && req.url.split('?')[0] === SAVE_ENDPOINT_PATH) {
    await portraitAssetHandler(req, res);
    return;
  }

  if (req.url && req.url.split('?')[0] === FUNCTION_PATH) {
    try {
      const body = req.method === 'POST' ? await readBody(req) : '';
      const result = await handler({
        httpMethod: req.method,
        headers: req.headers,
        body
      });
      Object.entries(result.headers || {}).forEach(([key, value]) => res.setHeader(key, value));
      res.statusCode = result.statusCode || 200;
      res.end(result.body || '');
    } catch (error) {
      res.writeHead(500, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ error: String(error?.message || error) }));
    }
    return;
  }

  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({
    ok: true,
    endpoint: FUNCTION_PATH,
    assetSaveEndpoint: SAVE_ENDPOINT_PATH,
    openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY)
  }));
}

const server = http.createServer(serve);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Portrait generator function server listening on http://127.0.0.1:${PORT}${FUNCTION_PATH}`);
  console.log(`Portrait asset save endpoint listening on http://127.0.0.1:${PORT}${SAVE_ENDPOINT_PATH}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY is not set. Requests will return a JSON setup error instead of a browser CORS failure.');
  }
});
