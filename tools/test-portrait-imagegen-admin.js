const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const helperPath = path.join(root, 'portrait-manifest-dev.html');
const functionPath = path.join(root, 'netlify', 'functions', 'generate-player-portrait.js');
const localServerPath = path.join(root, 'tools', 'serve-portrait-generator-function.js');
const packagePath = path.join(root, 'package.json');

const html = fs.readFileSync(helperPath, 'utf8');
assert.match(html, /id="ai-portrait-prompt"/, 'dev helper should expose an AI portrait prompt');
assert.match(html, /id="ai-portrait-endpoint"/, 'dev helper should expose the Netlify function endpoint');
assert.match(html, /id="generate-ai-portrait"/, 'dev helper should include a generate action');
assert.match(html, /id="use-ai-portrait"/, 'dev helper should let generated images feed the portrait URL field');
assert.match(html, /buildAiPortraitPrompt/, 'dev helper should build a project-specific portrait prompt');
assert.match(html, /requestAiPortrait/, 'dev helper should call the backend portrait generator');
assert.match(html, /generate-player-portrait/, 'dev helper should point at the admin-only generation endpoint');
assert.match(html, /portraits:imagegen-dev/, 'dev helper should mention the local function server command');
assert.match(html, /Local function server is not running/, 'dev helper should give a clear local server recovery hint');
assert.doesNotMatch(html, /OPENAI_API_KEY/, 'browser helper should not mention or expose the OpenAI API key');

assert.equal(fs.existsSync(functionPath), true, 'Netlify portrait generation function should exist');
assert.equal(fs.existsSync(localServerPath), true, 'local portrait generation function server should exist');
const source = fs.readFileSync(functionPath, 'utf8');
assert.match(source, /process\.env\.OPENAI_API_KEY/, 'function should read OPENAI_API_KEY only on the server');
assert.match(source, /PORTRAIT_ADMIN_TOKEN/, 'function should support an admin token guard');
assert.match(source, /https:\/\/api\.openai\.com\/v1\/images\/generations/, 'function should call the official Images API generation endpoint');
assert.match(source, /b64_json/, 'function should return base64 image data');
assert.doesNotMatch(source, /require\(["']openai["']\)/, 'function should avoid adding a new SDK dependency');

const localServerSource = fs.readFileSync(localServerPath, 'utf8');
assert.match(localServerSource, /generate-player-portrait/, 'local function server should route portrait generation requests');
assert.match(localServerSource, /8888/, 'local function server should default to port 8888');
assert.match(localServerSource, /\.env\.local/, 'local function server should support ignored local env files');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(
  pkg.scripts['portraits:imagegen-dev'],
  'node tools/serve-portrait-generator-function.js',
  'package.json should expose a local portrait generation function server'
);

const { handler } = require(functionPath);

async function call(event, env = {}, fetchImpl = null) {
  const previous = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PORTRAIT_ADMIN_TOKEN: process.env.PORTRAIT_ADMIN_TOKEN,
    OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL
  };
  Object.keys(previous).forEach((key) => delete process.env[key]);
  Object.assign(process.env, env);
  const priorFetch = global.fetch;
  if (fetchImpl) global.fetch = fetchImpl;
  try {
    return await handler({
      httpMethod: 'POST',
      headers: { host: '127.0.0.1:8888' },
      body: JSON.stringify({
        player: { id: 987001, name: 'Generic Prospect', team: 'TST', pos: 'SF' },
        prompt: 'Create a RosterBate portrait card for Generic Prospect.',
        assetPath: 'assets/player-portraits/generic-prospect.png'
      }),
      ...event
    });
  } finally {
    global.fetch = priorFetch;
    Object.keys(previous).forEach((key) => {
      if (previous[key] == null) delete process.env[key];
      else process.env[key] = previous[key];
    });
  }
}

(async function main() {
  const missingKey = await call();
  assert.equal(missingKey.statusCode, 503, 'function should fail closed when OPENAI_API_KEY is missing');
  assert.match(missingKey.body, /OPENAI_API_KEY/, 'missing-key response should tell the admin what is missing');

  const liveWithoutToken = await call({
    headers: { host: 'rosterbate.net' }
  }, { OPENAI_API_KEY: 'sk-test' });
  assert.equal(liveWithoutToken.statusCode, 503, 'live function should require PORTRAIT_ADMIN_TOKEN to be configured');

  const wrongToken = await call({
    headers: { host: 'rosterbate.net', 'x-rosterbate-admin-token': 'wrong' }
  }, { OPENAI_API_KEY: 'sk-test', PORTRAIT_ADMIN_TOKEN: 'secret' });
  assert.equal(wrongToken.statusCode, 401, 'function should reject an invalid admin token');

  let fetchPayload = null;
  const success = await call({
    headers: { host: 'rosterbate.net', 'x-rosterbate-admin-token': 'secret' }
  }, { OPENAI_API_KEY: 'sk-test', PORTRAIT_ADMIN_TOKEN: 'secret' }, async (url, options) => {
    fetchPayload = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ b64_json: Buffer.from('fake-png').toString('base64') }],
        usage: { total_tokens: 42 }
      })
    };
  });
  assert.equal(success.statusCode, 200, 'function should return successful generation payloads');
  const body = JSON.parse(success.body);
  assert.equal(body.assetPath, 'assets/player-portraits/generic-prospect.png');
  assert.match(body.imageDataUrl, /^data:image\/png;base64,/, 'function should wrap base64 data as a PNG data URL');
  assert.deepEqual(body.manifestEntry, {
    'id:987001': 'assets/player-portraits/generic-prospect.png'
  });
  assert.equal(fetchPayload.url, 'https://api.openai.com/v1/images/generations');
  const requestBody = JSON.parse(fetchPayload.options.body);
  assert.equal(requestBody.model, 'gpt-image-1.5');
  assert.equal(requestBody.size, '1024x1536');
  assert.match(requestBody.prompt, /Generic Prospect/);
  assert.match(fetchPayload.options.headers.Authorization, /^Bearer sk-test$/);

  console.log('test-portrait-imagegen-admin passed');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
