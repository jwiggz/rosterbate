#!/usr/bin/env node
(async function(){
  'use strict';

  const fs = require('fs');
  const path = require('path');
  const https = require('https');

  const repoRoot = __dirname;
  const packRoot = path.join(repoRoot, 'historical-packs', 'nba_1996_full_season_v1');

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

  const PLAYER_NAME_ALIASES = {
    brianwilliams: ['bisondele'],
    bisondele: ['brianwilliams']
  };

  function readJson(relativePath){
    return JSON.parse(fs.readFileSync(path.join(packRoot, relativePath), 'utf8'));
  }

  function writeJson(relativePath, value){
    fs.writeFileSync(path.join(packRoot, relativePath), JSON.stringify(value, null, 2) + '\n', 'utf8');
  }

  function sleep(ms){
    return new Promise(function(resolve){ setTimeout(resolve, ms); });
  }

  async function fetchHtml(url, attempt){
    const tryNumber = Number(attempt || 0);
    return new Promise(function(resolve, reject){
      const request = https.get(url, {
        headers: {
          'User-Agent': 'RosterBateHistoricalPackIngest/1.0 (+http://localhost:8080)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      }, function(response){
        let data = '';
        response.on('data', function(chunk){ data += chunk; });
        response.on('end', async function(){
          if(response.statusCode === 429 && tryNumber < 4){
            const retryDelay = 2500 * (tryNumber + 1);
            await sleep(retryDelay);
            try{
              const retryData = await fetchHtml(url, tryNumber + 1);
              resolve(retryData);
            }catch(error){
              reject(error);
            }
            return;
          }
          if(response.statusCode !== 200){
            return reject(new Error('fetch_failed:' + response.statusCode + ':' + url));
          }
          resolve(data);
        });
      });
      request.on('error', reject);
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
      .replace(/&rdquo;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  function stripTags(value){
    return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  }

  function normalizeName(value){
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function slugify(value){
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’.]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function getNameCandidates(value){
    const primary = normalizeName(value);
    const aliases = PLAYER_NAME_ALIASES[primary] || [];
    return [primary].concat(aliases).filter(Boolean);
  }

  function toNumber(value){
    if(value===null || value===undefined) return 0;
    const cleaned = String(value).replace(/,/g, '').trim();
    if(!cleaned || cleaned === '--') return 0;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  function roundStat(value, digits){
    return Number(Number(value || 0).toFixed(Number.isFinite(digits) ? digits : 1));
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

  function extractTableBody(html, tableId){
    const match = html.match(new RegExp('<table[^>]*id="' + tableId + '"[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>', 'i'));
    return match ? match[1] : '';
  }

  function parseTableRowsByName(html, tableId){
    const tbody = extractTableBody(html, tableId);
    if(!tbody) return new Map();
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<(td|th)([^>]*)data-stat="([^"]+)"([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;
    const rows = new Map();
    let rowMatch;
    while((rowMatch = rowRegex.exec(tbody))){
      const rowHtml = rowMatch[1];
      if(/class="thead"/i.test(rowHtml)) continue;
      const cells = {};
      let cellMatch;
      while((cellMatch = cellRegex.exec(rowHtml))){
        const beforeAttrs = String(cellMatch[2] || '');
        const afterAttrs = String(cellMatch[4] || '');
        const attrs = beforeAttrs + ' ' + afterAttrs;
        const dataStat = cellMatch[3];
        const innerHtml = cellMatch[5];
        cells[dataStat] = {
          text: stripTags(innerHtml),
          html: innerHtml,
          attrs: attrs
        };
      }
      const nameCell = cells.name_display;
      if(!nameCell || !nameCell.text) continue;
      if(/team totals/i.test(nameCell.text) || /league average/i.test(nameCell.text)) continue;
      const hrefMatch = nameCell.html.match(/href="([^"]*\/players\/[^"]+)"/i);
      const csvMatch = (nameCell.attrs || '').match(/data-append-csv="([^"]+)"/i);
      const normalizedName = normalizeName(nameCell.text);
      rows.set(normalizedName, {
        displayName: nameCell.text,
        normalizedName: normalizedName,
        href: hrefMatch ? hrefMatch[1] : '',
        basketballReferenceId: csvMatch ? csvMatch[1] : '',
        fields: Object.fromEntries(Object.entries(cells).map(function(entry){
          return [entry[0], entry[1].text];
        }))
      });
    }
    return rows;
  }

  function parseRosterRows(html){
    const tbody = extractTableBody(html, 'roster');
    if(!tbody) return [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<(td|th)([^>]*)data-stat="([^"]+)"([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;
    const rows = [];
    let rowMatch;
    while((rowMatch = rowRegex.exec(tbody))){
      const rowHtml = rowMatch[1];
      if(/class="thead"/i.test(rowHtml)) continue;
      const cells = {};
      let cellMatch;
      while((cellMatch = cellRegex.exec(rowHtml))){
        const beforeAttrs = String(cellMatch[2] || '');
        const afterAttrs = String(cellMatch[4] || '');
        const attrs = beforeAttrs + ' ' + afterAttrs;
        const dataStat = cellMatch[3];
        const innerHtml = cellMatch[5];
        cells[dataStat] = {
          text: stripTags(innerHtml),
          html: innerHtml,
          attrs: attrs
        };
      }
      const nameCell = cells.player;
      if(!nameCell || !nameCell.text) continue;
      const hrefMatch = nameCell.html.match(/href="([^"]*\/players\/[^"]+)"/i);
      const csvMatch = (nameCell.attrs || '').match(/data-append-csv="([^"]+)"/i);
      const posRaw = cells.pos ? cells.pos.text : '';
      rows.push({
        displayName: nameCell.text,
        normalizedName: normalizeName(nameCell.text),
        href: hrefMatch ? hrefMatch[1] : '',
        basketballReferenceId: csvMatch ? csvMatch[1] : '',
        primaryPosition: primaryPositionFromRaw(posRaw)
      });
    }
    return rows;
  }

  function buildSeasonStats(totalsRow, teamCode){
    const f = totalsRow.fields || {};
    const games = toNumber(f.games);
    const minutesTotal = toNumber(f.mp);
    const pointsTotal = toNumber(f.pts);
    const reboundsTotal = toNumber(f.trb);
    const assistsTotal = toNumber(f.ast);
    const stealsTotal = toNumber(f.stl);
    const blocksTotal = toNumber(f.blk);
    const turnoversTotal = toNumber(f.tov);
    const fgmTotal = toNumber(f.fg);
    const fgaTotal = toNumber(f.fga);
    const ftmTotal = toNumber(f.ft);
    const ftaTotal = toNumber(f.fta);
    const threesTotal = toNumber(f.fg3);
    const divisor = games > 0 ? games : 1;
    return {
      source: 'basketball_reference_team_totals',
      sourceSeason: '1995-96',
      sourceTeamCode: teamCode,
      games: games,
      gamesStarted: toNumber(f.games_started),
      perGame: {
        min: roundStat(minutesTotal / divisor, 1),
        pts: roundStat(pointsTotal / divisor, 1),
        reb: roundStat(reboundsTotal / divisor, 1),
        ast: roundStat(assistsTotal / divisor, 1),
        stl: roundStat(stealsTotal / divisor, 1),
        blk: roundStat(blocksTotal / divisor, 1),
        to: roundStat(turnoversTotal / divisor, 1),
        fgm: roundStat(fgmTotal / divisor, 1),
        fga: roundStat(fgaTotal / divisor, 1),
        ftm: roundStat(ftmTotal / divisor, 1),
        fta: roundStat(ftaTotal / divisor, 1),
        threes: roundStat(threesTotal / divisor, 1)
      },
      totals: {
        min: minutesTotal,
        pts: pointsTotal,
        reb: reboundsTotal,
        ast: assistsTotal,
        stl: stealsTotal,
        blk: blocksTotal,
        to: turnoversTotal,
        fgm: fgmTotal,
        fga: fgaTotal,
        ftm: ftmTotal,
        fta: ftaTotal,
        threes: threesTotal
      }
    };
  }

  function buildZeroSeasonStats(teamCode){
    return {
      source: 'basketball_reference_roster_only_no_stats',
      sourceSeason: '1995-96',
      sourceTeamCode: teamCode,
      games: 0,
      gamesStarted: 0,
      perGame: {
        min: 0,
        pts: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        to: 0,
        fgm: 0,
        fga: 0,
        ftm: 0,
        fta: 0,
        threes: 0
      },
      totals: {
        min: 0,
        pts: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        to: 0,
        fgm: 0,
        fga: 0,
        ftm: 0,
        fta: 0,
        threes: 0
      }
    };
  }

  const manifest = readJson('manifest.json');
  const summaries = readJson(path.join('optional', 'summaries.json'));
  const teams = readJson('teams.json');
  const players = readJson('players.json');
  const rosterSnapshots = readJson('roster_snapshots.json');

  const teamById = new Map(teams.map(function(team){
    return [String(team?.teamId || '').trim(), team];
  }));
  const snapshotsByPlayerId = new Map();
  rosterSnapshots.forEach(function(snapshot){
    const playerId = String(snapshot?.playerId || '').trim();
    if(playerId){
      snapshotsByPlayerId.set(playerId, snapshot);
    }
  });

  const totalsRowsByTeamId = new Map();
  const rosterRowsByTeamId = new Map();
  for(const team of teams){
    const teamId = String(team?.teamId || '').trim();
    const teamCode = TEAM_PAGE_CODES[teamId];
    if(!teamCode) continue;
    const url = 'https://www.basketball-reference.com/teams/' + teamCode + '/1996.html';
    const html = await fetchHtml(url);
    const totalsRows = parseTableRowsByName(html, 'totals_stats');
    const rosterRows = parseRosterRows(html);
    totalsRowsByTeamId.set(teamId, totalsRows);
    rosterRowsByTeamId.set(teamId, rosterRows);
    team.externalRefs = Object.assign({}, team.externalRefs || {}, {
      basketballReferenceTeamCode: teamCode,
      basketballReferenceSeasonUrl: '/teams/' + teamCode + '/1996.html'
    });
  }

  const teamKeyToPlayer = new Map();
  const anyKeyToPlayers = new Map();
  const usedPlayerIds = new Set();
  players.forEach(function(player){
    const playerId = String(player?.playerId || '').trim();
    const teamId = String(player?.teamId || '').trim();
    getNameCandidates(player.displayName).forEach(function(nameKey){
      const teamKey = teamId + '|' + nameKey;
      if(!teamKeyToPlayer.has(teamKey)) teamKeyToPlayer.set(teamKey, player);
      const bucket = anyKeyToPlayers.get(nameKey) || [];
      bucket.push(player);
      anyKeyToPlayers.set(nameKey, bucket);
    });
  });

  function allocatePlayerId(displayName){
    let candidate = 'nba_1996_' + slugify(displayName);
    let suffix = 2;
    while(players.some(function(player){ return String(player?.playerId || '').trim() === candidate; })){
      candidate = 'nba_1996_' + slugify(displayName) + '_' + suffix;
      suffix += 1;
    }
    return candidate;
  }

  const reconciledPlayers = [];
  const reconciledSnapshots = [];
  let matchedPlayers = 0;
  let zeroStatPlayers = 0;
  const addedPlayers = [];
  const reassignedPlayers = [];

  for(const team of teams){
    const teamId = String(team?.teamId || '').trim();
    const teamCode = TEAM_PAGE_CODES[teamId] || '';
    const rosterRows = rosterRowsByTeamId.get(teamId) || [];
    const totalsRows = totalsRowsByTeamId.get(teamId) || new Map();
    const depthCounts = {};

    for(const rosterRow of rosterRows){
      const nameKeys = getNameCandidates(rosterRow.displayName);
      let player = null;
      for(const key of nameKeys){
        player = teamKeyToPlayer.get(teamId + '|' + key) || null;
        if(player && !usedPlayerIds.has(String(player?.playerId || '').trim())) break;
        player = null;
      }
      if(!player){
        for(const key of nameKeys){
          const bucket = anyKeyToPlayers.get(key) || [];
          player = bucket.find(function(candidate){
            const candidateId = String(candidate?.playerId || '').trim();
            return candidateId && !usedPlayerIds.has(candidateId);
          }) || null;
          if(player) break;
        }
      }

      if(!player){
        player = {
          playerId: allocatePlayerId(rosterRow.displayName),
          seasonId: 'nba_1996_historic',
          displayName: rosterRow.displayName,
          firstName: String(rosterRow.displayName || '').trim().split(/\s+/).slice(0, -1).join(' ') || String(rosterRow.displayName || '').trim(),
          lastName: String(rosterRow.displayName || '').trim().split(/\s+/).slice(-1).join(' '),
          teamId: teamId,
          primaryPosition: rosterRow.primaryPosition,
          secondaryPositions: secondaryPositions(rosterRow.primaryPosition),
          status: 'active',
          draftEligible: true,
          bio: rosterRow.displayName + ' is part of the 1995-96 ' + (team.displayName || team.name || 'Historical Team') + ' historical player pool.',
          externalRefs: {}
        };
        players.push(player);
        addedPlayers.push({ teamId: teamId, player: player.displayName });
      }else if(String(player.teamId || '').trim() !== teamId){
        reassignedPlayers.push({
          player: player.displayName,
          fromTeamId: String(player.teamId || '').trim(),
          toTeamId: teamId
        });
      }

      player.teamId = teamId;
      player.primaryPosition = rosterRow.primaryPosition || player.primaryPosition || 'SF';
      player.secondaryPositions = secondaryPositions(player.primaryPosition);
      player.bio = player.displayName + ' is part of the 1995-96 ' + (team.displayName || team.name || 'Historical Team') + ' historical player pool.';

      let totalsRow = null;
      for(const key of nameKeys){
        totalsRow = totalsRows.get(key) || null;
        if(totalsRow) break;
      }
      player.externalRefs = Object.assign({}, player.externalRefs || {}, {
        basketballReference: (totalsRow && totalsRow.href) || rosterRow.href || player.externalRefs?.basketballReference || '',
        basketballReferenceId: (totalsRow && totalsRow.basketballReferenceId) || rosterRow.basketballReferenceId || player.externalRefs?.basketballReferenceId || ''
      });
      if(totalsRow){
        player.seasonStats = buildSeasonStats(totalsRow, teamCode);
        matchedPlayers += 1;
      }else{
        player.seasonStats = buildZeroSeasonStats(teamCode);
        zeroStatPlayers += 1;
      }

      usedPlayerIds.add(String(player.playerId || '').trim());
      reconciledPlayers.push(player);

      const snapshot = snapshotsByPlayerId.get(String(player.playerId || '').trim()) || {
        seasonId: 'nba_1996_historic',
        teamId: teamId,
        playerId: player.playerId,
        rosterRole: 'bench',
        depthTag: '',
        startDate: '1995-11-03',
        endDate: '1996-04-21'
      };
      depthCounts[player.primaryPosition] = (depthCounts[player.primaryPosition] || 0) + 1;
      snapshot.seasonId = 'nba_1996_historic';
      snapshot.teamId = teamId;
      snapshot.playerId = player.playerId;
      snapshot.rosterRole = (depthCounts[player.primaryPosition] === 1) ? 'starter' : 'bench';
      snapshot.depthTag = player.primaryPosition + depthCounts[player.primaryPosition];
      if(!snapshot.startDate) snapshot.startDate = '1995-11-03';
      if(!snapshot.endDate) snapshot.endDate = '1996-04-21';
      reconciledSnapshots.push(snapshot);
    }
  }

  const keptPlayerIds = new Set(reconciledPlayers.map(function(player){
    return String(player?.playerId || '').trim();
  }));
  const removedPlayers = players
    .filter(function(player){ return !keptPlayerIds.has(String(player?.playerId || '').trim()); })
    .map(function(player){ return { teamId: player.teamId, player: player.displayName }; });
  const filteredPlayerGameStats = readJson('player_game_stats.json').filter(function(row){
    return keptPlayerIds.has(String(row?.playerId || '').trim());
  });

  manifest.version = Number(manifest.version || 1) + 1;
  manifest.description = 'A 1995-96 NBA historical season pack reconciled to real team roster pages, with real team-page season totals imported for player ranking, drafting, and season boots.';
  manifest.provenance = Object.assign({}, manifest.provenance || {}, {
    importNotes: 'Player membership was reconciled against Basketball Reference 1995-96 team roster pages, and seasonStats were imported from team totals pages so historical ranking uses real era production instead of sparse seed samples.'
  });
  manifest.notes = [
    'Historical players now carry real 1995-96 regular-season totals and derived per-game stats.',
    'Historical player membership is now reconciled against real 1995-96 roster pages.',
    'Roster-only players with no recorded 1995-96 stats carry explicit zero seasonStats instead of falling back to seed samples.',
    'Historical draft and season ranking should prefer seasonStats over sparse foundation seed rows.'
  ];

  summaries.packSummary = 'The 1995-96 NBA season pack now reconciles to real roster pages and carries real team-page season totals for its player pool, giving Draft The Era and historical season boots a far more authentic ranking foundation.';
  summaries.featuredStorylines = [
    'Real 1995-96 season production now drives historical rankings',
    'Draft The Era pulls from actual season performance instead of seed-only snapshots',
    'Roster-only zero-stat cases are explicit instead of being backfilled by fake production'
  ];

  writeJson('teams.json', teams);
  writeJson('players.json', reconciledPlayers);
  writeJson('roster_snapshots.json', reconciledSnapshots);
  writeJson('player_game_stats.json', filteredPlayerGameStats);
  writeJson('manifest.json', manifest);
  writeJson(path.join('optional', 'summaries.json'), summaries);

  console.log(JSON.stringify({
    status: 'ok',
    matchedPlayers: matchedPlayers,
    zeroStatPlayers: zeroStatPlayers,
    totalPlayers: reconciledPlayers.length,
    addedPlayers: addedPlayers.length,
    removedPlayers: removedPlayers.length,
    reassignedPlayers: reassignedPlayers.length,
    addedSample: addedPlayers.slice(0, 20),
    removedSample: removedPlayers.slice(0, 20),
    reassignedSample: reassignedPlayers.slice(0, 20),
    zeroStatSample: reconciledPlayers.filter(function(player){
      return Number(player?.seasonStats?.games || 0) === 0;
    }).slice(0, 20).map(function(player){
      return { teamId: player.teamId, player: player.displayName };
    })
  }, null, 2));
})().catch(function(error){
  console.error(error);
  process.exitCode = 1;
});
