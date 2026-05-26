const IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const DEFAULT_MODEL = 'gpt-image-1.5';
const DEFAULT_SIZE = '1024x1536';
const DEFAULT_QUALITY = 'medium';

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-RosterBate-Admin-Token',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function readHeader(event, name) {
  const headers = event && event.headers ? event.headers : {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function isLocalRequest(event) {
  const host = String(readHeader(event, 'host') || readHeader(event, 'x-forwarded-host') || '').toLowerCase();
  return host.includes('localhost') || host.includes('127.0.0.1') || host.includes('[::1]');
}

function firstFilledValue(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
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

function sanitizePlayer(player) {
  const source = player && typeof player === 'object' ? player : {};
  const name = firstFilledValue(
    source.name,
    source.playerName,
    source.fullName,
    [source.firstName, source.lastName].filter(Boolean).join(' ')
  );
  return {
    id: firstFilledValue(source.id, source.playerId, source.nbaId, source.slug),
    name: name || 'Player',
    team: firstFilledValue(source.team, source.teamCode, source.abbr).toUpperCase(),
    pos: firstFilledValue(source.pos, source.position, source.primaryPosition)
  };
}

function manifestKey(player) {
  if (player.id) return `id:${String(player.id).trim().toLowerCase()}`;
  if (player.name && player.team) return `${player.name}|${player.team}`;
  return player.name || 'Player';
}

function safeAssetPath(value, player) {
  const clean = String(value || '').trim().replace(/\\/g, '/');
  if (/^assets\/player-portraits\/[a-z0-9._/-]+\.(png|webp|jpg|jpeg)$/i.test(clean) && !clean.includes('..')) {
    return clean;
  }
  return `assets/player-portraits/${slugify(player.name)}.png`;
}

function parseBody(event) {
  try {
    return event && event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return null;
  }
}

function buildServerPrompt(prompt, player) {
  const requested = String(prompt || '').trim();
  const base = requested || `Create a RosterBate fantasy basketball portrait card for ${player.name}.`;
  return [
    base,
    '',
    'Hard constraints:',
    '- Create an original stylized basketball player portrait card, not an exact celebrity likeness.',
    '- No NBA, team, sponsor, or league logos.',
    '- No watermark, signature, jersey number text, or extra typography.',
    '- Single player only, centered upper-body composition.',
    '- Premium sports-card lighting, clean edges, suitable for a 512 x 640 portrait crop.',
    player.team ? `- Use ${player.team} only as a small fictional team-code inspiration, not a real logo.` : '',
    player.pos ? `- Position cue: ${player.pos}.` : ''
  ].filter(Boolean).join('\n');
}

exports.handler = async function handler(event) {
  if (event && event.httpMethod === 'OPTIONS') {
    return response(204, {});
  }
  if (!event || event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed. Use POST.' });
  }

  const adminToken = process.env.PORTRAIT_ADMIN_TOKEN || '';
  if (adminToken) {
    const provided = String(readHeader(event, 'x-rosterbate-admin-token') || '');
    if (provided !== adminToken) {
      return response(401, { error: 'Invalid portrait admin token.' });
    }
  } else if (!isLocalRequest(event)) {
    return response(503, { error: 'PORTRAIT_ADMIN_TOKEN must be configured before live portrait generation is enabled.' });
  }

  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    return response(503, { error: 'OPENAI_API_KEY is not configured for server-side portrait generation.' });
  }

  const body = parseBody(event);
  if (!body) {
    return response(400, { error: 'Invalid JSON request body.' });
  }

  const player = sanitizePlayer(body.player);
  const prompt = buildServerPrompt(body.prompt, player);
  if (prompt.length > 32000) {
    return response(400, { error: 'Prompt is too long.' });
  }

  const assetPath = safeAssetPath(body.assetPath, player);
  const model = firstFilledValue(process.env.OPENAI_IMAGE_MODEL, body.model, DEFAULT_MODEL);
  const size = firstFilledValue(body.size, DEFAULT_SIZE);
  const quality = firstFilledValue(body.quality, DEFAULT_QUALITY);

  if (typeof fetch !== 'function') {
    return response(500, { error: 'Server runtime does not provide fetch.' });
  }

  try {
    const openAiResponse = await fetch(IMAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        quality,
        output_format: 'png'
      })
    });
    const json = await openAiResponse.json().catch(() => ({}));
    if (!openAiResponse.ok) {
      return response(openAiResponse.status || 502, {
        error: json?.error?.message || 'Image generation request failed.'
      });
    }
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      return response(502, { error: 'Image generation response did not include b64_json.' });
    }
    return response(200, {
      player,
      assetPath,
      manifestEntry: { [manifestKey(player)]: assetPath },
      imageDataUrl: `data:image/png;base64,${b64}`,
      model,
      size,
      quality,
      usage: json.usage || null
    });
  } catch (error) {
    return response(502, { error: String(error?.message || error) });
  }
};
