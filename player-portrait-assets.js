(function initRosterBatePlayerPortraits(global) {
  'use strict';

  const registry = Object.create(null);
  const directFields = ['portraitUrl', 'headshotUrl', 'imageUrl', 'photoUrl', 'avatarUrl'];
  const skinTones = ['#f2c7a0', '#d99b6c', '#8d5638', '#6f3f2b', '#f0b98f', '#b97950'];
  const hairTones = ['#17110d', '#2b1a12', '#4a2c1b', '#0f172a', '#6f4028', '#d6a76c'];
  const accentFallbacks = ['#2563eb', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#06b6d4'];
  const portraitTraits = {
    'nikola jokic': { skin: '#f0c7a4', hair: '#3b2418', hairVariant: 'buzz', facialHair: 'short-beard', mouth: 'smirk', build: 'wide' },
    'luka doncic': { skin: '#f1c5a1', hair: '#7c4a2d', hairVariant: 'swoop', facialHair: 'trim-beard', mouth: 'smile' },
    'shai gilgeous-alexander': { skin: '#8d5638', hair: '#111827', hairVariant: 'braids', headband: true, facialHair: 'goatee', mouth: 'calm' },
    'victor wembanyama': { skin: '#a86845', hair: '#111827', hairVariant: 'short-curls', facialHair: 'none', build: 'narrow', longNeck: true },
    'michael jordan': { skin: '#7b4a32', hair: '#111827', hairVariant: 'bald', facialHair: 'none', mouth: 'smile', build: 'wide' },
    'magic johnson': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'close-crop', facialHair: 'mustache', mouth: 'smile' },
    'larry bird': { skin: '#f2c7a0', hair: '#d6a76c', hairVariant: 'feathered', facialHair: 'none', mouth: 'flat' },
    'hakeem olajuwon': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'close-crop', facialHair: 'mustache', build: 'wide' },
    'shaquille oneal': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'bald', facialHair: 'goatee', build: 'wide' },
    'shaquille o neal': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'bald', facialHair: 'goatee', build: 'wide' },
    'lebron james': { skin: '#7b4a32', hair: '#111827', hairVariant: 'headband-crop', headband: true, facialHair: 'full-beard', build: 'wide' },
    'kobe bryant': { skin: '#8d5638', hair: '#111827', hairVariant: 'close-crop', facialHair: 'goatee', mouth: 'calm' },
    'stephen curry': { skin: '#b97950', hair: '#3b2418', hairVariant: 'short-curls', facialHair: 'trim-beard', mouth: 'smile' },
    'kevin durant': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'close-crop', facialHair: 'goatee', build: 'narrow' },
    'giannis antetokounmpo': { skin: '#5f3727', hair: '#111827', hairVariant: 'short-curls', facialHair: 'trim-beard', build: 'wide' },
    'james harden': { skin: '#7b4a32', hair: '#111827', hairVariant: 'short-curls', facialHair: 'full-beard', mouth: 'flat' },
    'russell westbrook': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'short-curls', facialHair: 'none', mouth: 'flat' },
    'anthony davis': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'short-curls', facialHair: 'full-beard', brow: 'heavy' },
    'kareem abdul-jabbar': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'bald', facialHair: 'mustache', build: 'narrow' },
    'charles barkley': { skin: '#6f3f2b', hair: '#111827', hairVariant: 'bald', facialHair: 'none', build: 'wide' },
    'tim duncan': { skin: '#5f3727', hair: '#111827', hairVariant: 'close-crop', facialHair: 'goatee', mouth: 'calm' }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
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

  function initialsFor(name) {
    const parts = String(name || 'P').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'P';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function playerName(player) {
    return String(player?.name || player?.playerName || player?.fullName || player?.displayName || 'Player');
  }

  function playerTeam(player) {
    return String(player?.team || player?.teamCode || player?.abbr || player?.franchise || '');
  }

  function portraitTrait(player) {
    const name = normalize(playerName(player)).replace(/[.'-]/g, ' ').replace(/\s+/g, ' ');
    return portraitTraits[name] || portraitTraits[normalize(playerName(player))] || {};
  }

  function keyCandidates(player) {
    const name = normalize(playerName(player));
    const team = normalize(playerTeam(player));
    const id = normalize(player?.id || player?.playerId || player?.slug);
    return [
      id && `id:${id}`,
      name && team && `${name}|${team}`,
      name
    ].filter(Boolean);
  }

  function readOverrideRegistry() {
    try {
      const raw = global.localStorage && global.localStorage.getItem('rbPlayerPortraitOverrides');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function directPortraitUrl(player) {
    for (const field of directFields) {
      const value = player && player[field];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  function registeredPortraitUrl(player) {
    const keys = keyCandidates(player);
    const overrides = readOverrideRegistry();
    for (const key of keys) {
      if (registry[key]) return registry[key];
      if (overrides && typeof overrides[key] === 'string' && overrides[key].trim()) return overrides[key].trim();
    }
    return '';
  }

  function choosePalette(player, options) {
    const seed = hashString(`${playerName(player)}|${playerTeam(player)}`);
    const trait = portraitTrait(player);
    return {
      seed,
      skin: options.skin || trait.skin || skinTones[seed % skinTones.length],
      hair: options.hair || trait.hair || hairTones[Math.floor(seed / skinTones.length) % hairTones.length],
      team: options.teamColor || player?._color || player?.primaryColor || accentFallbacks[seed % accentFallbacks.length],
      teamTwo: options.teamColorTwo || player?.secondaryColor || accentFallbacks[Math.floor(seed / 7) % accentFallbacks.length]
    };
  }

  function hairMarkup(variant) {
    const hair = {
      swoop: '<path class="portrait-hair" data-trait-hair="swoop" d="M52 72 Q60 42 91 37 Q121 38 135 67 Q110 54 88 62 Q69 58 52 72Z"/><path d="M57 61 Q79 43 103 51" fill="none" stroke-width="8"/>',
      braids: '<path class="portrait-hair" data-trait-hair="braids" d="M57 67 Q66 41 92 39 Q119 41 130 67 Q112 59 92 61 Q73 59 57 67Z"/><path d="M62 70 L58 108 M74 63 L72 110 M108 63 L111 110 M123 70 L128 108" fill="none" stroke-width="5"/>',
      'short-curls': '<path class="portrait-hair" data-trait-hair="short-curls" d="M54 70 Q61 41 90 38 Q122 39 133 70 Q116 60 91 61 Q68 60 54 70Z"/><circle cx="66" cy="62" r="7"/><circle cx="80" cy="54" r="7"/><circle cx="96" cy="53" r="7"/><circle cx="112" cy="58" r="7"/><circle cx="124" cy="68" r="6"/>',
      buzz: '<path class="portrait-hair" data-trait-hair="buzz" d="M57 74 Q60 52 90 49 Q120 52 123 74 Q104 66 90 66 Q74 66 57 74Z"/>',
      'close-crop': '<path class="portrait-hair" data-trait-hair="close-crop" d="M58 71 Q65 47 90 45 Q116 47 123 71 Q103 62 90 62 Q75 62 58 71Z"/>',
      bald: '<path class="portrait-hair" data-trait-hair="bald" d="M62 76 Q66 55 90 53 Q114 55 119 76" fill="none" stroke-width="4" opacity=".35"/>',
      feathered: '<path class="portrait-hair" data-trait-hair="feathered" d="M51 72 Q58 42 89 38 Q120 38 135 70 Q112 59 91 63 Q71 57 51 72Z"/><path d="M61 58 Q72 50 82 59 M81 51 Q92 44 104 55 M105 52 Q119 54 127 66" fill="none" stroke-width="6"/>',
      'headband-crop': '<path class="portrait-hair" data-trait-hair="headband-crop" d="M58 70 Q65 48 90 46 Q116 48 123 70 Q105 62 90 62 Q74 62 58 70Z"/>'
    };
    return hair[variant] || [
      '<path class="portrait-hair" data-trait-hair="classic" d="M54 70 Q63 38 92 38 Q124 39 132 72 Q117 62 92 62 Q68 62 54 70Z"/>',
      '<path class="portrait-hair" data-trait-hair="curved" d="M52 72 Q58 40 91 36 Q122 34 135 68 Q112 55 89 62 Q66 55 52 72Z"/><path d="M57 58 Q70 42 82 58 Q96 39 109 59 Q121 43 132 65" fill="none" stroke-width="7"/>',
      '<path class="portrait-hair" data-trait-hair="block" d="M55 73 Q57 38 89 37 Q124 37 133 70 L128 82 Q112 59 90 62 Q68 59 58 82Z"/>',
      '<path class="portrait-hair" data-trait-hair="wave" d="M54 68 Q61 47 84 42 Q111 36 132 59 Q126 73 119 82 Q105 61 86 63 Q66 62 54 68Z"/>'
    ][hashString(variant) % 4];
  }

  function facialHairMarkup(type) {
    if (type === 'none') return '';
    if (type === 'mustache') return '<path class="portrait-facial-hair" data-trait-facial-hair="mustache" d="M78 124 Q86 119 90 124 Q94 119 102 124" fill="none" stroke="#111827" stroke-width="4"/>';
    if (type === 'goatee') return '<path class="portrait-facial-hair" data-trait-facial-hair="goatee" d="M78 124 Q90 130 102 124 M84 136 Q90 141 96 136" fill="none" stroke="#111827" stroke-width="4"/>';
    if (type === 'short-beard' || type === 'trim-beard') return '<path class="portrait-facial-hair" data-trait-facial-hair="trim-beard" d="M69 121 Q90 141 111 121 Q105 148 90 151 Q75 148 69 121Z" fill="#111827" opacity=".32" stroke="none"/>';
    if (type === 'full-beard') return '<path class="portrait-facial-hair" data-trait-facial-hair="full-beard" d="M65 116 Q90 146 115 116 Q112 151 90 156 Q68 151 65 116Z" fill="#111827" opacity=".58" stroke="none"/>';
    return '';
  }

  function buildGeneratedPortraitSvg(player, options = {}) {
    const name = playerName(player);
    const team = playerTeam(player);
    const initials = initialsFor(name);
    const palette = choosePalette(player, options);
    const trait = portraitTrait(player);
    const hairVariant = trait.hairVariant || ['classic', 'curved', 'block', 'wave'][palette.seed % 4];
    const hasHeadband = trait.headband || palette.seed % 7 === 0;
    const browTilt = trait.brow === 'heavy' ? 5 : (palette.seed % 2 ? 2 : -2);
    const mouthCurve = trait.mouth === 'smile'
      ? 'M78 127 Q90 137 102 127'
      : trait.mouth === 'flat'
        ? 'M79 128 L101 128'
        : palette.seed % 3 === 0 ? 'M78 128 Q90 135 102 128' : 'M79 128 Q90 131 101 128';
    const shoulderLeft = trait.build === 'narrow' ? 49 : trait.build === 'wide' ? 30 : 39;
    const shoulderRight = trait.build === 'narrow' ? 131 : trait.build === 'wide' ? 150 : 141;
    const neckTop = trait.longNeck ? 125 : 132;
    const hairShape = hairMarkup(hairVariant);
    const facialHair = facialHairMarkup(trait.facialHair || (palette.seed % 5 === 0 ? 'trim-beard' : 'none'));
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 220" role="img" aria-label="${escapeAttr(name)} portrait">
  <defs>
    <linearGradient id="jersey" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${escapeAttr(palette.team)}"/>
      <stop offset="1" stop-color="${escapeAttr(palette.teamTwo)}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#020617" flood-opacity=".24"/>
    </filter>
  </defs>
  <rect class="portrait-card-bg" x="8" y="8" width="164" height="204" rx="20" fill="#fff"/>
  <path d="M8 156 Q47 132 91 137 Q132 141 172 116 L172 212 L8 212Z" fill="#eef6ff"/>
  <g class="portrait-ink-outline" filter="url(#softShadow)" stroke="#111827" stroke-linecap="round" stroke-linejoin="round">
    <path class="portrait-body" d="M${shoulderLeft} 202 Q45 158 72 148 L108 148 Q135 158 ${shoulderRight} 202Z" fill="url(#jersey)" stroke-width="4"/>
    <path d="M65 151 L80 202 M115 151 L100 202" fill="none" stroke="#f8fafc" stroke-width="8" opacity=".85"/>
    <path d="M75 ${neckTop} L75 158 Q90 168 105 158 L105 ${neckTop}Z" fill="${escapeAttr(palette.skin)}" stroke-width="4"/>
    <ellipse class="portrait-ear" cx="55" cy="104" rx="9" ry="14" fill="${escapeAttr(palette.skin)}" stroke-width="4"/>
    <ellipse class="portrait-ear" cx="125" cy="104" rx="9" ry="14" fill="${escapeAttr(palette.skin)}" stroke-width="4"/>
    <path class="portrait-head" d="M57 85 Q58 55 90 52 Q122 55 123 85 L120 115 Q116 143 90 149 Q64 143 60 115Z" fill="${escapeAttr(palette.skin)}" stroke-width="4"/>
    <g class="portrait-hair" fill="${escapeAttr(palette.hair)}" stroke="${escapeAttr(palette.hair)}">${hairShape}</g>
    ${hasHeadband ? `<path d="M58 78 Q90 66 122 78" fill="none" stroke="#f8fafc" stroke-width="9"/><path d="M58 78 Q90 66 122 78" fill="none" stroke="#111827" stroke-width="2"/>` : ''}
    <path d="M70 96 Q78 ${94 + browTilt} 84 97 M97 97 Q105 ${94 - browTilt} 112 96" fill="none" stroke="#111827" stroke-width="4"/>
    <circle class="portrait-face" cx="79" cy="105" r="3.2" fill="#0f172a" stroke="none"/>
    <circle class="portrait-face" cx="103" cy="105" r="3.2" fill="#0f172a" stroke="none"/>
    <path class="portrait-nose" d="M91 108 L87 122 L95 122" fill="none" stroke="#111827" stroke-width="3"/>
    <path class="portrait-mouth" d="${mouthCurve}" fill="none" stroke="#111827" stroke-width="3"/>
    ${facialHair}
    <path d="M77 138 Q91 145 104 138" fill="none" stroke="#111827" stroke-width="2" opacity=".35"/>
  </g>
  <rect x="131" y="18" width="29" height="24" rx="4" fill="#111827" opacity=".88"/>
  <text x="145.5" y="34" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="10" fill="#fff">${escapeHtml(initials)}</text>
  <text x="90" y="202" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="10" fill="#0f172a" opacity=".72">${escapeHtml(team || 'RB')}</text>
</svg>`.trim();
    return svg;
  }

  function buildGeneratedPortraitDataUri(player, options = {}) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildGeneratedPortraitSvg(player, options))}`;
  }

  function getPortraitUrl(player, options = {}) {
    return directPortraitUrl(player) || registeredPortraitUrl(player) || buildGeneratedPortraitDataUri(player || {}, options);
  }

  function renderPortraitMarkup(player, options = {}) {
    const size = Number(options.size || 44);
    const className = options.className || 'player-portrait';
    const extraClass = options.extraClass ? ` ${options.extraClass}` : '';
    const id = options.id ? ` id="${escapeAttr(options.id)}"` : '';
    const styleParts = [`width:${size}px`, `height:${Math.round(size * (options.aspect || 1.18))}px`];
    if (options.style) styleParts.push(options.style);
    if (options.extraStyle) styleParts.push(options.extraStyle);
    const url = getPortraitUrl(player || {}, options);
    const name = playerName(player);
    return `<div${id} class="${escapeAttr(className + extraClass)}" style="${escapeAttr(styleParts.join(';'))}" aria-label="${escapeAttr(name)} portrait"><img class="player-portrait-img" src="${escapeAttr(url)}" alt="${escapeAttr(name)} portrait" loading="lazy" decoding="async"></div>`;
  }

  function register(map) {
    if (!map || typeof map !== 'object') return registry;
    Object.keys(map).forEach((key) => {
      const value = map[key];
      if (typeof value === 'string' && value.trim()) registry[normalize(key)] = value.trim();
    });
    return registry;
  }

  global.RosterBatePlayerPortraits = {
    register,
    getPortraitUrl,
    buildGeneratedPortraitSvg,
    buildGeneratedPortraitDataUri,
    renderPortraitMarkup,
    _keyCandidates: keyCandidates
  };
})(typeof window !== 'undefined' ? window : globalThis);
