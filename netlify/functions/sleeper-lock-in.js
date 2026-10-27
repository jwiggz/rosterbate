function json(statusCode, body){
  return {
    statusCode,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'Pragma':'no-cache'
    },
    body:JSON.stringify(body)
  };
}

function normalizeToken(value){
  let token=String(value||'').trim();
  token=token.replace(/^authorization\s*:\s*/i,'').trim();
  token=token.replace(/^bearer\s+/i,'').trim();
  if((token.startsWith('"')&&token.endsWith('"'))||(token.startsWith("'")&&token.endsWith("'"))) token=token.slice(1,-1).trim();
  return token;
}

function validToken(value){
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value||''));
}

function validSnowflake(value){
  return /^\d{10,25}$/.test(String(value||''));
}

async function gql(token,opName,query,variables={}){
  const response=await fetch('https://sleeper.com/graphql',{
    method:'POST',
    headers:{
      'Accept':'application/json',
      'Content-Type':'application/json',
      'Authorization':token,
      'X-Sleeper-GraphQL-Op':opName,
      'User-Agent':'RosterBate/1.0'
    },
    body:JSON.stringify({operationName:opName,query,variables})
  });
  const text=await response.text();
  let body;
  try{body=JSON.parse(text)}catch{body={raw:text.slice(0,1000)}}
  if(!response.ok) throw Object.assign(new Error(`Sleeper HTTP ${response.status}`),{status:response.status,body});
  if(Array.isArray(body?.errors)&&body.errors.length) throw Object.assign(new Error(body.errors[0]?.message||'Sleeper GraphQL error'),{status:400,body});
  return body?.data||{};
}

async function readLeg(token,leagueId,round,rosterId){
  const query=`query matchup_legs {\n  matchup_legs(league_id: \"${leagueId}\", round: ${round}) {\n    roster_id\n    matchup_id\n    starters\n    starters_games\n    points\n  }\n}`;
  const data=await gql(token,'matchup_legs',query,{});
  const rows=Array.isArray(data?.matchup_legs)?data.matchup_legs:[];
  return rows.find(row=>Number(row.roster_id)===Number(rosterId))||null;
}

exports.handler=async function(event){
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'});

  let body;
  try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON body'})}

  const token=normalizeToken(body.token);
  const leagueId=String(body.leagueId||'').trim();
  const rosterId=Number(body.rosterId);
  const leg=Number(body.leg);
  const round=Number(body.round??body.leg);
  const playerId=String(body.playerId||'').trim();
  const gameId=String(body.gameId||'').trim();

  if(!validToken(token)) return json(400,{error:'A valid Sleeper session token is required.'});
  if(!validSnowflake(leagueId)) return json(400,{error:'Invalid league id.'});
  if(!Number.isInteger(rosterId)||rosterId<1) return json(400,{error:'Invalid roster id.'});
  if(!Number.isInteger(leg)||leg<1||leg>40||!Number.isInteger(round)||round<1||round>40) return json(400,{error:'Invalid scoring period.'});
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(playerId)) return json(400,{error:'Invalid player id.'});
  if(!/^\d{6,25}$/.test(gameId)) return json(400,{error:'Invalid NBA game id.'});

  try{
    const leagueResponse=await fetch(`https://api.sleeper.app/v1/league/${leagueId}`,{headers:{'Accept':'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});
    if(!leagueResponse.ok) return json(400,{error:'Unable to validate Sleeper league.'});
    const league=await leagueResponse.json();
    if(String(league?.sport||'').toLowerCase()!=='nba') return json(400,{error:'Lock-In writes are enabled for Sleeper NBA leagues only.'});

    const current=await readLeg(token,leagueId,round,rosterId);
    if(!current) return json(404,{error:'Unable to load the private Sleeper matchup leg for this roster.'});

    const starters=Array.isArray(current.starters)?current.starters.map(String):[];
    if(!starters.includes(playerId)) return json(400,{error:'Sleeper only allows a completed game to be locked if that player was in the starting lineup.'});

    const existing=(current.starters_games&&typeof current.starters_games==='object'&&!Array.isArray(current.starters_games))?current.starters_games:{};
    if(existing[playerId]){
      return json(409,{error:'This player already has a locked game for the week.',startersGames:existing});
    }

    const startersGames={...existing,[playerId]:gameId};
    const mutation=`mutation update_matchup_leg($starters_games: Map) {\n  update_matchup_leg(league_id: \"${leagueId}\",roster_id: ${rosterId},leg: ${leg},round: ${round},starters: ${JSON.stringify(starters)},starters_games: $starters_games){\n    league_id\n    leg\n    matchup_id\n    roster_id\n    round\n    starters\n    starters_games\n    points\n  }\n}`;

    const data=await gql(token,'update_matchup_leg',mutation,{starters_games:startersGames});
    const updated=data?.update_matchup_leg;
    if(!updated) return json(502,{error:'Sleeper did not return an updated matchup.'});
    const returned=updated.starters_games&&typeof updated.starters_games==='object'?updated.starters_games:{};
    if(String(returned[playerId]||'')!==gameId) return json(409,{error:'Sleeper responded, but the requested game was not present in starters_games.',matchup:updated});

    return json(200,{ok:true,playerId,gameId,matchup:updated,startersGames:returned});
  }catch(error){
    return json(Number(error?.status)||502,{error:error?.message||'Unable to reach Sleeper.',sleeper:error?.body||null});
  }
};
