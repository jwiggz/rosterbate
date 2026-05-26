(function initRosterBatePortraitStudio(global) {
  'use strict';

  const WIDTH = 512;
  const HEIGHT = 512;
  const DEFAULT_SAVE_ENDPOINT = 'http://127.0.0.1:8888/.rosterbate/portrait-assets/save';
  const skinTones = ['#f0c29a', '#c8895f', '#a86f45', '#8b5534', '#6f4129', '#4f2d1f'];
  const hairTones = ['#090909', '#1a100a', '#2b1a12', '#3b2317', '#5c3823'];
  const jerseyTones = ['#f5f5f0', '#101827', '#2563eb', '#ef4444', '#f97316', '#16a34a', '#7c3aed'];
  const promptColorMap = {
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    orange: '#f97316',
    purple: '#7c3aed',
    black: '#101827',
    white: '#f5f5f0',
    yellow: '#facc15'
  };
  const teamPortraitPresets = {
    HOU: {
      code: 'HOU',
      label: 'Houston Rockets',
      aliases: ['HOU', 'ROCKETS', 'HOUSTON', 'HOUSTON ROCKETS'],
      jersey: '#dc2626',
      jerseyDescription: 'Rockets red jersey with white and black trim around the collar and armholes'
    },
    LAL: {
      code: 'LAL',
      label: 'Los Angeles Lakers',
      aliases: ['LAL', 'LAKERS', 'LOS ANGELES LAKERS'],
      jersey: '#facc15',
      jerseyDescription: 'Lakers gold jersey with purple and white trim around the collar and armholes'
    },
    BOS: {
      code: 'BOS',
      label: 'Boston Celtics',
      aliases: ['BOS', 'CELTICS', 'BOSTON CELTICS'],
      jersey: '#16a34a',
      jerseyDescription: 'Celtics green jersey with white trim around the collar and armholes'
    },
    OKC: {
      code: 'OKC',
      label: 'Oklahoma City Thunder',
      aliases: ['OKC', 'THUNDER', 'OKLAHOMA CITY THUNDER'],
      jersey: '#2563eb',
      jerseyDescription: 'Thunder blue jersey with orange and white trim around the collar and armholes'
    },
    PHI: {
      code: 'PHI',
      label: 'Philadelphia 76ers',
      aliases: ['PHI', '76ERS', 'SIXERS', 'PHILADELPHIA 76ERS'],
      jersey: '#2563eb',
      jerseyDescription: 'Philadelphia blue jersey with red and white trim around the collar and armholes'
    }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function hashString(value) {
    const source = String(value || 'Player');
    let hash = 0;
    for (let index = 0; index < source.length; index++) {
      hash = ((hash << 5) - hash) + source.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
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

  function playerFromOptions(options) {
    const source = options?.player || options || {};
    return {
      id: String(source.id || source.playerId || source.nbaId || '').trim(),
      name: String(source.name || source.playerName || source.fullName || 'Generic Prospect').trim(),
      team: String(source.team || source.teamCode || source.abbr || '').trim().toUpperCase(),
      pos: String(source.pos || source.position || source.primaryPosition || '').trim().toUpperCase()
    };
  }

  function buildAssetPath(player) {
    const source = playerFromOptions(player);
    const teamSuffix = source.team ? `__${source.team}` : '';
    return `assets/player-portraits/${slugify(source.name)}${teamSuffix}.png`;
  }

  function manifestKey(player) {
    const source = playerFromOptions(player);
    if (source.name && source.team) return `${source.name}|${source.team}`;
    if (source.id) return `id:${normalize(source.id)}`;
    return source.name || 'Player';
  }

  function buildManifestEntry(player, assetPath) {
    const source = playerFromOptions(player);
    return { [manifestKey(source)]: assetPath || buildAssetPath(source) };
  }

  function labelForSelectValue(value) {
    return String(value || '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getTeamPortraitPreset(team) {
    const key = String(team || '').trim().toUpperCase();
    if (!key) return null;
    if (teamPortraitPresets[key]) return teamPortraitPresets[key];
    return Object.values(teamPortraitPresets).find((preset) => preset.aliases.includes(key)) || null;
  }

  function buildImagegenPrompt(player, options = {}) {
    const source = playerFromOptions(player);
    const settings = avatarSettings(source, options);
    const notes = String(options.notes || '').trim();
    const subject = source.name || 'the player';
    const teamLine = source.team ? ` Team/context: ${source.team}${source.pos ? `, ${source.pos}` : ''}.` : '';
    return [
      `Vector cartoon portrait illustration of ${subject}, head and upper chest visible, three-quarter view facing slightly to the viewer's right.${teamLine}`,
      'Clean flat-color cel-shaded style with bold black outlines of consistent medium weight.',
      'Simplified, friendly facial features with a subtle closed-mouth smile.',
      `Skin rendered in two flat tones: base tone ${settings.skin} plus one slightly darker shadow tone on one side of the face, jaw, and neck; no gradients, no rendering, no texture.`,
      `Hair drawn as solid shapes with clean edges and a single shadow tone. Hair direction: ${labelForSelectValue(settings.hairStyle)}. Facial hair: ${labelForSelectValue(settings.facialHair)}. Hair color: ${settings.hair}.`,
      'Eyes are simplified but expressive with visible irises and small white highlights.',
      `Wearing a basketball jersey rendered in ${settings.jerseyDescription}.`,
      'Jersey has crisp solid-color blocking with no fabric texture or shading detail beyond one subtle shadow tone.',
      'Pure white background, no environment, no shadow beneath subject. Centered composition, portrait crop from mid-chest up. Square 512 x 512 output.',
      'Style references: Tyrese-style flat illustrated avatar, modern vector sports illustration, NBA cartoon avatar, clean commercial portrait illustration.',
      'No realism, no painterly effects, no gradients, no photographic detail.',
      'Negative prompt (if your tool supports it): photorealistic, 3d render, painterly, gradients, textured background, blurry, sketchy lines, multiple subjects, full body, hands, basketball, court, crowd, text, watermark, NBA/team logos, jersey numbers, sponsor marks.',
      notes ? `Extra notes: ${notes}` : ''
    ].filter(Boolean).join('\n');
  }

  function titleCaseName(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b([A-Za-z])([A-Za-z']*)/g, (_, first, rest) => {
        const word = `${first}${rest}`.toLowerCase();
        if (word === 'lebron') return 'LeBron';
        return first.toUpperCase() + rest.toLowerCase();
      });
  }

  function parseImagegenPrompt(prompt) {
    const source = String(prompt || '').trim();
    const text = source.replace(/\s+/g, ' ');
    const lower = text.toLowerCase();
    const parsed = {};
    const subjectMatch =
      text.match(/(?:portrait illustration|illustration|portrait)\s+of\s+([^,.\n]+)/i) ||
      text.match(/\bSubject:\s*([^,.\n]+)/i);
    if (subjectMatch) parsed.name = titleCaseName(subjectMatch[1]);

    const teamMatch = text.match(/\bTeam\/context:\s*([A-Z]{2,5})\b/) || text.match(/\bteam\s+([A-Z]{2,5})\b/);
    if (teamMatch) parsed.team = teamMatch[1].toUpperCase();

    Object.entries(promptColorMap).some(([word, color]) => {
      const jerseyNearColor =
        new RegExp(`\\bjersey\\b[^.]{0,90}\\b${word}\\b`, 'i').test(text) ||
        new RegExp(`\\b${word}\\b[^.]{0,60}\\bjersey\\b`, 'i').test(text);
      if (jerseyNearColor) {
        parsed.jersey = color;
        return true;
      }
      return false;
    });

    if (/\bgoatee\b/.test(lower)) parsed.facialHair = 'goatee';
    else if (/\bmustache\b|\bmoustache\b/.test(lower)) parsed.facialHair = 'mustache';
    else if (/\bbeard\b/.test(lower)) parsed.facialHair = 'beard';
    else if (/\bclean[- ]shaven\b|\bno facial hair\b/.test(lower)) parsed.facialHair = 'none';

    if (/\bshort[- ]?curls?\b|\bsolid shapes\b/.test(lower)) parsed.hairStyle = 'short-curls';
    else if (/\bbraids?\b|\bdreads?\b|\bloc[k|s]s?\b/.test(lower)) parsed.hairStyle = 'braids';
    else if (/\bafro\b/.test(lower)) parsed.hairStyle = 'afro';
    else if (/\bfade\b/.test(lower)) parsed.hairStyle = 'fade';
    else if (/\bwaves?\b/.test(lower)) parsed.hairStyle = 'waves';

    return parsed;
  }

  function parseBatchPlayerLine(line, defaultTeam = '') {
    const source = String(line || '').trim();
    if (!source) return null;
    const parts = source.split(/[|,]/).map((part) => part.trim()).filter(Boolean);
    const player = {
      name: titleCaseName(parts[0]),
      team: String(defaultTeam || '').trim().toUpperCase(),
      pos: ''
    };
    if (parts[1]) {
      if (/^[A-Z]{2,5}$/i.test(parts[1]) && parts[1].length > 1) player.team = parts[1].toUpperCase();
      else player.pos = parts[1].toUpperCase();
    }
    if (parts[2]) player.pos = parts[2].toUpperCase();
    return player.name ? player : null;
  }

  function buildBatchPromptQueue(players, options = {}) {
    const fallbackPreset = getTeamPortraitPreset(options.team || options.teamCode || 'HOU') || teamPortraitPresets.HOU;
    const parsedPlayers = Array.isArray(players)
      ? players.map((player) => playerFromOptions(player))
      : String(players || '').split(/\r?\n|\\n/).map((line) => parseBatchPlayerLine(line, fallbackPreset.code));
    return parsedPlayers
      .filter((player) => player && player.name)
      .map((player, index) => {
        const preset = getTeamPortraitPreset(player.team) || fallbackPreset;
        const queuedPlayer = { ...player, team: preset.code };
        const assetPath = buildAssetPath(queuedPlayer);
        const prompt = buildImagegenPrompt(queuedPlayer, {
          jersey: preset.jersey,
          jerseyDescription: preset.jerseyDescription,
          notes: `Apply the ${preset.label} team preset consistently. Do not use official logos, sponsor marks, or jersey numbers.`
        });
        return {
          index,
          player: queuedPlayer,
          preset,
          assetPath,
          manifestEntry: buildManifestEntry(queuedPlayer, assetPath),
          prompt,
          status: 'needs generation'
        };
      });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function pick(list, seed, fallback) {
    return list.length ? list[seed % list.length] : fallback;
  }

  function avatarSettings(player, options = {}) {
    const seed = hashString(`${player.name}|${player.team}|${player.pos}`) + (Number(options.variation || 0) * 9973);
    return {
      seed,
      skin: options.skin || pick(skinTones, seed, '#a86f45'),
      hair: options.hair || pick(hairTones, Math.floor(seed / 3), '#090909'),
      jersey: options.jersey || options.teamColor || pick(jerseyTones, Math.floor(seed / 5), '#f5f5f0'),
      jerseyDescription: options.jerseyDescription || `flat ${options.jersey || options.teamColor || pick(jerseyTones, Math.floor(seed / 5), '#f5f5f0')} with white and black trim around the collar and armholes`,
      outline: options.outline || '#050505',
      hairStyle: options.hairStyle || pick(['short-curls', 'braids', 'fade', 'waves', 'afro'], Math.floor(seed / 7), 'short-curls'),
      facialHair: options.facialHair || pick(['none', 'mustache', 'goatee', 'beard'], Math.floor(seed / 11), 'goatee'),
      referenceOpacity: clamp(options.referenceOpacity, 0, 45)
    };
  }

  function strokePath(ctx, lineWidth = 5) {
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function fillAndStroke(ctx, fill, lineWidth = 5) {
    ctx.fillStyle = fill;
    ctx.fill();
    strokePath(ctx, lineWidth);
  }

  function ellipsePath(ctx, x, y, radiusX, radiusY, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  }

  function drawReferenceGuide(ctx, image, opacity) {
    if (!image || opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    const scale = Math.max(382 / image.width, 470 / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    ctx.drawImage(image, (WIDTH - drawW) / 2, 22 + (470 - drawH) / 2, drawW, drawH);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function drawShoulders(ctx, settings) {
    ctx.save();
    ctx.translate(0, 0);
    ctx.beginPath();
    ctx.moveTo(75, 512);
    ctx.bezierCurveTo(88, 435, 143, 395, 205, 378);
    ctx.lineTo(224, 432);
    ctx.lineTo(288, 432);
    ctx.lineTo(307, 378);
    ctx.bezierCurveTo(372, 395, 424, 435, 437, 512);
    ctx.closePath();
    fillAndStroke(ctx, settings.skin, 5);

    ctx.beginPath();
    ctx.moveTo(126, 512);
    ctx.lineTo(168, 391);
    ctx.quadraticCurveTo(214, 427, 256, 430);
    ctx.quadraticCurveTo(298, 427, 344, 391);
    ctx.lineTo(386, 512);
    ctx.closePath();
    fillAndStroke(ctx, settings.jersey, 5);

    ctx.beginPath();
    ctx.moveTo(178, 392);
    ctx.quadraticCurveTo(210, 454, 256, 461);
    ctx.quadraticCurveTo(302, 454, 334, 392);
    strokePath(ctx, 5);

    ctx.strokeStyle = 'rgba(5,5,5,.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(142, 454);
    ctx.quadraticCurveTo(122, 480, 118, 512);
    ctx.moveTo(370, 454);
    ctx.quadraticCurveTo(390, 480, 394, 512);
    ctx.stroke();
    ctx.restore();
  }

  function drawNeck(ctx, settings) {
    ctx.beginPath();
    ctx.moveTo(210, 334);
    ctx.lineTo(210, 404);
    ctx.quadraticCurveTo(256, 430, 302, 404);
    ctx.lineTo(302, 334);
    ctx.closePath();
    fillAndStroke(ctx, settings.skin, 5);
  }

  function drawEars(ctx, settings) {
    ellipsePath(ctx, 169, 242, 18, 43, -0.09);
    fillAndStroke(ctx, settings.skin, 4);
    ellipsePath(ctx, 343, 242, 18, 43, 0.09);
    fillAndStroke(ctx, settings.skin, 4);
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(164, 226);
    ctx.quadraticCurveTo(176, 246, 164, 267);
    ctx.moveTo(348, 226);
    ctx.quadraticCurveTo(336, 246, 348, 267);
    ctx.stroke();
  }

  function drawHead(ctx, settings) {
    const widthShift = (settings.seed % 9) - 4;
    const jawShift = (Math.floor(settings.seed / 5) % 9) - 4;
    ctx.beginPath();
    ctx.moveTo(256, 85);
    ctx.bezierCurveTo(197 - widthShift, 85, 168 - widthShift, 132, 170 - widthShift, 218);
    ctx.bezierCurveTo(172 - jawShift, 303, 207 + jawShift, 358, 256, 368);
    ctx.bezierCurveTo(305 - jawShift, 358, 340 + jawShift, 303, 342 + widthShift, 218);
    ctx.bezierCurveTo(344 + widthShift, 132, 315 + widthShift, 85, 256, 85);
    ctx.closePath();
    fillAndStroke(ctx, settings.skin, 5);
  }

  function drawHair(ctx, settings) {
    ctx.fillStyle = settings.hair;
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 5;

    if (settings.hairStyle === 'fade') {
      ctx.beginPath();
      ctx.moveTo(173, 162);
      ctx.bezierCurveTo(184, 95, 218, 65, 256, 66);
      ctx.bezierCurveTo(294, 65, 328, 95, 339, 162);
      ctx.quadraticCurveTo(306, 140, 256, 141);
      ctx.quadraticCurveTo(206, 140, 173, 162);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if (settings.hairStyle === 'waves') {
      ctx.beginPath();
      ctx.moveTo(172, 158);
      ctx.bezierCurveTo(188, 88, 220, 68, 256, 70);
      ctx.bezierCurveTo(292, 68, 324, 88, 340, 158);
      ctx.bezierCurveTo(300, 130, 214, 130, 172, 158);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.lineWidth = 3;
      for (let y = 98; y < 145; y += 14) {
        ctx.beginPath();
        ctx.moveTo(202, y);
        ctx.quadraticCurveTo(256, y - 12, 310, y);
        ctx.stroke();
      }
      return;
    }

    if (settings.hairStyle === 'afro') {
      for (let index = 0; index < 26; index++) {
        const angle = (Math.PI * 2 * index) / 26;
        const x = 256 + Math.cos(angle) * (72 + (index % 4) * 5);
        const y = 140 + Math.sin(angle) * (56 + (index % 3) * 4);
        ctx.beginPath();
        ctx.arc(x, y, 23, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(256, 142, 94, 72, 0, 0, Math.PI * 2);
      ctx.fill();
      strokePath(ctx, 5);
      return;
    }

    if (settings.hairStyle === 'braids') {
      ctx.beginPath();
      ctx.moveTo(175, 156);
      ctx.bezierCurveTo(189, 72, 323, 72, 337, 156);
      ctx.quadraticCurveTo(294, 137, 256, 138);
      ctx.quadraticCurveTo(218, 137, 175, 156);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      for (const braid of [
        [183, 146, 158, 286, 137, 382],
        [205, 126, 186, 276, 176, 402],
        [307, 126, 326, 276, 336, 402],
        [329, 146, 354, 286, 375, 382]
      ]) {
        ctx.beginPath();
        ctx.moveTo(braid[0], braid[1]);
        ctx.bezierCurveTo(braid[0] - 10, braid[1] + 55, braid[2], braid[3], braid[4], braid[5]);
        ctx.strokeStyle = settings.hair;
        ctx.stroke();
        ctx.strokeStyle = '#050505';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 13;
      }
      return;
    }

    ctx.beginPath();
    ctx.moveTo(169, 162);
    ctx.bezierCurveTo(177, 82, 212, 55, 256, 62);
    ctx.bezierCurveTo(300, 55, 335, 82, 343, 162);
    ctx.quadraticCurveTo(300, 136, 256, 138);
    ctx.quadraticCurveTo(212, 136, 169, 162);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let index = 0; index < 18; index++) {
      ctx.beginPath();
      ctx.arc(177 + index * 9.4, 93 + (index % 2) * 9, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFace(ctx, settings) {
    const eyeSpread = (settings.seed % 7) - 3;
    const eyeLift = (Math.floor(settings.seed / 7) % 5) - 2;
    const mouthLift = (Math.floor(settings.seed / 17) % 7) - 3;
    ctx.strokeStyle = '#050505';
    ctx.fillStyle = '#050505';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(205 - eyeSpread, 185 + eyeLift);
    ctx.quadraticCurveTo(224 - eyeSpread, 176 + eyeLift, 244 - eyeSpread, 185 + eyeLift);
    ctx.moveTo(268 + eyeSpread, 185 + eyeLift);
    ctx.quadraticCurveTo(288 + eyeSpread, 176 + eyeLift, 307 + eyeSpread, 185 + eyeLift);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ellipsePath(ctx, 224 - eyeSpread, 218 + eyeLift, 25, 11, -0.04);
    ctx.fill();
    strokePath(ctx, 3);
    ellipsePath(ctx, 288 + eyeSpread, 218 + eyeLift, 25, 11, 0.04);
    ctx.fill();
    strokePath(ctx, 3);

    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(224 - eyeSpread, 218 + eyeLift, 6, 0, Math.PI * 2);
    ctx.arc(288 + eyeSpread, 218 + eyeLift, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(5,5,5,.36)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(207, 240);
    ctx.quadraticCurveTo(196, 260, 205, 280);
    ctx.moveTo(305, 240);
    ctx.quadraticCurveTo(316, 260, 307, 280);
    ctx.stroke();

    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(258, 232);
    ctx.quadraticCurveTo(247, 261, 238, 281);
    ctx.quadraticCurveTo(256, 288, 274, 281);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(222, 312 + mouthLift);
    ctx.quadraticCurveTo(256, 327 + mouthLift, 290, 312 + mouthLift);
    ctx.stroke();

    if (settings.facialHair === 'mustache' || settings.facialHair === 'goatee' || settings.facialHair === 'beard') {
      ctx.fillStyle = settings.hair;
      ctx.beginPath();
      ctx.moveTo(215, 296);
      ctx.quadraticCurveTo(236, 284, 254, 296);
      ctx.quadraticCurveTo(232, 301, 215, 296);
      ctx.moveTo(257, 296);
      ctx.quadraticCurveTo(276, 284, 297, 296);
      ctx.quadraticCurveTo(280, 301, 257, 296);
      ctx.fill();
    }

    if (settings.facialHair === 'goatee' || settings.facialHair === 'beard') {
      ctx.fillStyle = settings.hair;
      ctx.beginPath();
      ctx.moveTo(230, 335);
      ctx.quadraticCurveTo(256, 350, 282, 335);
      ctx.quadraticCurveTo(277, 372, 256, 384);
      ctx.quadraticCurveTo(235, 372, 230, 335);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (settings.facialHair === 'beard') {
      ctx.fillStyle = settings.hair;
      ctx.beginPath();
      ctx.moveTo(194, 286);
      ctx.quadraticCurveTo(204, 354, 256, 392);
      ctx.quadraticCurveTo(308, 354, 318, 286);
      ctx.quadraticCurveTo(296, 346, 256, 357);
      ctx.quadraticCurveTo(216, 346, 194, 286);
      ctx.fill();
    }
  }

  function drawNeckLines(ctx) {
    ctx.strokeStyle = 'rgba(5,5,5,.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(220, 409);
    ctx.quadraticCurveTo(236, 426, 256, 425);
    ctx.quadraticCurveTo(276, 426, 292, 409);
    ctx.moveTo(188, 423);
    ctx.quadraticCurveTo(208, 440, 232, 444);
    ctx.moveTo(324, 423);
    ctx.quadraticCurveTo(304, 440, 280, 444);
    ctx.stroke();
  }

  function drawTinySignature(ctx, player) {
    const initials = String(player.team || player.pos || 'RB').slice(0, 3).toUpperCase();
    ctx.fillStyle = 'rgba(5,5,5,.48)';
    ctx.font = '900 17px "Arial Narrow", "Bahnschrift", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(initials, 492, 492);
  }

  function renderAvatarToCanvas(canvas, options = {}) {
    if (!canvas) throw new Error('Canvas is required');
    const ctx = canvas.getContext('2d');
    const player = playerFromOptions(options.player || options);
    const settings = avatarSettings(player, options);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawReferenceGuide(ctx, options.photoImage, settings.referenceOpacity);
    drawShoulders(ctx, settings);
    drawNeck(ctx, settings);
    drawEars(ctx, settings);
    drawHead(ctx, settings);
    drawHair(ctx, settings);
    drawFace(ctx, settings);
    drawNeckLines(ctx);
    drawTinySignature(ctx, player);

    canvas.dataset.rendered = 'true';
    canvas.dataset.style = 'Tyrese-style flat illustrated avatar';
    return canvas;
  }

  function renderPortraitToCanvas(canvas, options = {}) {
    return renderAvatarToCanvas(canvas, options);
  }

  function renderImportedImageToCanvas(canvas, image) {
    const ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const scale = Math.min(WIDTH / image.width, HEIGHT / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    ctx.drawImage(image, (WIDTH - drawW) / 2, (HEIGHT - drawH) / 2, drawW, drawH);
    canvas.dataset.rendered = 'true';
    canvas.dataset.style = 'Imported Codex Imagegen v2 portrait';
    return canvas;
  }

  function exportPngDataUrl(canvas) {
    return canvas.toDataURL('image/png');
  }

  function copyText(value) {
    if (global.navigator?.clipboard?.writeText) return global.navigator.clipboard.writeText(value);
    const area = global.document.createElement('textarea');
    area.value = value;
    global.document.body.appendChild(area);
    area.select();
    global.document.execCommand('copy');
    area.remove();
    return Promise.resolve();
  }

  function createPortraitStudio(root, options = {}) {
    const mount = typeof root === 'string' ? global.document.querySelector(root) : root;
    if (!mount) throw new Error('Portrait studio mount not found');
    const initial = playerFromOptions(options.player || { name: 'Generic Prospect', team: 'TST', id: '987001', pos: 'SF' });
    mount.innerHTML = `
      <div class="rb-portrait-studio">
        <div class="studio-copy">
          <h2>Tyrese-style Avatar Maker</h2>
          <p>No API key. No paid generation in this page. Build a local draft, copy a Codex Imagegen v2 prompt, then import the finished PNG back into the manifest workflow.</p>
        </div>
        <div class="studio-grid">
          <div class="studio-controls">
            <label>Player<input id="studio-player-name" type="text" value="${escapeHtml(initial.name)}"></label>
            <div class="studio-inline">
              <label>Team<input id="studio-team" type="text" value="${escapeHtml(initial.team)}" maxlength="5"></label>
              <label>ID<input id="studio-player-id" type="text" value="${escapeHtml(initial.id)}"></label>
              <label>Pos<input id="studio-position" type="text" value="${escapeHtml(initial.pos)}" maxlength="5"></label>
            </div>
            <div class="studio-inline">
              <label>Skin<input id="studio-skin" type="color" value="#a86f45"></label>
              <label>Hair<input id="studio-hair" type="color" value="#090909"></label>
              <label>Jersey<input id="studio-jersey" type="color" value="#f5f5f0"></label>
            </div>
            <div class="studio-inline">
              <label>Hair Style<select id="studio-hair-style">
                <option value="short-curls">Short Curls</option>
                <option value="braids">Braids</option>
                <option value="fade">Fade</option>
                <option value="waves">Waves</option>
                <option value="afro">Afro</option>
              </select></label>
              <label>Facial Hair<select id="studio-facial-hair">
                <option value="none">None</option>
                <option value="mustache">Mustache</option>
                <option value="goatee" selected>Goatee</option>
                <option value="beard">Beard</option>
              </select></label>
              <label>Reference Opacity<input id="studio-reference-opacity" type="range" min="0" max="45" value="0"></label>
            </div>
            <label>Reference photo<input id="studio-source-photo" type="file" accept="image/*"></label>
            <label>Extra Imagegen notes<textarea id="studio-imagegen-notes" placeholder="Optional: hairstyle, expression, jersey color, or source-photo notes"></textarea></label>
            <div class="studio-actions">
              <button id="studio-build-imagegen-prompt" type="button">Build Imagegen Prompt</button>
              <button id="studio-copy-imagegen-prompt" type="button">Copy Imagegen Prompt</button>
            </div>
            <label>Codex Imagegen v2 prompt<textarea id="studio-imagegen-prompt"></textarea></label>
            <label>Finished Imagegen PNG<input id="studio-generated-asset-file" type="file" accept="image/png,image/jpeg,image/webp"></label>
            <label>Output path<input id="studio-output-path" type="text" readonly></label>
            <section class="studio-save-panel" aria-label="Save portrait to local site">
              <div class="studio-batch-header">
                <h3>Save To Site</h3>
                <span>Local helper</span>
              </div>
              <label>Save endpoint<input id="studio-save-endpoint" type="url" value="${escapeHtml(options.saveEndpoint || DEFAULT_SAVE_ENDPOINT)}"></label>
              <div class="studio-actions">
                <button id="studio-save-to-site" type="button">Save to Site</button>
              </div>
              <label>Save result<textarea id="studio-save-result" readonly></textarea></label>
            </section>
            <div class="studio-actions">
              <button id="studio-render" type="button">Render Draft Avatar</button>
              <button id="studio-new-draft-variation" type="button">New Draft Variation</button>
              <button id="studio-download" type="button">Download PNG</button>
              <button id="studio-copy-entry" type="button">Copy Entry</button>
            </div>
            <label>Manifest entry<textarea id="studio-manifest-entry" readonly></textarea></label>
            <label>Data URL<textarea id="studio-data-url" readonly></textarea></label>
            <section class="studio-batch-panel" aria-label="Team portrait batch queue">
              <div class="studio-batch-header">
                <h3>Team Portrait Batch</h3>
                <span>Rockets preset ready</span>
              </div>
              <div class="studio-inline">
                <label>Team Preset<select id="studio-batch-team">
                  ${Object.values(teamPortraitPresets).map((preset) => `<option value="${escapeHtml(preset.code)}">${escapeHtml(preset.label)}</option>`).join('')}
                </select></label>
                <label>Default Pos<input id="studio-batch-default-pos" type="text" maxlength="5" placeholder="Optional"></label>
                <label>Status<input type="text" value="Queue prompts" readonly></label>
              </div>
              <label>Players<textarea id="studio-batch-players" placeholder="Amen Thompson&#10;Alperen Sengun, C&#10;Jabari Smith Jr.|F"></textarea></label>
              <div class="studio-actions">
                <button id="studio-build-batch" type="button">Build Batch Queue</button>
                <button id="studio-copy-batch" type="button">Copy Batch Prompts</button>
              </div>
              <div id="studio-batch-list" class="studio-batch-list" aria-live="polite"></div>
              <label>Batch prompt output<textarea id="studio-batch-output" readonly></textarea></label>
            </section>
          </div>
          <div class="studio-preview">
            <canvas width="${WIDTH}" height="${HEIGHT}"></canvas>
            <p id="studio-status">Ready</p>
          </div>
        </div>
      </div>
    `;
    const canvas = mount.querySelector('canvas');
    let photoImage = null;
    let importedImage = null;
    let imagegenPromptDirty = false;
    let draftRenderCount = 0;
    let draftVariation = 0;
    let batchQueue = [];
    const readPlayer = () => ({
      name: mount.querySelector('#studio-player-name').value.trim() || 'Player',
      team: mount.querySelector('#studio-team').value.trim().toUpperCase(),
      id: mount.querySelector('#studio-player-id').value.trim(),
      pos: mount.querySelector('#studio-position').value.trim().toUpperCase()
    });
    const readAvatarOptions = () => ({
      skin: mount.querySelector('#studio-skin').value,
      hair: mount.querySelector('#studio-hair').value,
      jersey: mount.querySelector('#studio-jersey').value,
      hairStyle: mount.querySelector('#studio-hair-style').value,
      facialHair: mount.querySelector('#studio-facial-hair').value,
      referenceOpacity: mount.querySelector('#studio-reference-opacity').value,
      variation: draftVariation,
      notes: mount.querySelector('#studio-imagegen-notes').value,
      photoImage
    });
    const applyPromptToDraftControls = () => {
      if (!imagegenPromptDirty) return [];
      const parsed = parseImagegenPrompt(mount.querySelector('#studio-imagegen-prompt').value);
      const applied = [];
      const nameInput = mount.querySelector('#studio-player-name');
      const teamInput = mount.querySelector('#studio-team');
      const idInput = mount.querySelector('#studio-player-id');
      const nameChanged = parsed.name && parsed.name !== nameInput.value.trim();
      if (parsed.name) {
        nameInput.value = parsed.name;
        applied.push('player');
        if (nameChanged) {
          idInput.value = '';
          if (!parsed.team) teamInput.value = '';
        }
      }
      if (parsed.team != null) {
        teamInput.value = parsed.team;
        applied.push('team');
      }
      if (parsed.jersey) {
        mount.querySelector('#studio-jersey').value = parsed.jersey;
        applied.push('jersey');
      }
      if (parsed.hairStyle && mount.querySelector(`#studio-hair-style option[value="${parsed.hairStyle}"]`)) {
        mount.querySelector('#studio-hair-style').value = parsed.hairStyle;
        applied.push('hair');
      }
      if (parsed.facialHair && mount.querySelector(`#studio-facial-hair option[value="${parsed.facialHair}"]`)) {
        mount.querySelector('#studio-facial-hair').value = parsed.facialHair;
        applied.push('facial hair');
      }
      return applied;
    };
    const updatePrompt = () => {
      const player = readPlayer();
      mount.querySelector('#studio-imagegen-prompt').value = buildImagegenPrompt(player, readAvatarOptions());
      imagegenPromptDirty = false;
    };
    const updateOutputs = (player, assetPath, dataUrl, status) => {
      mount.querySelector('#studio-output-path').value = assetPath;
      mount.querySelector('#studio-data-url').value = dataUrl;
      mount.querySelector('#studio-manifest-entry').value = JSON.stringify(buildManifestEntry(player, assetPath), null, 2);
      mount.querySelector('#studio-status').textContent = status;
      if (typeof options.onRender === 'function') options.onRender({ player, assetPath, dataUrl });
    };
    const render = () => {
      const promptApplied = applyPromptToDraftControls();
      const player = readPlayer();
      const assetPath = buildAssetPath(player);
      importedImage = null;
      renderAvatarToCanvas(canvas, { player, ...readAvatarOptions() });
      const dataUrl = exportPngDataUrl(canvas);
      if (!imagegenPromptDirty) updatePrompt();
      draftRenderCount += 1;
      canvas.dataset.renderCount = String(draftRenderCount);
      const appliedLabel = promptApplied.length ? ` - Applied prompt: ${promptApplied.join(', ')}` : '';
      updateOutputs(player, assetPath, dataUrl, `Rendered draft #${draftRenderCount} for ${player.name}${appliedLabel}`);
    };
    const useImportedImage = () => {
      if (!importedImage) return;
      const player = readPlayer();
      const assetPath = buildAssetPath(player);
      renderImportedImageToCanvas(canvas, importedImage);
      updateOutputs(player, assetPath, exportPngDataUrl(canvas), `Imported Imagegen portrait for ${player.name}`);
    };
    const download = () => {
      if (importedImage) useImportedImage();
      else render();
      const link = global.document.createElement('a');
      link.href = exportPngDataUrl(canvas);
      link.download = buildAssetPath(readPlayer()).split('/').pop() || 'player-portrait.png';
      global.document.body.appendChild(link);
      link.click();
      link.remove();
    };
    const newDraftVariation = () => {
      draftVariation += 1;
      render();
      mount.querySelector('#studio-status').textContent += ` (variation ${draftVariation + 1})`;
    };
    const savePortraitToSite = async () => {
      if (importedImage) useImportedImage();
      else if (canvas.dataset.rendered !== 'true') render();
      const player = readPlayer();
      const assetPath = mount.querySelector('#studio-output-path').value || buildAssetPath(player);
      const endpoint = mount.querySelector('#studio-save-endpoint').value.trim() || DEFAULT_SAVE_ENDPOINT;
      const imageDataUrl = exportPngDataUrl(canvas);
      const resultArea = mount.querySelector('#studio-save-result');
      mount.querySelector('#studio-status').textContent = `Saving ${player.name} to local portrait assets...`;
      resultArea.value = '';
      if (typeof global.fetch !== 'function') {
        const message = 'Save helper requires a browser with fetch support.';
        resultArea.value = message;
        mount.querySelector('#studio-status').textContent = message;
        return null;
      }
      try {
        const response = await global.fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player, assetPath, imageDataUrl })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.ok === false) {
          throw new Error(body.error || `Save failed with HTTP ${response.status}`);
        }
        const savedAssetPath = body.assetPath || assetPath;
        mount.querySelector('#studio-output-path').value = savedAssetPath;
        mount.querySelector('#studio-manifest-entry').value = JSON.stringify(body.manifestEntry || buildManifestEntry(player, savedAssetPath), null, 2);
        resultArea.value = JSON.stringify(body, null, 2);
        mount.querySelector('#studio-status').textContent = `Saved ${player.name} to ${savedAssetPath}`;
        return body;
      } catch (error) {
        const message = `${String(error?.message || error)}. Start the local helper with npm run portraits:helper, then try Save to Site again.`;
        resultArea.value = message;
        mount.querySelector('#studio-status').textContent = 'Save unavailable. Start the local helper and retry.';
        return null;
      }
    };
    const renderBatchQueue = () => {
      mount.querySelector('#studio-batch-list').innerHTML = batchQueue.map((entry) => `
        <article class="studio-batch-card" data-batch-index="${entry.index}">
          <div>
            <strong>${escapeHtml(entry.player.name)}</strong>
            <span>${escapeHtml(entry.preset.label)} - ${escapeHtml(entry.status)}</span>
          </div>
          <code>${escapeHtml(entry.assetPath)}</code>
          <textarea readonly>${escapeHtml(entry.prompt)}</textarea>
        </article>
      `).join('');
      mount.querySelector('#studio-batch-output').value = batchQueue.map((entry) => [
        `# ${entry.player.name}`,
        `Asset: ${entry.assetPath}`,
        entry.prompt,
        `Manifest: ${JSON.stringify(entry.manifestEntry)}`
      ].join('\n')).join('\n\n---\n\n');
    };
    const buildBatch = () => {
      const teamCode = mount.querySelector('#studio-batch-team').value;
      const defaultPos = mount.querySelector('#studio-batch-default-pos').value.trim().toUpperCase();
      batchQueue = buildBatchPromptQueue(mount.querySelector('#studio-batch-players').value, { team: teamCode })
        .map((entry) => defaultPos && !entry.player.pos
          ? {
            ...entry,
            player: { ...entry.player, pos: defaultPos },
            prompt: buildImagegenPrompt({ ...entry.player, pos: defaultPos }, {
              jersey: entry.preset.jersey,
              jerseyDescription: entry.preset.jerseyDescription,
              notes: `Apply the ${entry.preset.label} team preset consistently. Do not use official logos, sponsor marks, or jersey numbers.`
            })
          }
          : entry);
      renderBatchQueue();
      mount.querySelector('#studio-status').textContent = `Built ${batchQueue.length} team portrait prompts`;
    };
    mount.querySelector('#studio-render').addEventListener('click', render);
    mount.querySelector('#studio-new-draft-variation').addEventListener('click', newDraftVariation);
    mount.querySelector('#studio-download').addEventListener('click', download);
    mount.querySelector('#studio-save-to-site').addEventListener('click', savePortraitToSite);
    mount.querySelector('#studio-copy-entry').addEventListener('click', () => copyText(mount.querySelector('#studio-manifest-entry').value));
    mount.querySelector('#studio-build-imagegen-prompt').addEventListener('click', updatePrompt);
    mount.querySelector('#studio-copy-imagegen-prompt').addEventListener('click', () => copyText(mount.querySelector('#studio-imagegen-prompt').value));
    mount.querySelector('#studio-build-batch').addEventListener('click', buildBatch);
    mount.querySelector('#studio-copy-batch').addEventListener('click', () => copyText(mount.querySelector('#studio-batch-output').value));
    mount.querySelector('#studio-imagegen-prompt').addEventListener('input', () => {
      imagegenPromptDirty = true;
    });
    [
      '#studio-player-name',
      '#studio-team',
      '#studio-player-id',
      '#studio-position',
      '#studio-skin',
      '#studio-hair',
      '#studio-jersey',
      '#studio-hair-style',
      '#studio-facial-hair',
      '#studio-reference-opacity',
      '#studio-imagegen-notes'
    ].forEach((selector) => {
      mount.querySelector(selector).addEventListener('input', render);
      mount.querySelector(selector).addEventListener('change', render);
    });
    mount.querySelector('#studio-source-photo').addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          photoImage = image;
          mount.querySelector('#studio-status').textContent = 'Reference loaded. Raise opacity to trace, then return it to 0 before export.';
          render();
        };
        image.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
    mount.querySelector('#studio-generated-asset-file').addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          importedImage = image;
          useImportedImage();
        };
        image.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
    render();
    updatePrompt();
    return { render, download, savePortraitToSite, canvas, getPlayer: readPlayer, buildImagegenPrompt: updatePrompt };
  }

  global.RosterBatePortraitStudio = {
    DEFAULT_SAVE_ENDPOINT,
    WIDTH,
    HEIGHT,
    buildAssetPath,
    buildBatchPromptQueue,
    buildImagegenPrompt,
    buildManifestEntry,
    createPortraitStudio,
    exportPngDataUrl,
    getTeamPortraitPreset,
    parseImagegenPrompt,
    renderAvatarToCanvas,
    renderPortraitToCanvas
  };
})(typeof window !== 'undefined' ? window : globalThis);
