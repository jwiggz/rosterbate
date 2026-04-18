(()=>{
  'use strict';

  const fs=require('fs');
  const path=require('path');

  const repoRoot=__dirname;
  const packRoot=path.join(repoRoot,'historical-packs','nba_1996_full_season_v1');
  const COVERAGE_ROUNDS=12;
  const ACTIVE_PLAYERS_PER_TEAM=12;

  function readJson(relativePath){
    return JSON.parse(fs.readFileSync(path.join(packRoot, relativePath), 'utf8'));
  }

  function writeJson(relativePath, data){
    fs.writeFileSync(path.join(packRoot, relativePath), JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  function round1(value){
    const num=Number(value||0);
    return Number.isFinite(num) ? Math.round(num*10)/10 : 0;
  }

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function addDays(isoDate, days){
    const date=new Date(isoDate+'T12:00:00Z');
    date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  }

  function hashNumber(input){
    const text=String(input||'');
    let hash=0;
    for(let i=0;i<text.length;i+=1){
      hash=((hash<<5)-hash)+text.charCodeAt(i);
      hash|=0;
    }
    return Math.abs(hash);
  }

  function noise(input, min, max){
    const span=max-min+1;
    return min + (hashNumber(input)%span);
  }

  function fpFromStats(stats){
    return round1(
      Number(stats?.pts||0)
      + (Number(stats?.reb||0) * 1.2)
      + (Number(stats?.ast||0) * 1.5)
      + (Number(stats?.stl||0) * 3)
      + (Number(stats?.blk||0) * 3)
      - Number(stats?.to||0)
    );
  }

  function getTemplate(position, rosterRole){
    const templates={
      PG:{pts:16.4,reb:3.5,ast:8.3,stl:1.5,blk:0.2,to:2.8,min:34.0,fgm:6.1,fga:13.4,ftm:2.3,fta:2.9,threes:1.9},
      SG:{pts:19.1,reb:4.3,ast:4.1,stl:1.4,blk:0.4,to:2.5,min:35.0,fgm:7.1,fga:15.8,ftm:3.2,fta:4.1,threes:1.8},
      SF:{pts:17.6,reb:5.9,ast:4.0,stl:1.2,blk:0.6,to:2.4,min:35.0,fgm:6.6,fga:14.6,ftm:2.8,fta:3.6,threes:1.3},
      PF:{pts:18.7,reb:8.7,ast:3.1,stl:1.0,blk:0.9,to:2.4,min:36.0,fgm:7.0,fga:14.8,ftm:3.5,fta:4.5,threes:0.4},
      C:{pts:20.1,reb:10.6,ast:2.6,stl:0.8,blk:1.9,to:2.7,min:36.0,fgm:7.7,fga:15.5,ftm:4.2,fta:5.7,threes:0.1}
    };
    const base={...(templates[String(position||'').toUpperCase()] || templates.SF)};
    const role=String(rosterRole||'').toLowerCase();
    if(role==='rotation' || role==='bench'){
      Object.keys(base).forEach(key=>{
        if(key==='min') base[key]=round1(base[key]-8);
        else if(key==='to') base[key]=round1(Math.max(0.7, base[key]-0.6));
        else if(key==='threes') base[key]=round1(Math.max(0, base[key]-0.4));
        else base[key]=round1(Math.max(0.4, base[key]*0.66));
      });
    }
    return base;
  }

  function buildRoundRobinRounds(teamIds, rounds){
    const ids=teamIds.slice();
    if(ids.length % 2===1) ids.push('__BYE__');
    const rotation=ids.slice();
    const scheduleRounds=[];
    for(let round=0;round<rounds;round+=1){
      const pairings=[];
      for(let i=0;i<rotation.length/2;i+=1){
        const left=rotation[i];
        const right=rotation[rotation.length-1-i];
        if(left!=='__BYE__' && right!=='__BYE__'){
          const flip=((round+i)%2)===1;
          pairings.push(flip ? {home:right, away:left} : {home:left, away:right});
        }
      }
      scheduleRounds.push(pairings);
      const fixed=rotation[0];
      const moved=rotation.splice(1);
      moved.unshift(moved.pop());
      rotation.splice(0, rotation.length, fixed, ...moved);
    }
    return scheduleRounds;
  }

  function getDepthRank(depthTag){
    const raw=String(depthTag||'').trim();
    const match=raw.match(/(\d+)$/);
    return match ? Number(match[1]) : 99;
  }

  const manifest=readJson('manifest.json');
  const teams=readJson('teams.json');
  const players=readJson('players.json');
  const rosterSnapshots=readJson('roster_snapshots.json');
  let schedule=readJson('schedule.json');
  let games=readJson('games.json');
  let playerGameStats=readJson('player_game_stats.json');
  const summaries=readJson(path.join('optional','summaries.json'));

  const playerById=new Map(players.map(player=>[player.playerId, player]));
  const teamById=new Map(teams.map(team=>[team.teamId, team]));

  const aggregateByPlayerId=new Map();
  playerGameStats.forEach(row=>{
    const playerId=String(row?.playerId||'').trim();
    if(!playerId) return;
    const current=aggregateByPlayerId.get(playerId) || {count:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0,min:0,fgm:0,fga:0,ftm:0,fta:0,threes:0};
    current.count += 1;
    current.pts += Number(row?.points||0);
    current.reb += Number(row?.rebounds||0);
    current.ast += Number(row?.assists||0);
    current.stl += Number(row?.steals||0);
    current.blk += Number(row?.blocks||0);
    current.to += Number(row?.turnovers||0);
    current.min += Number(row?.minutes||0);
    current.fgm += Number(row?.fgm||0);
    current.fga += Number(row?.fga||0);
    current.ftm += Number(row?.ftm||0);
    current.fta += Number(row?.fta||0);
    current.threes += Number(row?.threePointersMade||0);
    aggregateByPlayerId.set(playerId, current);
  });

  const baselineByPlayerId=new Map();
  rosterSnapshots.forEach(snapshot=>{
    const playerId=String(snapshot?.playerId||'').trim();
    const player=playerById.get(playerId);
    if(!player) return;
    const aggregate=aggregateByPlayerId.get(playerId);
    const rosterRole=String(snapshot?.rosterRole||'rotation').trim().toLowerCase() || 'rotation';
    const baseline=(aggregate && aggregate.count)
      ? {
          pts: round1(aggregate.pts / aggregate.count),
          reb: round1(aggregate.reb / aggregate.count),
          ast: round1(aggregate.ast / aggregate.count),
          stl: round1(aggregate.stl / aggregate.count),
          blk: round1(aggregate.blk / aggregate.count),
          to: round1(aggregate.to / aggregate.count),
          min: round1(aggregate.min / aggregate.count),
          fgm: round1(aggregate.fgm / aggregate.count),
          fga: round1(aggregate.fga / aggregate.count),
          ftm: round1(aggregate.ftm / aggregate.count),
          fta: round1(aggregate.fta / aggregate.count),
          threes: round1(aggregate.threes / aggregate.count)
        }
      : getTemplate(player.primaryPosition, rosterRole);
    baseline.fp=fpFromStats(baseline);
    baselineByPlayerId.set(playerId, baseline);
  });

  const rosterByTeamId=new Map();
  rosterSnapshots.forEach(snapshot=>{
    const player=playerById.get(snapshot.playerId);
    const team=teamById.get(snapshot.teamId);
    if(!player || !team) return;
    const roster=rosterByTeamId.get(team.teamId) || [];
    roster.push({
      playerId: player.playerId,
      teamId: team.teamId,
      position: String(player.primaryPosition||'SF').toUpperCase(),
      rosterRole: String(snapshot.rosterRole||'rotation').toLowerCase() || 'rotation',
      depthRank: getDepthRank(snapshot.depthTag),
      baseline: baselineByPlayerId.get(player.playerId) || getTemplate(player.primaryPosition, snapshot.rosterRole)
    });
    rosterByTeamId.set(team.teamId, roster);
  });
  rosterByTeamId.forEach(roster=>{
    roster.sort((a,b)=>(a.depthRank-b.depthRank) || (Number(b?.baseline?.fp||0)-Number(a?.baseline?.fp||0)) || a.playerId.localeCompare(b.playerId));
  });

  const teamStrengthById=new Map();
  rosterByTeamId.forEach((roster, teamId)=>{
    const topRotation=roster.slice(0,8);
    const score=topRotation.reduce((sum, entry)=>sum + Number(entry?.baseline?.fp||0), 0);
    teamStrengthById.set(teamId, score || 100);
  });

  const existingGameIds=new Set(schedule.map(game=>String(game.gameId||'').trim()));
  const existingStatKeys=new Set(playerGameStats.map(row=>String(row.playerId||'').trim()+'|'+String(row.gameId||'').trim()));
  const existingGameNumber=schedule.reduce((max, game)=>Math.max(max, Number(game?.gameNumber||0)), 0);
  const lastDate=schedule.map(game=>String(game?.gameDate||'').trim()).filter(Boolean).sort().pop() || '1995-11-03';

  const rounds=buildRoundRobinRounds(teams.map(team=>team.teamId), COVERAGE_ROUNDS);
  const newSchedule=[];
  const newGames=[];
  const newStats=[];
  let nextGameNumber=existingGameNumber;

  function buildGeneratedStatLine(entry, game, teamStrength, opponentStrength, depthIndex){
    const baseline=entry.baseline || getTemplate(entry.position, entry.rosterRole);
    const minuteTargets=[36,34,32,31,29,27,24,21,18,15,12,9];
    const targetMinutes=minuteTargets[Math.min(depthIndex, minuteTargets.length-1)] || 8;
    const baselineMinutes=Math.max(8, Number(baseline.min||targetMinutes));
    const pressureFactor=clamp(1 + ((teamStrength-opponentStrength)/700), 0.92, 1.08);
    const gameFactor=clamp(1 + (noise(game.gameId+'|'+entry.playerId+'|pace', -8, 8) / 100), 0.88, 1.12);
    const usageFactor=depthIndex<3 ? 1.03 : (depthIndex>8 ? 0.94 : 1);
    const minutes=round1(clamp(targetMinutes + noise(game.gameId+'|'+entry.playerId+'|min', -2, 3), 6, 40));
    const scale=(minutes / baselineMinutes) * pressureFactor * gameFactor * usageFactor;

    const pts=round1(Math.max(0, Number(baseline.pts||0) * scale + noise(game.gameId+'|'+entry.playerId+'|pts', -2, 4)));
    const reb=round1(Math.max(0, Number(baseline.reb||0) * (minutes / baselineMinutes) * gameFactor + noise(game.gameId+'|'+entry.playerId+'|reb', -1, 2)));
    const ast=round1(Math.max(0, Number(baseline.ast||0) * (minutes / baselineMinutes) * gameFactor + noise(game.gameId+'|'+entry.playerId+'|ast', -1, 2)));
    const stl=round1(Math.max(0, Number(baseline.stl||0) * (minutes / baselineMinutes) + noise(game.gameId+'|'+entry.playerId+'|stl', -1, 1) * 0.4));
    const blk=round1(Math.max(0, Number(baseline.blk||0) * (minutes / baselineMinutes) + noise(game.gameId+'|'+entry.playerId+'|blk', -1, 1) * 0.4));
    const to=round1(Math.max(0, Number(baseline.to||0) * (minutes / baselineMinutes) * usageFactor + noise(game.gameId+'|'+entry.playerId+'|to', -1, 1) * 0.5));
    const threes=round1(Math.max(0, Number(baseline.threes||0) * scale + noise(game.gameId+'|'+entry.playerId+'|3pm', -1, 1) * 0.6));

    const fgRate=clamp(Number(baseline.fgm||1) / Math.max(1, Number(baseline.fga||2)), 0.35, 0.68);
    const ftRate=clamp(Number(baseline.ftm||1) / Math.max(1, Number(baseline.fta||2)), 0.55, 0.94);
    const fga=round1(Math.max(1, Number(baseline.fga||8) * (minutes / baselineMinutes) * usageFactor + noise(game.gameId+'|'+entry.playerId+'|fga', -2, 3)));
    const fgm=round1(Math.max(0, Math.min(fga, fga * fgRate + noise(game.gameId+'|'+entry.playerId+'|fgm', -1, 1))));
    const fta=round1(Math.max(0, Number(baseline.fta||2) * (minutes / baselineMinutes) + noise(game.gameId+'|'+entry.playerId+'|fta', -1, 2)));
    const ftm=round1(Math.max(0, Math.min(fta, fta * ftRate + noise(game.gameId+'|'+entry.playerId+'|ftm', -1, 1))));

    return {
      playerId: entry.playerId,
      gameId: game.gameId,
      seasonId: game.seasonId,
      teamId: entry.teamId,
      opponentTeamId: game.homeTeamId===entry.teamId ? game.awayTeamId : game.homeTeamId,
      minutes: minutes,
      points: pts,
      rebounds: reb,
      assists: ast,
      steals: stl,
      blocks: blk,
      turnovers: to,
      threePointersMade: threes,
      fgm: fgm,
      fga: fga,
      ftm: ftm,
      fta: fta
    };
  }

  rounds.forEach((pairings, roundIndex)=>{
    const gameDate=addDays(lastDate, roundIndex + 1);
    const weekLabel='Week ' + (Math.floor(roundIndex / 7) + 1);
    const dayLabel='Day ' + (roundIndex + 1);
    pairings.forEach(pairing=>{
      nextGameNumber += 1;
      const gameId='nba_1996_game_' + String(nextGameNumber).padStart(4,'0');
      if(existingGameIds.has(gameId)) return;
      const scheduleRow={
        gameId: gameId,
        seasonId: 'nba_1996_historic',
        gameDate: gameDate,
        homeTeamId: pairing.home,
        awayTeamId: pairing.away,
        isRegularSeason: true,
        gameNumber: nextGameNumber,
        weekLabel: weekLabel,
        dayLabel: dayLabel
      };

      const homeRoster=(rosterByTeamId.get(pairing.home) || []).slice(0, ACTIVE_PLAYERS_PER_TEAM);
      const awayRoster=(rosterByTeamId.get(pairing.away) || []).slice(0, ACTIVE_PLAYERS_PER_TEAM);
      const homeStrength=Number(teamStrengthById.get(pairing.home) || 100);
      const awayStrength=Number(teamStrengthById.get(pairing.away) || 100);
      let homeScore=0;
      let awayScore=0;

      homeRoster.forEach((entry, idx)=>{
        const key=entry.playerId+'|'+gameId;
        if(existingStatKeys.has(key)) return;
        const row=buildGeneratedStatLine(entry, scheduleRow, homeStrength, awayStrength, idx);
        newStats.push(row);
        existingStatKeys.add(key);
        homeScore += Number(row.points||0);
      });
      awayRoster.forEach((entry, idx)=>{
        const key=entry.playerId+'|'+gameId;
        if(existingStatKeys.has(key)) return;
        const row=buildGeneratedStatLine(entry, scheduleRow, awayStrength, homeStrength, idx);
        newStats.push(row);
        existingStatKeys.add(key);
        awayScore += Number(row.points||0);
      });

      const roundedHome=Math.max(78, Math.round(homeScore));
      let roundedAway=Math.max(76, Math.round(awayScore));
      if(roundedHome===roundedAway) roundedAway=Math.max(70, roundedAway-1);

      newSchedule.push(scheduleRow);
      newGames.push({
        gameId: gameId,
        seasonId: 'nba_1996_historic',
        status: 'final',
        homeScore: roundedHome,
        awayScore: roundedAway,
        winnerTeamId: roundedHome>roundedAway ? pairing.home : pairing.away,
        loserTeamId: roundedHome>roundedAway ? pairing.away : pairing.home
      });
      existingGameIds.add(gameId);
    });
  });

  schedule=schedule.concat(newSchedule);
  games=games.concat(newGames);
  playerGameStats=playerGameStats.concat(newStats);

  manifest.version=Number(manifest.version||1)+1;
  manifest.updatedAt=new Date().toISOString();
  manifest.description='A fuller 1995-96 NBA historical foundation pack with full-league benches and expanded authored game/stat coverage for season boots and Draft The Era testing.';
  manifest.provenance=manifest.provenance||{};
  manifest.provenance.importNotes='Expanded from the full-league roster foundation with additional authored schedule, game, and player stat coverage while keeping the local historical pack format stable.';
  manifest.notes=[
    'Carries a full-league 1995-96 player base for historical season and draft experiments.',
    'Includes expanded authored schedule and generated stat coverage for richer historical boots.',
    'Keeps the same local pack schema used by the validator, importer, and localhost dev runner.'
  ];

  summaries.packSummary='The 1995-96 NBA season pack now carries a much fuller historical universe: all 29 franchises, a deeper 445-player pool, and expanded game/stat coverage so season boots and Draft The Era runs have more texture right away.';
  summaries.featuredStorylines=[
    'The 72-win Bulls chase',
    'A full-league Draft The Era sandbox',
    'Deeper authored schedule and stat coverage across the 1995-96 universe'
  ];

  writeJson('manifest.json', manifest);
  writeJson('schedule.json', schedule);
  writeJson('games.json', games);
  writeJson('player_game_stats.json', playerGameStats);
  writeJson(path.join('optional','summaries.json'), summaries);

  console.log(JSON.stringify({
    status:'ok',
    addedGames:newGames.length,
    totalGames:games.length,
    addedScheduleRows:newSchedule.length,
    totalScheduleRows:schedule.length,
    addedPlayerGameStats:newStats.length,
    totalPlayerGameStats:playerGameStats.length
  }, null, 2));
})();
