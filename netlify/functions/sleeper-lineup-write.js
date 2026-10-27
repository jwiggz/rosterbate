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

function validId(value){
  return /^\d{1,25}$/.test(String(value||''));
}

function validToken(value){
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value||''));
}

function sameStarters(a,b){
  return JSON.stringify((a||[]).map(String))===JSON.stringify((b||[]).map(String));
}

function sleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function publicMatchup(leagueId,leg,rosterId){
  const response=await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${leg}`,{
    headers:{'Accept':'application/json','User-Agent':'RosterBate/1.0'},
    cache:'no-store'
  });
  if(!response.ok) return null;
  const rows=await response.json();
  return Array.isArray(rows)?rows.find(row=>Number(row.roster_id)===Number(rosterId))||null:null;
}

exports.handler=async function(event){
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'});

  let body;
  try{ body=JSON.parse(event.body||'{}'); }
  catch{ return json(400,{error:'Invalid JSON body'}); }

  const token=String(body.token||'').trim();
  const leagueId=String(body.leagueId||'').trim();
  const rosterId=Number(body.rosterId);
  const leg=Number(body.leg);
  const round=Number(body.round ?? body.leg);
  const starters=Array.isArray(body.starters)?body.starters.map(String):[];
  const startersGames=(body.startersGames && typeof body.startersGames==='object' && !Array.isArray(body.startersGames))?body.startersGames:{};

  if(!validToken(token)) return json(400,{error:'A valid Sleeper session token is required.'});
  if(!validId(leagueId)) return json(400,{error:'Invalid league id.'});
  if(!Number.isInteger(rosterId)||rosterId<1) return json(400,{error:'Invalid roster id.'});
  if(!Number.isInteger(leg)||leg<1||leg>40||!Number.isInteger(round)||round<1||round>40) return json(400,{error:'Invalid scoring period.'});
  if(!starters.length||starters.length>40||starters.some(id=>id!=='0'&&!/^[A-Za-z0-9_-]{1,40}$/.test(id))) return json(400,{error:'Invalid starters array.'});
  const nonZero=starters.filter(id=>id!=='0');
  if(new Set(nonZero).size!==nonZero.length) return json(400,{error:'Duplicate starter ids are not allowed.'});

  try{
    const [leagueResponse,matchupResponse]=await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}`,{headers:{'Accept':'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'}),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${leg}`,{headers:{'Accept':'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'})
    ]);
    if(!leagueResponse.ok||!matchupResponse.ok) return json(400,{error:'Unable to validate the target Sleeper NBA roster.'});
    const league=await leagueResponse.json();
    const matchups=await matchupResponse.json();
    if(String(league?.sport||'').toLowerCase()!=='nba') return json(400,{error:'Lineup writes are enabled for Sleeper NBA leagues only.'});
    const current=Array.isArray(matchups)?matchups.find(row=>Number(row.roster_id)===rosterId):null;
    if(!current) return json(400,{error:'That roster does not exist in this scoring period.'});
    const currentStarters=Array.isArray(current.starters)?current.starters.map(String):[];
    if(starters.length!==currentStarters.length) return json(400,{error:'Starter slot count does not match Sleeper.'});
    const rosterPlayers=new Set((current.players||[]).map(String));
    if(nonZero.some(id=>!rosterPlayers.has(id))) return json(400,{error:'One or more proposed starters are not on this Sleeper roster.'});

    const query=`mutation update_matchup_leg($starters_games: Map) {\n  update_matchup_leg(league_id: \"${leagueId}\",roster_id: ${rosterId},leg: ${leg},round: ${round},starters: ${JSON.stringify(starters)},starters_games: $starters_games){\n    league_id\n    leg\n    matchup_id\n    roster_id\n    round\n    starters\n    players\n    points\n    starters_games\n    custom_points\n    proj_points\n    max_points\n    subs\n  }\n}`;

    const response=await fetch('https://sleeper.com/graphql',{
      method:'POST',
      headers:{
        'Accept':'application/json',
        'Content-Type':'application/json',
        'Authorization':token,
        'X-Sleeper-GraphQL-Op':'update_matchup_leg',
        'User-Agent':'RosterBate/1.0'
      },
      body:JSON.stringify({operationName:'update_matchup_leg',variables:{starters_games:startersGames},query})
    });
    const text=await response.text();
    let data;
    try{data=JSON.parse(text)}catch{data={raw:text.slice(0,1000)}}
    if(!response.ok) return json(response.status,{error:'Sleeper write request failed.',sleeper:data});
    if(data && Array.isArray(data.errors) && data.errors.length) return json(400,{error:data.errors[0]?.message||'Sleeper rejected the lineup update.',sleeper:data});
    const updated=data?.data?.update_matchup_leg;
    if(!updated) return json(502,{error:'Sleeper did not return an updated matchup.',sleeper:data});
    if(!sameStarters(updated.starters,starters)) return json(409,{error:'Sleeper returned a different starter array than requested.',matchup:updated});

    let publicSynced=false;
    let publicStarters=null;
    for(const delay of [0,250,500,900,1400]){
      if(delay) await sleep(delay);
      const publicRow=await publicMatchup(leagueId,leg,rosterId);
      if(publicRow){
        publicStarters=(publicRow.starters||[]).map(String);
        if(sameStarters(publicStarters,starters)){publicSynced=true;break;}
      }
    }

    return json(200,{ok:true,matchup:updated,publicSynced,publicStarters});
  }catch(error){
    return json(502,{error:'Unable to reach Sleeper.',detail:String(error?.message||error)});
  }
};
