function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'},body:JSON.stringify(body)}}

function normTeam(v){
  const t=String(v||'').trim().toUpperCase();
  const a={BRK:'BKN',BRO:'BKN',BK:'BKN',CHO:'CHA',CHH:'CHA',GS:'GSW',NO:'NOP',NOK:'NOP',NOH:'NOP',NY:'NYK',PHO:'PHX',SA:'SAS',UTAH:'UTA'};
  return a[t]||t;
}
function shiftDate(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}

async function espnGames(scoreboardDate){
  const compact=String(scoreboardDate||'').replace(/-/g,'');
  if(!/^\d{8}$/.test(compact))return[];
  const url=`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(compact)}&limit=100`;
  const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`ESPN ${r.status}`);
  const data=await r.json();
  const out=[];
  for(const event of data?.events||[]){
    const comp=event?.competitions?.[0];
    if(!comp)continue;
    const competitors=comp.competitors||[];
    const home=competitors.find(c=>c.homeAway==='home');
    const away=competitors.find(c=>c.homeAway==='away');
    if(!home||!away)continue;
    const state=String(comp.status?.type?.state||event.status?.type?.state||'pre').toLowerCase();
    const completed=!!(comp.status?.type?.completed||event.status?.type?.completed);
    const period=Number(comp.status?.period??event.status?.period??0)||null;
    const clock=String(comp.status?.displayClock||event.status?.displayClock||'');
    const status=completed||state==='post'?'final':state==='in'?'live':'pre_game';
    out.push({
      game_id:String(event.id||comp.id||''),
      scoreboard_date:scoreboardDate,
      date:String(event.date||comp.date||'').slice(0,10),
      home:normTeam(home.team?.abbreviation),
      away:normTeam(away.team?.abbreviation),
      status,
      home_score:Number.isFinite(Number(home.score))?Number(home.score):null,
      away_score:Number.isFinite(Number(away.score))?Number(away.score):null,
      period,
      clock,
      start_time:String(event.date||comp.date||''),
      detail:String(comp.status?.type?.shortDetail||event.status?.type?.shortDetail||'')
    });
  }
  return out.filter(g=>g.home&&g.away);
}

exports.handler=async event=>{
  if(event.httpMethod&&event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
  const q=event.queryStringParameters||{};
  const date=String(q.date||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json(400,{error:'date=YYYY-MM-DD required'});
  try{
    const dates=[shiftDate(date,-1),date,shiftDate(date,1)];
    const batches=await Promise.all(dates.map(d=>espnGames(d).catch(()=>[])));
    const seen=new Set(),games=[];
    for(const g of batches.flat()){
      const key=g.game_id||`${g.away}-${g.home}-${g.start_time}`;
      if(seen.has(key))continue;seen.add(key);games.push(g);
    }
    return json(200,{ok:true,date,source:'espn',games});
  }catch(error){
    return json(502,{error:error?.message||String(error),date,games:[]});
  }
};
