(()=>{
  const PREFIX='rbStarterHistoryV1';
  const FRESH_NEGATIVE_MS=90*60*1000;
  const cleanStarters=v=>(Array.isArray(v)?v:[]).map(String).filter(x=>x&&x!=='0');
  const key=()=>`${PREFIX}:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`;
  function read(){try{const v=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function write(rows){try{localStorage.setItem(key(),JSON.stringify(rows.slice(-250)))}catch{}}
  function currentRaw(){try{const v=matchup(selectedRoster)?.starters;return Array.isArray(v)?v.map(String):[]}catch{return[]}}
  function current(){return cleanStarters(currentRaw())}
  // ---- account mirror: users/{uid}/sleeperLineupHistory/{league}/{roster}/{week}/{ts} ----
  const remote={loaded:new Set(),loading:new Set()};
  function fbUser(){try{return window.firebase?.auth?.()?.currentUser||null}catch{return null}}
  function remoteRef(){try{const u=fbUser();if(!u||!window.firebase?.database)return null;return window.firebase.database().ref(`users/${u.uid}/sleeperLineupHistory/${String(leagueId)}/${String(selectedRoster)}/${String(selectedWeek)}`)}catch{return null}}
  function pushRemote(row){try{const ref=remoteRef();if(!ref||!row?.ts)return;ref.child(String(row.ts)).set({ts:Number(row.ts),starters:cleanStarters(row.starters),slots:Array.isArray(row.slots)?row.slots.map(String):null,source:String(row.source||'observe')}).catch(()=>{})}catch{}}
  async function syncRemote(){const k=key();if(remote.loaded.has(k)||remote.loading.has(k))return;const ref=remoteRef();if(!ref)return;remote.loading.add(k);try{const snap=await ref.once('value');if(k!==key())return;const val=snap.val()||{};const local=read(),seen=new Set(local.map(x=>String(x.ts)));let added=false;for(const r of Object.values(val)){if(!r||!r.ts||seen.has(String(r.ts)))continue;local.push({ts:Number(r.ts),starters:cleanStarters(r.starters),slots:Array.isArray(r.slots)?r.slots.map(String):undefined,source:String(r.source||'remote')});added=true}const remoteTs=new Set(Object.keys(val));for(const r of read())if(!remoteTs.has(String(r.ts)))pushRemote(r);if(added){local.sort((a,b)=>Number(a.ts)-Number(b.ts));write(local)}remote.loaded.add(k);try{window.dispatchEvent(new CustomEvent('rb:lineup-history',{detail:{key:k,added}}))}catch{}}catch{}finally{remote.loading.delete(k)}}
  // Lineup in effect for a past fantasy day: last snapshot before the day ended
  // (6 AM next morning), otherwise the first snapshot recorded after it.
  function lineupOn(day){try{const d=new Date(`${day}T06:00:00`);d.setDate(d.getDate()+1);const cutoff=d.getTime();const rows=read().filter(x=>Number(x?.ts)>0).sort((a,b)=>Number(a.ts)-Number(b.ts));if(!rows.length)return null;let pick=null;for(const r of rows)if(Number(r.ts)<=cutoff)pick=r;if(!pick)pick=rows.find(r=>Number(r.ts)>cutoff)||null;if(!pick)return null;const cur=currentRaw();if(Array.isArray(pick.slots)&&pick.slots.length===cur.length)return pick.slots.map(String);const clean=cleanStarters(pick.starters);if(clean.length===cur.length)return clean;return null}catch{return null}}
  function same(a,b){a=cleanStarters(a);b=cleanStarters(b);return a.length===b.length&&a.every((x,i)=>x===b[i])}
  function parseGameTime(game){
    const raw=game?.start_time??game?.start??game?.game_time??game?.datetime??'';
    if(typeof raw==='number'&&Number.isFinite(raw))return raw<1e12?raw*1000:raw;
    const s=String(raw||'').trim();
    if(/^\d{10,13}$/.test(s)){const n=Number(s);return s.length<=10?n*1000:n}
    const t=Date.parse(s);if(Number.isFinite(t))return t;
    const d=Date.parse(`${String(game?.date||'')}T12:00:00`);return Number.isFinite(d)?d:NaN;
  }
  function snapshot(starters=currentRaw(),ts=Date.now(),source='observe'){
    try{const slots=(Array.isArray(starters)?starters:[]).map(String);starters=cleanStarters(slots);if(!starters.length)return false;const rows=read(),last=rows[rows.length-1];if(last&&same(last.starters,starters))return false;const row={ts:Number(ts)||Date.now(),starters,slots,source:String(source||'observe')};rows.push(row);write(rows);pushRemote(row);return true}catch{return false}
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
  function hookWriteLineup(){try{if(typeof writeLineup!=='function'||writeLineup.__rbStarterHistoryV1)return false;const base=writeLineup;const wrapped=async function(starters,...rest){snapshot(currentRaw(),Date.now(),'before-write');const out=await base.call(this,starters,...rest);snapshot(starters,Date.now(),'after-write');return out};wrapped.__rbStarterHistoryV1=true;writeLineup=wrapped;try{window.writeLineup=wrapped}catch{}return true}catch{return false}}
  function observe(){snapshot(currentRaw(),Date.now(),'observe');hookWriteLineup();syncRemote()}
  window.rbStarterHistory={read,snapshot,at,after,eligible,evidence,parseGameTime,lineupOn,syncRemote};
  window.addEventListener('rb:auth-ready',()=>syncRemote());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
  window.addEventListener('focus',observe);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')setTimeout(observe,0)},true);
  let n=0;const timer=setInterval(()=>{observe();if(++n>=120)clearInterval(timer)},15000);
})();