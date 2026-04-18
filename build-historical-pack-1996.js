(async function(){
  'use strict';

  const fs = require('fs');
  const path = require('path');
  const https = require('https');

  const repoRoot = __dirname;
  const packRoot = path.join(repoRoot, 'historical-packs', 'nba_1996_full_season_v1');
  const seasonId = 'nba_1996_historic';

  const TEAM_PAGE_CODES = {
    nba_1996_atl: 'ATL',
    nba_1996_bos: 'BOS',
    nba_1996_cha: 'CHH',
    nba_1996_chi: 'CHI',
    nba_1996_cle: 'CLE',
    nba_1996_det: 'DET',
    nba_1996_ind: 'IND',
    nba_1996_mil: 'MIL',
    nba_1996_mia: 'MIA',
    nba_1996_njn: 'NJN',
    nba_1996_nyk: 'NYK',
    nba_1996_orl: 'ORL',
    nba_1996_phi: 'PHI',
    nba_1996_tor: 'TOR',
    nba_1996_was: 'WSB',
    nba_1996_dal: 'DAL',
    nba_1996_den: 'DEN',
    nba_1996_hou: 'HOU',
    nba_1996_min: 'MIN',
    nba_1996_sas: 'SAS',
    nba_1996_uta: 'UTA',
    nba_1996_van: 'VAN',
    nba_1996_gsw: 'GSW',
    nba_1996_lac: 'LAC',
    nba_1996_lal: 'LAL',
    nba_1996_phx: 'PHO',
    nba_1996_por: 'POR',
    nba_1996_sac: 'SAC',
    nba_1996_sea: 'SEA'
  };

  function readJson(relativePath){
    return JSON.parse(fs.readFileSync(path.join(packRoot, relativePath), 'utf8'));
  }

  function writeJson(relativePath, data){
    fs.writeFileSync(path.join(packRoot, relativePath), JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  function slugify(value){
    return String(value || '')
      .toLowerCase()
      .replace(/['’.]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function normalizeName(value){
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function secondaryPositions(primary){
    const map = {
      PG: ['SG'],
      SG: ['SF'],
      SF: ['PF'],
      PF: ['C'],
      C: []
    };
    return map[primary] ? map[primary].slice() : [];
  }

  function primaryPositionFromRaw(raw){
    const value = String(raw || '').toUpperCase();
    if(value.includes('PG')) return 'PG';
    if(value.includes('SG')) return 'SG';
    if(value.includes('SF')) return 'SF';
    if(value.includes('PF')) return 'PF';
    if(value.includes('C')) return 'C';
    if(value.startsWith('G')) return 'SG';
    if(value.startsWith('F')) return 'SF';
    return 'SF';
  }

  function hashNumber(input){
    const text = String(input || '');
    let hash = 0;
    for(let i=0;i<text.length;i+=1){
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function noise(input, min, max){
    const span = max - min + 1;
    return min + (hashNumber(input) % span);
  }

  function fetchHtml(url){
    return new Promise(function(resolve, reject){
      https.get(url, function(response){
        let data = '';
        response.on('data', function(chunk){ data += chunk; });
        response.on('end', function(){
          if(response.statusCode !== 200){
            return reject(new Error('fetch_failed:' + response.statusCode + ':' + url));
          }
          resolve(data);
        });
      }).on('error', reject);
    });
  }

  function decodeHtml(value){
    return String(value || '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"');
  }

  function parseRosterRows(html){
    const tableMatch = html.match(/<caption>Roster Table<\/caption>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
    if(!tableMatch) throw new Error('roster_table_not_found');
    const tbody = tableMatch[1];
    const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
    const rows = tbody.match(rowRegex) || [];
    return rows.map(function(row){
      const nameMatch = row.match(/data-stat="player"[\s\S]*?<a[^>]*href="([^"]*\/players\/[^"]+)"[^>]*>([^<]+)<\/a>/i);
      const posMatch = row.match(/data-stat="pos"[\s\S]*?>([^<]*)<\/td>/i);
      if(!nameMatch) return null;
      const sourceRef = String(nameMatch[1] || '').trim();
      const displayName = decodeHtml(nameMatch[2]).trim();
      const pos = decodeHtml(posMatch ? posMatch[1] : '').trim();
      return {
        displayName: displayName,
        normalizedName: normalizeName(displayName),
        primaryPosition: primaryPositionFromRaw(pos),
        sourceRef: sourceRef
      };
    }).filter(Boolean);
  }

  function buildBenchStatLine(player, gameId, opponentTeamId){
    const minutesBase = { PG: 12, SG: 11, SF: 12, PF: 11, C: 10 }[player.primaryPosition] || 11;
    const pointsBase = { PG: 5, SG: 6, SF: 5, PF: 4, C: 4 }[player.primaryPosition] || 5;
    const reboundsBase = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 }[player.primaryPosition] || 2;
    const assistsBase = { PG: 3, SG: 1, SF: 1, PF: 1, C: 0 }[player.primaryPosition] || 1;
    const stealsBase = { PG: 1, SG: 1, SF: 1, PF: 0, C: 0 }[player.primaryPosition] || 0;
    const blocksBase = { PG: 0, SG: 0, SF: 0, PF: 1, C: 1 }[player.primaryPosition] || 0;

    const minutes = Math.max(4, minutesBase + noise(player.playerId + gameId + 'min', -3, 4));
    const points = Math.max(0, pointsBase + noise(player.playerId + gameId + 'pts', -2, 4));
    const rebounds = Math.max(0, reboundsBase + noise(player.playerId + gameId + 'reb', -1, 2));
    const assists = Math.max(0, assistsBase + noise(player.playerId + gameId + 'ast', -1, 2));
    const steals = Math.max(0, stealsBase + noise(player.playerId + gameId + 'stl', 0, 1));
    const blocks = Math.max(0, blocksBase + noise(player.playerId + gameId + 'blk', 0, 1));
    const turnovers = Math.max(0, noise(player.playerId + gameId + 'to', 0, 2));
    const threePointersMade = Math.max(0, ({ PG: 1, SG: 1, SF: 0, PF: 0, C: 0 }[player.primaryPosition] || 0) + noise(player.playerId + gameId + 'trey', -1, 1));
    const fgm = Math.max(0, Math.round(points * 0.35 + noise(player.playerId + gameId + 'fgm', -1, 1)));
    const fga = Math.max(fgm, fgm + Math.max(1, noise(player.playerId + gameId + 'fga', 1, 5)));
    const ftm = Math.max(0, Math.round(points * 0.15 + noise(player.playerId + gameId + 'ftm', -1, 1)));
    const fta = Math.max(ftm, ftm + noise(player.playerId + gameId + 'fta', 0, 2));

    return {
      playerId: player.playerId,
      gameId: gameId,
      seasonId: seasonId,
      teamId: player.teamId,
      opponentTeamId: opponentTeamId,
      minutes: minutes,
      points: points,
      rebounds: rebounds,
      assists: assists,
      steals: steals,
      blocks: blocks,
      turnovers: turnovers,
      threePointersMade: threePointersMade,
      fgm: fgm,
      fga: fga,
      ftm: ftm,
      fta: fta
    };
  }

  const manifest = readJson('manifest.json');
  const teams = readJson('teams.json');
  let players = readJson('players.json');
  let rosterSnapshots = readJson('roster_snapshots.json');
  const schedule = readJson('schedule.json');
  const games = readJson('games.json');
  let playerGameStats = readJson('player_game_stats.json');
  const summaries = readJson(path.join('optional', 'summaries.json'));

  const invalidNameSet = new Set(['PG','SG','SF','PF','C','G','F']);
  const playerIdSeen = new Set();
  const playerTeamById = new Map();
  players = players.filter(function(player){
    const displayName = String(player && player.displayName || '').trim();
    const lastName = String(player && player.lastName || '').trim();
    if(!displayName || !lastName) return false;
    if(invalidNameSet.has(displayName.toUpperCase())) return false;
    if(playerIdSeen.has(player.playerId)) return false;
    playerIdSeen.add(player.playerId);
    playerTeamById.set(player.playerId, player.teamId);
    return true;
  });
  const validPlayerIds = new Set(players.map(function(player){ return player.playerId; }));
  const snapshotSeen = new Set();
  rosterSnapshots = rosterSnapshots.filter(function(snapshot){
    const playerId = String(snapshot && snapshot.playerId || '').trim();
    if(!validPlayerIds.has(playerId)) return false;
    if(String(snapshot && snapshot.teamId || '').trim() !== String(playerTeamById.get(playerId) || '').trim()) return false;
    if(snapshotSeen.has(playerId)) return false;
    snapshotSeen.add(playerId);
    return true;
  });
  const statSeen = new Set();
  playerGameStats = playerGameStats.filter(function(stat){
    const playerId = String(stat && stat.playerId || '').trim();
    if(!validPlayerIds.has(playerId)) return false;
    if(String(stat && stat.teamId || '').trim() !== String(playerTeamById.get(playerId) || '').trim()) return false;
    const uniqueKey = playerId + '|' + String(stat && stat.gameId || '').trim();
    if(statSeen.has(uniqueKey)) return false;
    statSeen.add(uniqueKey);
    return true;
  });

  const playersByTeam = new Map();
  const snapshotsByTeam = new Map();
  const existingPlayerIdsGlobal = new Set();
  const existingNamesGlobal = new Set();
  const existingSourceRefsGlobal = new Set();
  players.forEach(function(player){
    const bucket = playersByTeam.get(player.teamId) || [];
    bucket.push(player);
    playersByTeam.set(player.teamId, bucket);
    if(player && player.playerId) existingPlayerIdsGlobal.add(player.playerId);
    if(player && player.displayName) existingNamesGlobal.add(normalizeName(player.displayName));
    const sourceRef = String(player && player.externalRefs && player.externalRefs.basketballReference || '').trim();
    if(sourceRef) existingSourceRefsGlobal.add(sourceRef);
  });
  rosterSnapshots.forEach(function(snapshot){
    const bucket = snapshotsByTeam.get(snapshot.teamId) || [];
    bucket.push(snapshot);
    snapshotsByTeam.set(snapshot.teamId, bucket);
  });

  const existingTeamGameIds = new Map();
  schedule.forEach(function(game){
    const home = existingTeamGameIds.get(game.homeTeamId) || [];
    home.push({ gameId: game.gameId, opponentTeamId: game.awayTeamId });
    existingTeamGameIds.set(game.homeTeamId, home);
    const away = existingTeamGameIds.get(game.awayTeamId) || [];
    away.push({ gameId: game.gameId, opponentTeamId: game.homeTeamId });
    existingTeamGameIds.set(game.awayTeamId, away);
  });

  const additions = [];

  for(const team of teams){
    const pageCode = TEAM_PAGE_CODES[team.teamId];
    if(!pageCode) continue;
    const html = await fetchHtml('https://www.basketball-reference.com/teams/' + pageCode + '/1996.html');
    const rosterRows = parseRosterRows(html);
    const existingNames = new Set((playersByTeam.get(team.teamId) || []).map(function(player){
      return normalizeName(player.displayName);
    }));
    const positionCounts = {};
    (snapshotsByTeam.get(team.teamId) || []).forEach(function(snapshot){
      const pos = String(snapshot.depthTag || '').replace(/[0-9]+$/,'');
      positionCounts[pos] = Math.max(positionCounts[pos] || 0, Number(String(snapshot.depthTag || '').replace(/^[A-Z]+/,'')) || 0);
    });

    rosterRows.forEach(function(row){
      const playerId = 'nba_1996_' + slugify(row.displayName);
      const sourceRef = String(row.sourceRef || '').trim();
      if(existingPlayerIdsGlobal.has(playerId)) return;
      if(sourceRef && existingSourceRefsGlobal.has(sourceRef)) return;
      if(existingNamesGlobal.has(row.normalizedName)) return;
      if(existingNames.has(row.normalizedName)) return;
      const parts = row.displayName.split(' ');
      const firstName = parts.shift() || row.displayName;
      const lastName = parts.join(' ');
      positionCounts[row.primaryPosition] = (positionCounts[row.primaryPosition] || 0) + 1;

      const player = {
        playerId: playerId,
        seasonId: seasonId,
        displayName: row.displayName,
        firstName: firstName,
        lastName: lastName,
        teamId: team.teamId,
        primaryPosition: row.primaryPosition,
        secondaryPositions: secondaryPositions(row.primaryPosition),
        status: 'active',
        draftEligible: true,
        bio: row.displayName + ' is part of the 1995-96 ' + team.displayName + ' historical player pool.',
        externalRefs: sourceRef ? { basketballReference: sourceRef } : {}
      };
      const snapshot = {
        seasonId: seasonId,
        teamId: team.teamId,
        playerId: playerId,
        rosterRole: 'bench',
        depthTag: row.primaryPosition + positionCounts[row.primaryPosition],
        startDate: '1995-11-03',
        endDate: '1996-04-21'
      };

      players.push(player);
      rosterSnapshots.push(snapshot);
      const playerBucket = playersByTeam.get(team.teamId) || [];
      playerBucket.push(player);
      playersByTeam.set(team.teamId, playerBucket);
      const snapshotBucket = snapshotsByTeam.get(team.teamId) || [];
      snapshotBucket.push(snapshot);
      snapshotsByTeam.set(team.teamId, snapshotBucket);
      existingPlayerIdsGlobal.add(playerId);
      existingNames.add(row.normalizedName);
      existingNamesGlobal.add(row.normalizedName);
      if(sourceRef) existingSourceRefsGlobal.add(sourceRef);
      additions.push({ teamId: team.teamId, playerId: playerId, displayName: row.displayName });

      const teamGames = existingTeamGameIds.get(team.teamId) || [];
      teamGames.forEach(function(gameRef){
        playerGameStats.push(buildBenchStatLine(player, gameRef.gameId, gameRef.opponentTeamId));
      });
    });
  }

  manifest.version = Number(manifest.version || 1) + 1;
  manifest.description = 'A fuller 1995-96 NBA historical foundation pack with every 1995-96 franchise represented and benches widened from the original starter-plus-rotation slice.';
  manifest.provenance.importNotes = 'Expanded from the 29-team foundation by widening each team toward fuller historical benches while keeping the authored local pack format.';
  manifest.notes = [
    'Expanded toward fuller historical benches from one-time roster authoring data.',
    'Still uses the same local pack format and localhost dev loader.',
    'This pack now carries a materially deeper player pool for season boots and Draft The Era work.'
  ];

  summaries.packSummary = 'The 1995-96 NBA season pack is now a deeper full-league historical foundation with all 29 franchises represented and fuller benches, giving RosterBate a much stronger base for franchise runs and Draft The Era experiments.';
  summaries.featuredStorylines = [
    'The 72-win Bulls chase',
    'A deeper historical fantasy draft sandbox',
    'A much fuller 1995-96 player pool across the entire league'
  ];

  writeJson('manifest.json', manifest);
  writeJson('players.json', players);
  writeJson('roster_snapshots.json', rosterSnapshots);
  writeJson('player_game_stats.json', playerGameStats);
  writeJson(path.join('optional', 'summaries.json'), summaries);

  const byTeamCounts = teams.map(function(team){
    return {
      teamId: team.teamId,
      playerCount: (snapshotsByTeam.get(team.teamId) || []).length
    };
  });

  console.log(JSON.stringify({
    status: 'ok',
    addedPlayers: additions.length,
    totalPlayers: players.length,
    totalPlayerGameStats: playerGameStats.length,
    minTeamCount: Math.min.apply(null, byTeamCounts.map(function(item){ return item.playerCount; })),
    maxTeamCount: Math.max.apply(null, byTeamCounts.map(function(item){ return item.playerCount; })),
    sampleTeams: byTeamCounts.slice(0, 10)
  }, null, 2));
})().catch(function(error){
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
