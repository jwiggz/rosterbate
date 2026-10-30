const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(body)});

exports.handler=async function(event){
  const raw=String(event?.queryStringParameters?.league||'').trim();
  const leagueId=(raw.match(/\d{10,}/)||[])[0]||'';
  if(!leagueId)return json(400,{ok:false,error:'Enter a valid Sleeper league ID.'});
  try{
    const r=await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}`,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'}});
    if(!r.ok)return json(r.status===404?404:502,{ok:false,error:r.status===404?'Sleeper league not found.':'Sleeper is unavailable right now.'});
    const league=await r.json();
    if(String(league?.sport||'').toLowerCase()!=='nba')return json(400,{ok:false,error:'That Sleeper league is not an NBA league.'});
    let rosterCount=0;
    try{
      const rr=await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}/rosters`,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'}});
      if(rr.ok){const rosters=await rr.json();rosterCount=Array.isArray(rosters)?rosters.length:0}
    }catch{}
    return json(200,{ok:true,league:{league_id:String(league.league_id||leagueId),name:String(league.name||'Sleeper NBA League'),season:String(league.season||''),status:String(league.status||''),total_rosters:Number(league.total_rosters||rosterCount||0),roster_count:rosterCount,avatar:String(league.avatar||''),settings:league.settings||{}}});
  }catch(e){return json(502,{ok:false,error:'Could not reach Sleeper. Try again.'})}
};