#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function parseArgs(argv) {
  const args = {
    file: argv.find((arg) => !arg.startsWith('--')) || 'index.html',
    port: Number(process.env.PORT || 8080),
    open: !argv.includes('--no-open')
  };
  const portArg = argv.find((arg) => arg.startsWith('--port='));
  if (portArg) args.port = Number(portArg.slice('--port='.length));
  return args;
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const clean = decoded === '/' ? '/index.html' : decoded;
  const target = path.resolve(ROOT, `.${clean}`);
  if (!isInsideRoot(target)) return null;
  return target;
}

function isInsideRoot(target) {
  const relative = path.relative(ROOT, target);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function serve(req, res) {
  const filePath = safePath(req.url || '/');
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function openUrl(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(port);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const page = args.file.replace(/\\/g, '/').replace(/^\/+/, '');
  const pagePath = path.resolve(ROOT, page);
  if (!isInsideRoot(pagePath) || !fs.existsSync(pagePath)) {
    console.error(`Page not found: ${page}`);
    process.exitCode = 1;
    return;
  }

  const server = http.createServer(serve);
  let port = args.port;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await listen(server, port);
      break;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || attempt === 19) throw error;
      port += 1;
    }
  }

  const url = `http://127.0.0.1:${port}/${encodeURI(page)}`;
  console.log(url);
  if (args.open) openUrl(url);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
