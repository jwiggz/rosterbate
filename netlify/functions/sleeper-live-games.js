const ROOTS=['https://api.sleeper.app','https://api.sleeper.com'];

function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'},body:JSON.stringify(body)}}
function normTeam(v){
  if(v==null)return'';
  if(typeof v==='object')v=v.abbr||v.alias||v.team||v.team_abbr||v.team_abbreviation||v.code||v.key||v.name||'';
  const t=String(v).trim().toUpperCase();
  const a={BRK:'BKN',BRO:'BKN',BK:'BKN',CHO:'CHA',CHH:'CHA',GS:'GSW',NO:'NOP',NOK:'NOP',NOH:'NOP',NY:'NYK',PHO:'PHX',SA:'SAS'};
  return a[t]||t;
}
function team(g,side){
  const vals=side==='home'?[g.home_team_abbr,g.home_abbr,g.home_team_alias,g.home?.abbr,g.home?.alias,g.home_team?.abbr,g.home_team?.alias,g.home,g.home_team]:[g.away_team_abbr,g.away_abbr,g.away_team_alias,g.away?.abbr,g.away?.alias,g.away_team?.abbr,g.away_team?.alias,g.away,g.away_team];
  for(const v of vals){const t=normTeam(v);if(t&&t!=='[OBJECT OBJECT]')return t}return'';
}
function first(...vals){for(const v of vals){if(v!==undefined&&v!==null&&v!=='')return v}return null}
function score(g,side){
  const obj=side==='home'?g.home:g.away;
  const tm=side==='home'?g.home_team:g.away_team;
  const v=side==='home'?first(g.home_score,g.home_points,g.score_home,g.home_pts,obj?.score,obj?.points,tm?.score,tm?.points):first(g.away_score,g.away_points,g.score_away,g.away_pts,obj?.score,obj?.points,tm?.score,tm?.points);
  const n=Number(v);return Number.isFinite(n)?n:null;
}
function period(g){const v=first(g.period,g.quarter,g.qtr,g.current_period,g.game_period,g.period_number,g.status?.period);const n=Number(v);return Number.isFinite(n)&&n>0?n:(v==null?null:String(v))}
function clock(g){const v=first(g.clock,g.game_clock,g.display_clock,g.time_remaining,g.time_left,g.status?.clock,g.status?.display_clock);return v==null?'':String(v)}
async function fetchRows(season){
  for(const root of ROOTS){
    try{const r=await fetch(`${root}/schedule/nba/regular/${encodeURIComponent(season)}`,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});if(!r.ok)continue;const data=await r.json();if(Array.isArray(data))return data}catch{}
  }
  return[];
}
exports.handler=async event=>{
  if(event.httpMethod&&event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
  const q=event.queryStringParameters||{},season=String(q.season||'').trim(),week=Number(q.week||0);
  if(!/^\d{4}$/.test(season)||!Number.isFinite(week)||week<1)return json(400,{error:'season and week required'});
  const rows=await fetchRows(season);
  const games=rows.filter(g=>Number(g.week)===week).map(g=>({
    game_id:String(g.game_id||g.id||''),date:String(g.date||String(g.start_time||g.start||'').slice(0,10)||''),home:team(g,'home'),away:team(g,'away'),
    status:String(first(g.status?.type,g.status,g.game_status,'pre_game')),
    home_score:score(g,'home'),away_score:score(g,'away'),period:period(g),clock:clock(g),start_time:String(first(g.start_time,g.start,g.game_time,g.start_time_utc,g.datetime,g.date_time,'')||'')
  })).filter(g=>g.date&&g.home&&g.away);
  return json(200,{ok:true,season,week,games});
};
