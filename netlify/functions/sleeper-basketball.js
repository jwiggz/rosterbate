const SLEEPER_API='https://api.sleeper.app/v1';
const SLEEPER_ROOT='https://api.sleeper.app';
const SLEEPER_DATA='https://api.sleeper.com';

function json(statusCode, body, extraHeaders={}){
  return {
    statusCode,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'Pragma':'no-cache',
      ...extraHeaders
    },
    body:JSON.stringify(body)
  };
}

async function sleeper(path){
  const response=await fetch(`${SLEEPER_API}${path}`,{
    headers:{'Accept':'application/json','User-Agent':'RosterBate/1.0'},
    cache:'no-store'
  });
  if(!response.ok){
    const text=await response.text().catch(()=> '');
    throw new Error(`Sleeper ${response.status}: ${text.slice(0,180)}`);
  }
  return response.json();
}

async function fetchJson(url){
  const response=await fetch(url,{headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 RosterBate/1.0'},cache:'no-store'});
  if(!response.ok) return null;
  return response.json().catch(()=>null);
}

async function nbaSchedule(season,week){
  const urls=[
    `${SLEEPER_ROOT}/schedule/nba/regular/${encodeURIComponent(season)}`,
    `${SLEEPER_DATA}/schedule/nba/regular/${encodeURIComponent(season)}`
  ];
  for(const url of urls){
    try{
      const rows=await fetchJson(url);
      if(!Array.isArray(rows)) continue;
      return rows.filter(g=>Number(g.week)===Number(week)).map(g=>({
        game_id:String(g.game_id||g.id||''),
        date:String(g.date||g.start_time?.slice?.(0,10)||''),
        home:String(g.home||g.home_team||''),
        away:String(g.away||g.away_team||''),
        week:Number(g.week)||Number(week),
        status:String(g.status||'pre_game')
      })).filter(g=>g.date&&g.home&&g.away);
    }catch(error){/* try fallback */}
  }
  return [];
}

function statValue(stats,key){
  if(!stats||typeof stats!=='object') return null;
  const aliases={
    to:['to','tov','turnovers'],
    tov:['tov','to','turnovers'],
    tpm:['tpm','fg3m','3pm'],
    fg3m:['fg3m','tpm','3pm'],
    pts:['pts','points'],
    reb:['reb','rebs','rebounds'],
    ast:['ast','assists'],
    stl:['stl','steals'],
    blk:['blk','blocks']
  };
  for(const candidate of aliases[key]||[key]){
    const value=Number(stats[candidate]);
    if(Number.isFinite(value)) return value;
  }
  return null;
}

function scoreProjection(stats,scoring){
  let total=0,used=0;
  for(const [key,multiplierRaw] of Object.entries(scoring||{})){
    const multiplier=Number(multiplierRaw);
    if(!Number.isFinite(multiplier)||multiplier===0) continue;
    const value=statValue(stats,key);
    if(value===null) continue;
    total+=value*multiplier;
    used++;
  }
  return used?Math.round(total*100)/100:null;
}

function rowsFrom(raw){
  if(Array.isArray(raw)) return raw;
  if(raw&&typeof raw==='object') return Object.values(raw);
  return [];
}

function projectionRow(row,scoring,gameDate){
  const id=String(row?.player_id||row?.player?.player_id||row?.player?.id||'');
  if(!id) return null;
  const stats=row.stats||row.projection||row.projected_stats||{};
  const points=scoreProjection(stats,scoring);
  if(points===null) return null;
  const gameId=String(row.game_id||row.game?.game_id||row.game?.id||'');
  const date=String(row.date||row.game?.date||gameDate.get(gameId)||'');
  return {id,game_id:gameId,date,points,stats,week:Number(row.week)||null};
}

async function nbaProjections(season,week,schedule,scoring,playerIds){
  const gameDate=new Map((schedule||[]).map(g=>[String(g.game_id),g.date]));
  const validGameIds=new Set((schedule||[]).map(g=>String(g.game_id)).filter(Boolean));
  const validDates=new Set((schedule||[]).map(g=>g.date).filter(Boolean));
  const result={};

  // NBA daily projections are best sourced from the season feed because it can
  // carry one row per game. We only admit rows that map to this fantasy week's
  // exact schedule, so a weekly aggregate can never masquerade as a daily value.
  try{
    const seasonRaw=await fetchJson(`${SLEEPER_DATA}/projections/nba/${encodeURIComponent(season)}?season_type=regular`);
    for(const rawRow of rowsFrom(seasonRaw)){
      const row=projectionRow(rawRow,scoring,gameDate);
      if(!row||!playerIds.has(row.id)) continue;
      const inWeek=(row.game_id&&validGameIds.has(row.game_id))||(row.date&&validDates.has(row.date));
      if(!inWeek) continue;
      if(!row.date&&row.game_id) row.date=gameDate.get(row.game_id)||'';
      if(!row.date) continue;
      if(!result[row.id]) result[row.id]={week_points:null,games:[],source:'game'};
      const duplicate=result[row.id].games.some(g=>(row.game_id&&g.game_id===row.game_id)||(!row.game_id&&g.date===row.date));
      if(!duplicate) result[row.id].games.push({game_id:row.game_id,date:row.date,points:row.points,stats:row.stats});
    }
  }catch(error){/* weekly fallback still available */}

  // Sum only true game-level rows for the weekly projection when available.
  for(const item of Object.values(result)){
    if(item.games.length){
      item.week_points=Math.round(item.games.reduce((sum,g)=>sum+Number(g.points||0),0)*100)/100;
    }
  }

  // Weekly feed is fallback for All Week only. It is deliberately never copied
  // into games[], preventing the same weekly number from appearing on each day.
  try{
    const weeklyRaw=await fetchJson(`${SLEEPER_DATA}/projections/nba/${encodeURIComponent(season)}/${encodeURIComponent(week)}?season_type=regular`);
    for(const rawRow of rowsFrom(weeklyRaw)){
      const row=projectionRow(rawRow,scoring,gameDate);
      if(!row||!playerIds.has(row.id)) continue;
      if(!result[row.id]) result[row.id]={week_points:row.points,games:[],source:'week'};
      else if(result[row.id].week_points===null) result[row.id].week_points=row.points;
    }
  }catch(error){/* projections remain partial */}

  return result;
}

exports.handler=async function(event){
  if(event.httpMethod && event.httpMethod!=='GET') return json(405,{error:'Method not allowed'},{Allow:'GET'});

  const params=event.queryStringParameters || {};
  const leagueId=String(params.league || '').trim();
  if(!/^\d{10,25}$/.test(leagueId)) return json(400,{error:'A valid Sleeper league id is required.'});

  try{
    const [league,rosters,users,state]=await Promise.all([
      sleeper(`/league/${leagueId}`),
      sleeper(`/league/${leagueId}/rosters`),
      sleeper(`/league/${leagueId}/users`),
      sleeper('/state/nba').catch(()=>({}))
    ]);

    if(!league || String(league.sport || '').toLowerCase()!=='nba') return json(400,{error:'This dashboard currently supports Sleeper NBA leagues only.'});

    const fallbackWeek=Number(state && state.week) || Number(league.settings && league.settings.leg) || 1;
    const requestedWeek=Math.max(1,Math.min(40,Number(params.week) || fallbackWeek));
    const season=league.season||state.season||new Date().getFullYear();
    const [matchups,schedule]=await Promise.all([
      sleeper(`/league/${leagueId}/matchups/${requestedWeek}`),
      nbaSchedule(season,requestedWeek)
    ]);

    const playerIds=new Set();
    for(const roster of rosters || []) for(const id of roster.players || []) playerIds.add(String(id));
    for(const matchup of matchups || []){
      for(const id of matchup.players || []) playerIds.add(String(id));
      for(const id of matchup.starters || []) if(String(id)!=='0') playerIds.add(String(id));
      for(const id of Object.keys(matchup.players_points || {})) playerIds.add(String(id));
    }

    const projectionsPromise=nbaProjections(season,requestedWeek,schedule,league.scoring_settings||{},playerIds);

    let players={};
    try{
      const allPlayers=await sleeper('/players/nba');
      for(const id of playerIds){
        const p=allPlayers && allPlayers[id];
        if(!p) continue;
        players[id]={
          player_id:String(p.player_id || id),
          full_name:p.full_name || [p.first_name,p.last_name].filter(Boolean).join(' ') || `Player ${id}`,
          first_name:p.first_name || '',
          last_name:p.last_name || '',
          team:p.team || '',
          position:p.position || '',
          fantasy_positions:p.fantasy_positions || [],
          number:p.number || null,
          injury_status:p.injury_status || null,
          status:p.status || null,
          active:p.active !== false
        };
      }
    }catch(error){players={};}

    const projections=await projectionsPromise.catch(()=>({}));
    const userMap={};
    for(const user of users || []) userMap[String(user.user_id)]=user;
    const teams=(rosters || []).map(roster=>{
      const user=userMap[String(roster.owner_id)] || {},metadata=user.metadata || {};
      return {roster_id:roster.roster_id,owner_id:roster.owner_id,display_name:user.display_name || `Roster ${roster.roster_id}`,team_name:metadata.team_name || user.display_name || `Roster ${roster.roster_id}`,avatar:metadata.avatar || user.avatar || null,players:roster.players || [],starters:roster.starters || [],reserve:roster.reserve || [],settings:roster.settings || {}};
    });

    return json(200,{
      league:{league_id:league.league_id,name:league.name,sport:league.sport,season:league.season,status:league.status,settings:league.settings || {},scoring_settings:league.scoring_settings || {},roster_positions:league.roster_positions || []},
      state,week:requestedWeek,schedule,projections,teams,matchups:matchups || [],players
    });
  }catch(error){
    console.error('Sleeper basketball proxy error',error);
    return json(502,{error:'Unable to load Sleeper data right now.',detail:String(error && error.message || error)});
  }
};
