(function(global){
  'use strict';

  const MEMORY_VERSION=1;

  function clone(value){
    try{
      return JSON.parse(JSON.stringify(value));
    }catch(e){
      return null;
    }
  }

  function roundOne(value){
    const num=Number(value);
    if(!Number.isFinite(num)) return 0;
    return Math.round(num*10)/10;
  }

  function normalizeAbbr(value){
    return String(value || '').trim().toUpperCase();
  }

  function getTeams(state){
    return Array.isArray(state?.leagueShell?.teams) ? state.leagueShell.teams : [];
  }

  function getTeamByIndex(state, idx){
    const teams=getTeams(state);
    return teams[Number(idx)] || {};
  }

  function getTeamName(state, idx, abbr, fallback){
    const team=getTeamByIndex(state, idx);
    return String(team?.name || fallback || abbr || ('Team '+(Number(idx)+1))).trim();
  }

  function getTeamAbbr(state, idx, explicit){
    const team=getTeamByIndex(state, idx);
    return normalizeAbbr(explicit || team?.abbr || ('T'+Number(idx)));
  }

  function getGameTeams(state, game){
    const homeIdx=Number(game?.home);
    const awayIdx=Number(game?.away);
    const homeAbbr=getTeamAbbr(state, homeIdx, game?.homeAbbr);
    const awayAbbr=getTeamAbbr(state, awayIdx, game?.awayAbbr);
    return {
      homeIdx,
      awayIdx,
      homeAbbr,
      awayAbbr,
      homeName:getTeamName(state, homeIdx, homeAbbr, game?.homeName),
      awayName:getTeamName(state, awayIdx, awayAbbr, game?.awayName)
    };
  }

  function getGameScores(game){
    const homeScore=Number(game?.homeScore ?? game?.homeTotal ?? 0);
    const awayScore=Number(game?.awayScore ?? game?.awayTotal ?? 0);
    return { homeScore, awayScore, margin:Math.abs(homeScore-awayScore) };
  }

  function getWinnerSide(game){
    const explicit=String(game?.winner || '').trim().toLowerCase();
    if(explicit==='home' || explicit==='away') return explicit;
    const scores=getGameScores(game);
    return scores.homeScore >= scores.awayScore ? 'home' : 'away';
  }

  function getGameWinner(state, game){
    const teams=getGameTeams(state, game);
    const side=getWinnerSide(game);
    return side==='home'
      ? { side, idx:teams.homeIdx, abbr:teams.homeAbbr, name:teams.homeName }
      : { side, idx:teams.awayIdx, abbr:teams.awayAbbr, name:teams.awayName };
  }

  function getGameOpponentForSide(teams, side){
    return side==='home'
      ? { idx:teams.awayIdx, abbr:teams.awayAbbr, name:teams.awayName }
      : { idx:teams.homeIdx, abbr:teams.homeAbbr, name:teams.homeName };
  }

  function pairKey(leftAbbr, rightAbbr){
    return [normalizeAbbr(leftAbbr), normalizeAbbr(rightAbbr)].sort().join('_');
  }

  function buildRivalries(state, logs){
    const groups=new Map();
    logs.forEach(function(game){
      const teams=getGameTeams(state, game);
      const scores=getGameScores(game);
      const key=pairKey(teams.awayAbbr, teams.homeAbbr);
      const existing=groups.get(key) || {
        key,
        teams:[
          { abbr:teams.awayAbbr, name:teams.awayName, wins:0 },
          { abbr:teams.homeAbbr, name:teams.homeName, wins:0 }
        ],
        meetings:0,
        averageMargin:0,
        margins:[],
        lastResult:null,
        recentWinners:[]
      };
      existing.meetings+=1;
      existing.margins.push(scores.margin);
      const winner=getGameWinner(state, game);
      const loser=getGameOpponentForSide(teams, winner.side);
      const winnerTeam=existing.teams.find(function(team){ return team.abbr===winner.abbr; });
      if(winnerTeam) winnerTeam.wins+=1;
      existing.recentWinners.push(winner.abbr);
      existing.lastResult={
        day:Number(game?.day || 0),
        winnerAbbr:winner.abbr,
        winnerName:winner.name,
        loserAbbr:loser.abbr,
        loserName:loser.name,
        margin:roundOne(scores.margin),
        score:`${Math.round(Math.max(scores.homeScore,scores.awayScore))}-${Math.round(Math.min(scores.homeScore,scores.awayScore))}`
      };
      groups.set(key, existing);
    });
    return Array.from(groups.values()).map(function(group){
      group.averageMargin=roundOne(group.margins.reduce(function(sum,value){ return sum+Number(value||0); },0)/Math.max(1,group.margins.length));
      const sortedTeams=group.teams.slice().sort(function(a,b){ return Number(b.wins||0)-Number(a.wins||0) || a.name.localeCompare(b.name); });
      const leader=sortedTeams[0] || group.teams[0] || {};
      const trailer=sortedTeams[1] || group.teams[1] || {};
      const recent=group.recentWinners.slice().reverse();
      let streak=0;
      recent.forEach(function(abbr,index){
        if(index===0 || abbr===recent[0]) streak+=1;
      });
      group.leaderAbbr=leader.abbr || '';
      group.leaderName=leader.name || '';
      group.leaderWins=Number(leader.wins || 0);
      group.trailerAbbr=trailer.abbr || '';
      group.trailerName=trailer.name || '';
      group.trailerWins=Number(trailer.wins || 0);
      group.streakAbbr=recent[0] || '';
      group.streakCount=streak;
      group.summary=group.meetings>1 && group.streakCount>1
        ? `${group.leaderName} have taken ${group.streakCount} straight from ${group.trailerName}.`
        : `${group.leaderName} lead the season series ${group.leaderWins}-${group.trailerWins} over ${group.trailerName}.`;
      delete group.margins;
      delete group.recentWinners;
      return group;
    }).sort(function(a,b){
      return Number(b.meetings||0)-Number(a.meetings||0) ||
        Number(b.streakCount||0)-Number(a.streakCount||0) ||
        Number(b.averageMargin||0)-Number(a.averageMargin||0);
    }).slice(0,8);
  }

  function collectSignatureGames(state, logs){
    const lines=[];
    logs.forEach(function(game){
      const teams=getGameTeams(state, game);
      ['away','home'].forEach(function(side){
        const entries=Array.isArray(game?.[side+'Entries']) ? game[side+'Entries'] : [];
        const rosterTeam=side==='home'
          ? { idx:teams.homeIdx, abbr:teams.homeAbbr, name:teams.homeName }
          : { idx:teams.awayIdx, abbr:teams.awayAbbr, name:teams.awayName };
        const opponent=getGameOpponentForSide(teams, side);
        entries.forEach(function(entry){
          const player=entry?.player || {};
          const fantasyPoints=roundOne(entry?.finalScore || entry?.score || 0);
          if(fantasyPoints<=0) return;
          const winner=getGameWinner(state, game);
          const won=winner.abbr===rosterTeam.abbr;
          lines.push({
            type:'signature',
            day:Number(game?.day || 0),
            week:Number(game?.week || 0),
            playerId:player?.id || null,
            playerName:String(player?.name || 'Player'),
            playerTeam:String(player?.team || ''),
            pos:String(player?.pos || player?.primaryPosition || ''),
            rosterTeamAbbr:rosterTeam.abbr,
            rosterTeamName:rosterTeam.name,
            opponentAbbr:opponent.abbr,
            opponentName:opponent.name,
            fantasyPoints,
            won,
            summary:`${String(player?.name || 'Player')} posted ${fantasyPoints.toFixed(1)} FP for ${rosterTeam.name} ${won?'in a win over':'against'} ${opponent.name}.`
          });
        });
      });
    });
    return lines.sort(function(a,b){
      return Number(b.fantasyPoints||0)-Number(a.fantasyPoints||0) ||
        Number(b.day||0)-Number(a.day||0);
    }).slice(0,10);
  }

  function buildMomentum(state){
    const standings=Array.isArray(state?.seasonState?.standings) ? state.seasonState.standings : [];
    return standings.map(function(row, index){
      const idx=Number(row?.teamIdx ?? index);
      const abbr=getTeamAbbr(state, idx, row?.teamAbbr);
      const name=getTeamName(state, idx, abbr, row?.teamName);
      const wins=Number(row?.w || 0);
      const losses=Number(row?.l || 0);
      const streak=String(row?.streak || '').trim() || 'EVEN';
      return {
        type:'momentum',
        teamIdx:idx,
        teamAbbr:abbr,
        teamName:name,
        wins,
        losses,
        winPct:roundOne((wins/Math.max(1,wins+losses))*100)/100,
        streak,
        summary:`${name} are ${wins}-${losses} with a ${streak} run.`
      };
    }).sort(function(a,b){
      return Number(b.wins||0)-Number(a.wins||0) ||
        Number(a.losses||0)-Number(b.losses||0) ||
        a.teamName.localeCompare(b.teamName);
    }).slice(0,8);
  }

  function buildNotableMatchups(state, logs){
    return logs.map(function(game){
      const teams=getGameTeams(state, game);
      const scores=getGameScores(game);
      const winner=getGameWinner(state, game);
      const loser=getGameOpponentForSide(teams, winner.side);
      const type=scores.margin<=3 ? 'close' : (scores.margin>=20 ? 'blowout' : 'result');
      const marginLabel=roundOne(scores.margin);
      return {
        type,
        day:Number(game?.day || 0),
        week:Number(game?.week || 0),
        winnerAbbr:winner.abbr,
        winnerName:winner.name,
        loserAbbr:loser.abbr,
        loserName:loser.name,
        margin:marginLabel,
        summary:type==='close'
          ? `${winner.name} edged ${loser.name} by ${marginLabel.toFixed(1)}.`
          : type==='blowout'
            ? `${winner.name} buried ${loser.name} by ${Math.round(marginLabel)} points.`
            : `${winner.name} beat ${loser.name} by ${marginLabel.toFixed(1)}.`
      };
    }).filter(function(entry){
      return entry.type==='close' || entry.type==='blowout';
    }).sort(function(a,b){
      return Number(b.day||0)-Number(a.day||0) ||
        Number(b.margin||0)-Number(a.margin||0);
    }).slice(0,10);
  }

  function getCompletedLogs(state){
    return (Array.isArray(state?.seasonState?.completedGameLogs) ? state.seasonState.completedGameLogs : [])
      .filter(function(game){
        return game && (game.homeAbbr || Number.isFinite(Number(game.home))) && (game.awayAbbr || Number.isFinite(Number(game.away)));
      });
  }

  function buildSimulationLeagueMemory(state, existingMemory){
    const source=state && typeof state==='object' ? state : {};
    const logs=getCompletedLogs(source);
    const memory={
      version:MEMORY_VERSION,
      generatedAt:Date.now(),
      generatedFromGameCount:logs.length,
      rivalries:buildRivalries(source, logs),
      signatureGames:collectSignatureGames(source, logs),
      momentum:buildMomentum(source),
      notableMatchups:buildNotableMatchups(source, logs)
    };
    if(existingMemory && typeof existingMemory==='object'){
      memory.previousGeneratedAt=Number(existingMemory.generatedAt || 0) || null;
    }
    return memory;
  }

  function buildSimulationLeagueMemoryBeats(memory, options){
    const source=memory && typeof memory==='object' ? memory : {};
    const limit=Math.max(1, Number(options?.limit || 5));
    const beats=[];
    (source.signatureGames || []).slice(0,2).forEach(function(entry){
      beats.push({ type:'signature', tone:'gold', title:'Signature Game', text:entry.summary, day:entry.day });
    });
    (source.rivalries || []).filter(function(entry){ return Number(entry.meetings||0)>1; }).slice(0,2).forEach(function(entry){
      beats.push({ type:'rivalry', tone:'blue', title:'Rivalry Memory', text:entry.summary, day:entry.lastResult?.day || 0 });
    });
    (source.momentum || []).slice(0,2).forEach(function(entry){
      beats.push({ type:'momentum', tone:'green', title:'Season Momentum', text:entry.summary, day:Number(options?.day || 0) });
    });
    (source.notableMatchups || []).slice(0,2).forEach(function(entry){
      beats.push({ type:entry.type, tone:entry.type==='close'?'orange':'red', title:entry.type==='close'?'Close Finish':'Statement Win', text:entry.summary, day:entry.day });
    });
    return beats.slice(0, limit).map(function(beat, index){
      return Object.assign({ id:`memory_${index}_${String(beat.type || 'beat')}` }, beat);
    });
  }

  const api={
    buildSimulationLeagueMemory,
    buildSimulationLeagueMemoryBeats,
    clone
  };

  if(typeof module!=='undefined' && module.exports){
    module.exports=api;
  }
  global.RosterBateSimulationLeagueMemory=api;
})(typeof window!=='undefined' ? window : globalThis);
