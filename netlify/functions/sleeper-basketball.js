const SLEEPER_API='https://api.sleeper.app/v1';

function json(statusCode, body, extraHeaders={}){
  return {
    statusCode,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
      ...extraHeaders
    },
    body:JSON.stringify(body)
  };
}

async function sleeper(path){
  const response=await fetch(`${SLEEPER_API}${path}`,{
    headers:{'Accept':'application/json','User-Agent':'RosterBate/1.0'}
  });
  if(!response.ok){
    const text=await response.text().catch(()=> '');
    throw new Error(`Sleeper ${response.status}: ${text.slice(0,180)}`);
  }
  return response.json();
}

exports.handler=async function(event){
  if(event.httpMethod && event.httpMethod!=='GET'){
    return json(405,{error:'Method not allowed'},{Allow:'GET'});
  }

  const params=event.queryStringParameters || {};
  const leagueId=String(params.league || '').trim();
  if(!/^\d{10,25}$/.test(leagueId)){
    return json(400,{error:'A valid Sleeper league id is required.'});
  }

  try{
    const [league,rosters,users,state]=await Promise.all([
      sleeper(`/league/${leagueId}`),
      sleeper(`/league/${leagueId}/rosters`),
      sleeper(`/league/${leagueId}/users`),
      sleeper('/state/nba').catch(()=>({}))
    ]);

    if(!league || String(league.sport || '').toLowerCase()!=='nba'){
      return json(400,{error:'This dashboard currently supports Sleeper NBA leagues only.'});
    }

    const fallbackWeek=Number(state && state.week) || Number(league.settings && league.settings.leg) || 1;
    const requestedWeek=Math.max(1,Math.min(40,Number(params.week) || fallbackWeek));
    const matchups=await sleeper(`/league/${leagueId}/matchups/${requestedWeek}`);

    const playerIds=new Set();
    for(const roster of rosters || []){
      for(const id of roster.players || []) playerIds.add(String(id));
    }
    for(const matchup of matchups || []){
      for(const id of matchup.players || []) playerIds.add(String(id));
      for(const id of matchup.starters || []) if(String(id)!=='0') playerIds.add(String(id));
      for(const id of Object.keys(matchup.players_points || {})) playerIds.add(String(id));
    }

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
    }catch(error){
      players={};
    }

    const userMap={};
    for(const user of users || []) userMap[String(user.user_id)]=user;

    const teams=(rosters || []).map(roster=>{
      const user=userMap[String(roster.owner_id)] || {};
      const metadata=user.metadata || {};
      return {
        roster_id:roster.roster_id,
        owner_id:roster.owner_id,
        display_name:user.display_name || `Roster ${roster.roster_id}`,
        team_name:metadata.team_name || user.display_name || `Roster ${roster.roster_id}`,
        avatar:metadata.avatar || user.avatar || null,
        players:roster.players || [],
        starters:roster.starters || [],
        reserve:roster.reserve || [],
        settings:roster.settings || {}
      };
    });

    return json(200,{
      league:{
        league_id:league.league_id,
        name:league.name,
        sport:league.sport,
        season:league.season,
        status:league.status,
        settings:league.settings || {},
        scoring_settings:league.scoring_settings || {},
        roster_positions:league.roster_positions || []
      },
      state,
      week:requestedWeek,
      teams,
      matchups:matchups || [],
      players
    });
  }catch(error){
    console.error('Sleeper basketball proxy error',error);
    return json(502,{error:'Unable to load Sleeper data right now.',detail:String(error && error.message || error)});
  }
};
