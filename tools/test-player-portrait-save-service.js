const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const {
  SAVE_ENDPOINT_PATH,
  createPortraitAssetHandler,
  savePortraitAsset
} = require('./player-portrait-save-service');

const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

(async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-portrait-save-'));
  const portraitDir = path.join(root, 'assets', 'player-portraits');
  fs.mkdirSync(portraitDir, { recursive: true });
  fs.writeFileSync(path.join(portraitDir, 'manifest.json'), JSON.stringify({
    '$schema': 'rosterbate-player-portrait-manifest-v1',
    players: {
      'Tyrese Maxey': 'assets/player-portraits/tyrese-maxey-1630178.jpg'
    }
  }, null, 2));

  const result = savePortraitAsset({
    root,
    player: { name: 'LeBron James', team: 'LAL', id: '987001' },
    imageDataUrl: tinyPng
  });

  assert.equal(result.assetPath, 'assets/player-portraits/lebron-james__LAL.png');
  assert.deepEqual(result.manifestEntry, {
    'LeBron James|LAL': 'assets/player-portraits/lebron-james__LAL.png'
  });
  assert.equal(fs.existsSync(path.join(root, result.assetPath)), true, 'save should write the portrait file');
  const manifest = JSON.parse(fs.readFileSync(path.join(portraitDir, 'manifest.json'), 'utf8'));
  assert.equal(
    manifest.players['LeBron James|LAL'],
    'assets/player-portraits/lebron-james__LAL.png',
    'save should update the portrait manifest'
  );
  assert.equal(
    manifest.players['Tyrese Maxey'],
    'assets/player-portraits/tyrese-maxey-1630178.jpg',
    'save should preserve existing portrait entries'
  );

  assert.throws(
    () => savePortraitAsset({
      root,
      player: { name: 'Bad Path', team: 'TST' },
      assetPath: '../bad.png',
      imageDataUrl: tinyPng
    }),
    /assets\/player-portraits/,
    'save should reject paths outside the portrait asset directory'
  );
  assert.throws(
    () => savePortraitAsset({
      root,
      player: { name: 'Sneaky Path', team: 'TST' },
      assetPath: 'assets/player-portraits/../../sneaky.png',
      imageDataUrl: tinyPng
    }),
    /escaped assets\/player-portraits/,
    'save should reject traversal that leaves the portrait directory while staying inside the project'
  );

  const server = http.createServer(createPortraitAssetHandler({ root }));
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}${SAVE_ENDPOINT_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: { name: 'Amen Thompson', team: 'HOU' },
        imageDataUrl: tinyPng
      })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.assetPath, 'assets/player-portraits/amen-thompson__HOU.png');
    assert.deepEqual(body.manifestEntry, {
      'Amen Thompson|HOU': 'assets/player-portraits/amen-thompson__HOU.png'
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('test-player-portrait-save-service passed');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
