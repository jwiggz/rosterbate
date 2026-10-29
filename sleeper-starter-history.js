(()=>{
  const PREFIX='rbStarterHistoryV1';
  const FRESH_NEGATIVE_MS=90*60*1000;
  const cleanStarters=v=>(Array.isArray(v)?v:[]).map(String).filter(x=>x&&x!=='0');
  const key=()=>`${PREFIX}:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`;
  function read(){try{const v=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function write(rows){try{localStorage.setItem(key(),JSON.stringify(rows.slice(-250)))}catch{}}
  function current(){try{return cleanStarters(matchup(selectedRoster)?.starters)}catch{return[]}}
  function same(a,b){a=cleanStarters(a);b=cleanStarters(b);return a.length===b.length&&a.every((x,i)=>x===b[i])}
  function parseGameTime(game){
    const raw=game?.start_time??game?.start??game?.game_time??game?.datetime??'';
    if(typeof raw==='number'&&Number.isFinite(raw))return raw<1e12?raw*1000:raw;
    const s=String(raw||'').trim();
    if(/^\d{10,13}$/.test(s)){const n=Number(s);return s.length<=10?n*1000:n}
    const t=Date.parse(s);if(Number.isFinite(t))return t;
    const d=Date.parse(`${String(game?.date||'')}T12:00:00`);return Number.isFinite(d)?d:NaN;
  }
  function snapshot(starters=current(),ts=Date.now(),source='observe'){
    try{starters=cleanStarters(starters);if(!starters.length)return false;const rows=read(),last=rows[rows.length-1];if(last&&same(last.starters,starters))return false;rows.push({ts:Number(ts)||Date.now(),starters,source:String(source||'observe')});write(rows);return true}catch{return false}
  }
  function at(time){const t=Number(time)||0;if(!t)return null;const rows=read().filter(x=>Number(x?.ts)>0&&Number(x.ts)<=t).sort((a,b)=>Number(a.ts)-Number(b.ts));return rows.length?rows[rows.length-1]:null}
  function after(time){const t=Number(time)||0;if(!t)return null;const rows=read().filter(x=>Number(x?.ts)>t).sort((a,b)=>Number(a.ts)-Number(b.ts));return rows.length?rows[0]:null}
  function postRows(time){const t=Number(time)||0;return read().filter(x=>Number(x?.ts)>t).sort((a,b)=>Number(a.ts)-Number(b.ts))}
  function continuity(pid,time){pid=String(pid);const rows=postRows(time);if(!rows.length)return null;for(const row of rows)if(!cleanStarters(row.starters).includes(pid))return false;return cleanStarters(current()).includes(pid)}
  function fallbackCurrent(pid,time){
    pid=String(pid);if(!cleanStarters(current()).includes(pid))return false;
    const rows=postRows(time);for(const row of rows)if(!cleanStarters(row.starters).includes(pid))return false;
    return true;
  }
  function decision(pid,game){
    pid=String(pid);const t=parseGameTime(game);if(!Number.isFinite(t))return{eligible:false,gameStart:null,snapshot:null,mode:'invalid-time'};
    const s=at(t);
    if(s){
      const listed=cleanStarters(s.starters).includes(pid);
      if(listed)return{eligible:true,gameStart:t,snapshot:s,mode:'pre-tipoff'};
      const age=t-Number(s.ts||0);
      if(age>=0&&age<=FRESH_NEGATIVE_MS)return{eligible:false,gameStart:t,snapshot:s,mode:'fresh-pre-tipoff-bench'};
      const ok=fallbackCurrent(pid,t);
      return{eligible:ok,gameStart:t,snapshot:s,mode:ok?'stale-pre-tipoff-fallback':'stale-pre-tipoff-no-continuity'};
    }
    const first=after(t),ok=fallbackCurrent(pid,t);
    return{eligible:ok,gameStart:t,snapshot:first,mode:ok?'post-tipoff-current-continuity':'none'};
  }
  function eligible(pid,game){try{return decision(pid,game).eligible===true}catch{return false}}
  function evidence(pid,game){try{return decision(pid,game)}catch{return{eligible:false,gameStart:null,snapshot:null,mode:'none'}}}
  function hookWriteLineup(){try{if(typeof writeLineup!=='function'||writeLineup.__rbStarterHistoryV1)return false;const base=writeLineup;const wrapped=async function(starters,...rest){snapshot(current(),Date.now(),'before-write');const out=await base.call(this,starters,...rest);snapshot(starters,Date.now(),'after-write');return out};wrapped.__rbStarterHistoryV1=true;writeLineup=wrapped;try{window.writeLineup=wrapped}catch{}return true}catch{return false}}
  function observe(){snapshot(current(),Date.now(),'observe');hookWriteLineup()}
  window.rbStarterHistory={read,snapshot,at,after,eligible,evidence,parseGameTime};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
  window.addEventListener('focus',observe);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')setTimeout(observe,0)},true);
  let n=0;const timer=setInterval(()=>{observe();if(++n>=120)clearInterval(timer)},15000);
})();