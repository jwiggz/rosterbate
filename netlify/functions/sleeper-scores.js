// Scores tab data: every NBA player's fantasy line today, last game, and averages over
// their last 3 / 7 / 14 games, scored with the league's own Sleeper scoring settings.
// Box scores come from ESPN (same source as the player card game log). Fully final
// days are cached forever in Netlify Blobs, so after the first load only today is fetched.
const API='https://api.sleeper.app/v1';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const STORE='rb-nba-boxscores';
const LOOKBACK_DAYS=45;
const CACHE_VERSION='v1';

function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'},body:JSON.stringify(body)}}
async function fetchJson(url){try{const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0 RosterBate/1.0'},cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}}
async function pool(items,limit,fn){const out=new Array(items.length);let i=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(i<items.length){const k=i++;out[k]=await fn(items[k],k)}}));return out}

const TEAM={BRK:'BKN',BRO:'BKN',BK:'BKN',CHO:'CHA',CHH:'CHA',GS:'GSW',NO:'NOP',NOK:'NOP',NOH:'NOP',NY:'NYK',PHO:'PHX',SA:'SAS',UTAH:'UTA',UTH:'UTA',WSH:'WAS',WSB:'WAS'};
const team=v=>{const t=String(v||'').trim().toUpperCase();return TEAM[t]||t};
const normName=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g,'').replace(/[^a-z]/g,'');
const ymd=d=>d.toISOString().slice(0,10);
function shift(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return ymd(d)}
function chicagoToday(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false}).formatToParts(new Date());const g=k=>p.find(x=>x.type===k)?.value;let date=`${g('year')}-${g('month')}-${g('day')}`;if(Number(g('hour'))<6)date=shift(date,-1);return date}

// ---- ESPN parsing ----
function madeAtt(v){const m=String(v||'').match(/^(\d+)\s*-\s*(\d+)$/);return m?[Number(m[1]),Number(m[2])]:[0,0]}
function lineFrom(labels,values){
  const get=k=>{const i=labels.indexOf(k);return i<0?null:values[i]};
  const num=k=>{const v=Number(get(k));return Number.isFinite(v)?v:0};
  const [fgm,fga]=madeAtt(get('FG')),[tpm,tpa]=madeAtt(get('3PT')),[ftm,fta]=madeAtt(get('FT'));
  const s={min:num('MIN'),pts:num('PTS'),reb:num('REB'),ast:num('AST'),stl:num('STL'),blk:num('BLK'),to:num('TO'),oreb:num('OREB'),dreb:num('DREB'),pf:num('PF'),fgm,fga,tpm,tpa,ftm,fta};
  const tens=['pts','reb','ast','stl','blk'].filter(k=>s[k]>=10).length;s.dd=tens>=2?1:0;s.td=tens>=3?1:0;s.qd=tens>=4?1:0;
  return s;
}
function parseSummary(summary,ev){
  const out=[];
  for(const side of summary?.boxscore?.players||[]){
    const abbr=team(side?.team?.abbreviation);
    for(const block of side?.statistics||[]){
      const labels=(block.labels||block.names||block.keys||[]).map(x=>String(x).toUpperCase());
      for(const a of block.athletes||[]){
        if(a?.didNotPlay||!Array.isArray(a?.stats)||!a.stats.length)continue;
        const s=lineFrom(labels,a.stats);if(!s.min&&!s.pts&&!s.reb&&!s.ast)continue;
        out.push({espnId:String(a.athlete?.id||''),name:String(a.athlete?.displayName||''),starter:!!a.starter,team:abbr,gameId:ev.id,date:ev.date,opp:abbr===ev.home?ev.away:ev.home,home:abbr===ev.home,s});
      }
    }
  }
  return out;
}
function eventsFrom(board){
  return (board?.events||[]).filter(e=>Number(e?.season?.type||2)===2).map(e=>{
    const comp=e.competitions?.[0]||{},cs=comp.competitors||[],h=cs.find(c=>c.homeAway==='home')||{},a=cs.find(c=>c.homeAway==='away')||{};
    return{id:String(e.id),state:String(e.status?.type?.state||comp.status?.type?.state||'pre'),detail:String(e.status?.type?.shortDetail||''),start:String(e.date||''),home:team(h.team?.abbreviation),away:team(a.team?.abbreviation),homeScore:Number(h.score||0),awayScore:Number(a.score||0)};
  });
}
async function loadDay(date,store){
  const key=`${CACHE_VERSION}:day:${date}`;
  if(store){try{const hit=await store.get(key,{type:'json'});if(hit)return hit}catch{}}
  const board=await fetchJson(`${ESPN}/scoreboard?dates=${date.replace(/-/g,'')}&limit=100`);
  if(!board)return{date,games:[],lines:[],final:false,error:true};
  const games=eventsFrom(board).map(g=>({...g,date}));
  const played=games.filter(g=>g.state==='post'||g.state==='in');
  const summaries=await pool(played,8,g=>fetchJson(`${ESPN}/summary?event=${encodeURIComponent(g.id)}`));
  const lines=[];played.forEach((g,i)=>{if(summaries[i])lines.push(...parseSummary(summaries[i],g))});
  const final=games.every(g=>g.state==='post')&&summaries.every(Boolean);
  const day={date,games,lines,final};
  // Only cache days that can no longer change (and never today, which may add late games).
  if(store&&final&&date<chicagoToday()){try{await store.setJSON(key,day)}catch{}}
  return day;
}

// ---- scoring (Sleeper NBA scoring_settings keys) ----
const ALIASES={pts:'pts',points:'pts',reb:'reb',rebounds:'reb',ast:'ast',assists:'ast',stl:'stl',steals:'stl',blk:'blk',blocks:'blk',to:'to',tov:'to',turnovers:'to',tpm:'tpm',fg3m:'tpm','3pm':'tpm',tpa:'tpa',fg3a:'tpa',fgm:'fgm',fga:'fga',ftm:'ftm',fta:'fta',oreb:'oreb',dreb:'dreb',pf:'pf',dd:'dd',td:'td',qd:'qd'};
function fantasy(s,scoring){
  let total=0;
  for(const [k,raw] of Object.entries(scoring||{})){
    const m=Number(raw);if(!Number.isFinite(m)||m===0)continue;
    if(ALIASES[k]){total+=Number(s[ALIASES[k]]||0)*m;continue}
    if(k==='fgmi')total+=(s.fga-s.fgm)*m;else if(k==='ftmi')total+=(s.fta-s.ftm)*m;else if(k==='tpmi'||k==='fg3mi')total+=(s.tpa-s.tpm)*m;
    else{const b=k.match(/^bonus_(pt|reb|ast)_(\d+)p$/);if(b){const key={pt:'pts',reb:'reb',ast:'ast'}[b[1]];if(Number(s[key]||0)>=Number(b[2]))total+=m}}
  }
  return Math.round(total*10)/10;
}
const KEEP=['pts','reb','ast','stl','blk','tpm','to','fgm','fga','ftm','fta','min'];
function avg(games){const n=games.length;if(!n)return null;const s={},ts={};for(const k of KEEP){const sum=games.reduce((t,g)=>t+Number(g.s[k]||0),0);ts[k]=Math.round(sum*10)/10;s[k]=Math.round(sum/n*10)/10}const tf=games.reduce((t,g)=>t+g.fpts,0);return{gp:n,fpts:Math.round(tf/n*10)/10,s,tfpts:Math.round(tf*10)/10,ts}}
const pickStats=s=>Object.fromEntries(KEEP.map(k=>[k,s[k]]));

exports.handler=async function(event){
  const q=event.queryStringParameters||{};
  const leagueId=String(q.league||'').trim();
  if(!/^\d{10,25}$/.test(leagueId))return json(400,{error:'Invalid league.'});
  const today=/^\d{4}-\d{2}-\d{2}$/.test(String(q.date||''))?String(q.date):chicagoToday();
  let store=null;
  try{const {connectLambda,getStore}=await import('@netlify/blobs');try{connectLambda(event)}catch{}store=getStore(STORE)}catch{store=null}
  try{
    const [league,allPlayers]=await Promise.all([fetchJson(`${API}/league/${leagueId}`),fetchJson(`${API}/players/nba`)]);
    if(!league)return json(502,{error:'Unable to load the Sleeper league.'});
    const scoring=league.scoring_settings||{};
    if(/^\d{6,15}$/.test(String(q.game||''))){
      const sm=await fetchJson(`${ESPN}/summary?event=${encodeURIComponent(String(q.game))}`);
      if(!sm)return json(502,{error:'Unable to load that box score right now.'});
      const comp=sm?.header?.competitions?.[0]||{},cs=comp.competitors||[],h=cs.find(c=>c.homeAway==='home')||{},a=cs.find(c=>c.homeAway==='away')||{};
      const stt=comp.status?.type||{};
      const g={id:String(q.game),state:String(stt.state||'pre'),detail:String(stt.shortDetail||stt.detail||''),start:String(comp.date||''),home:team(h.team?.abbreviation),away:team(a.team?.abbreviation),homeName:String(h.team?.displayName||''),awayName:String(a.team?.displayName||''),homeScore:Number(h.score||0),awayScore:Number(a.score||0),venue:String(sm?.gameInfo?.venue?.fullName||'')};
      const byE=new Map(),byN=new Map();
      for(const [id,p] of Object.entries(allPlayers||{})){if(String(p?.sport||'nba')!=='nba')continue;const e=String(p?.espn_id||'');if(e)byE.set(e,id);const n=normName(p?.full_name||'');if(n){const k=`${n}|${team(p?.team)}`;if(!byN.has(k))byN.set(k,id);if(!byN.has(n))byN.set(n,id)}}
      const lines=parseSummary(sm,{...g,date:today}).map(l=>{const id=byE.get(l.espnId)||byN.get(`${normName(l.name)}|${l.team}`)||byN.get(normName(l.name))||`espn:${l.espnId}`;const sp=allPlayers?.[id]||{};return{id,name:sp.full_name||l.name,team:l.team,pos:(sp.fantasy_positions||[sp.position].filter(Boolean)).join('/'),starter:l.starter,fpts:fantasy(l.s,scoring),s:pickStats(l.s)}}).sort((x,y)=>y.fpts-x.fpts);
      const teamIds={};for(const c of cs)teamIds[String(c.team?.id||c.id||'')]=team(c.team?.abbreviation);
      const plays=(Array.isArray(sm?.plays)?sm.plays:[]).slice(-25).reverse().map(p=>({text:String(p.text||''),clock:String(p.clock?.displayValue||''),period:Number(p.period?.number||0),home:Number(p.homeScore),away:Number(p.awayScore),scoring:!!p.scoringPlay,team:teamIds[String(p.team?.id||'')]||''})).filter(p=>p.text);
      return json(200,{ok:true,game:g,lines,plays});
    }
    const want=new Set(String(q.games||'').split(',').map(x=>x.trim()).filter(x=>/^\d+$/.test(x)).slice(0,200));
    const lookback=want.size?Math.min(LOOKBACK_DAYS,Math.max(1,Number(q.days)||10)):LOOKBACK_DAYS;
    const dates=Array.from({length:lookback+1},(_,i)=>shift(today,-i));
    const days=await pool(dates,6,d=>loadDay(d,store));

    // Map ESPN athletes to Sleeper players (espn_id first, then name + team).
    const byEspn=new Map(),byName=new Map();
    for(const [id,p] of Object.entries(allPlayers||{})){
      if(String(p?.sport||'nba')!=='nba')continue;
      const e=String(p?.espn_id||'');if(e)byEspn.set(e,id);
      const n=normName(p?.full_name||`${p?.first_name||''} ${p?.last_name||''}`);if(n){const k=`${n}|${team(p?.team)}`;if(!byName.has(k))byName.set(k,id);if(!byName.has(n))byName.set(n,id)}
    }
    const resolve=l=>byEspn.get(l.espnId)||byName.get(`${normName(l.name)}|${l.team}`)||byName.get(normName(l.name))||`espn:${l.espnId}`;

    const per=new Map();
    for(const day of days)for(const l of day.lines||[]){
      const id=resolve(l);const g={date:l.date,gameId:l.gameId,opp:l.opp,home:l.home,s:l.s,fpts:fantasy(l.s,scoring),live:l.date===today&&(day.games.find(x=>x.id===l.gameId)?.state==='in')};
      const cur=per.get(id)||{id,name:l.name,team:l.team,games:[]};cur.games.push(g);per.set(id,cur);
    }
    if(want.size){
      const out={};for(const id of want){const p=per.get(id);out[id]=(p?.games||[]).map(g=>({date:g.date,fpts:g.fpts,live:!!g.live,opp:g.opp}))}
      return json(200,{ok:true,date:today,games_by_player:out,source:'espn-boxscores'});
    }
    const players=[];
    for(const p of per.values()){
      const games=p.games.sort((a,b)=>b.date.localeCompare(a.date));
      const sp=allPlayers?.[p.id]||{};
      const t=games.find(g=>g.date===today)||null,last=games.find(g=>!g.live)||null;
      const done=games.filter(g=>!g.live);
      players.push({
        id:p.id,name:sp.full_name||p.name,team:team(sp.team)||p.team,pos:(sp.fantasy_positions||[sp.position].filter(Boolean)).join('/'),injury:sp.injury_status||null,
        today:t?{fpts:t.fpts,live:t.live,opp:t.opp,home:t.home,s:pickStats(t.s)}:null,
        last:last?{date:last.date,fpts:last.fpts,opp:last.opp,home:last.home,s:pickStats(last.s)}:null,
        l3:avg(done.slice(0,3)),l7:avg(done.slice(0,7)),l14:avg(done.slice(0,14))
      });
    }
    const todayDay=days[0]||{games:[]};
    return json(200,{ok:true,date:today,generated:new Date().toISOString(),games:todayDay.games,players,daysLoaded:days.filter(d=>(d.lines||[]).length).length,source:'espn-boxscores'});
  }catch(e){return json(502,{error:'Unable to load scores right now.',detail:String(e?.message||e)})}
};
