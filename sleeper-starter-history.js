(()=>{
  const PREFIX='rbStarterHistoryV1';
  const cleanStarters=v=>(Array.isArray(v)?v:[]).map(String).filter(x=>x&&x!=='0');
  const key=()=>`${PREFIX}:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`;
  function read(){try{const v=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
  function write(rows){try{localStorage.setItem(key(),JSON.stringify(rows.slice(-250)))}catch{}}
  function current(){try{return cleanStarters(matchup(selectedRoster)?.starters)}catch{return[]}}
  function same(a,b){a=cleanStarters(a);b=cleanStarters(b);return a.length===b.length&&a.every((x,i)=>x===b[i])}
  function snapshot(starters=current(),ts=Date.now(),source='observe'){
    try{
      starters=cleanStarters(starters);if(!starters.length)return false;
      const rows=read(),last=rows[rows.length-1];
      if(last&&same(last.starters,starters))return false;
      rows.push({ts:Number(ts)||Date.now(),starters,source:String(source||'observe')});write(rows);return true;
    }catch{return false}
  }
  function at(time){
    const t=Number(time)||0;if(!t)return null;
    const rows=read().filter(x=>Number(x?.ts)>0&&Number(x.ts)<=t).sort((a,b)=>Number(a.ts)-Number(b.ts));
    return rows.length?rows[rows.length-1]:null;
  }
  function eligible(pid,game){
    try{const t=Date.parse(String(game?.start_time||''));if(!Number.isFinite(t))return false;const s=at(t);return !!s&&cleanStarters(s.starters).includes(String(pid))}catch{return false}
  }
  function evidence(pid,game){
    try{const t=Date.parse(String(game?.start_time||''));const s=Number.isFinite(t)?at(t):null;return{eligible:!!s&&cleanStarters(s.starters).includes(String(pid)),gameStart:Number.isFinite(t)?t:null,snapshot:s}}catch{return{eligible:false,gameStart:null,snapshot:null}}
  }
  function hookWriteLineup(){
    try{
      if(typeof writeLineup!=='function'||writeLineup.__rbStarterHistoryV1)return false;
      const base=writeLineup;
      const wrapped=async function(starters,...rest){
        snapshot(current(),Date.now(),'before-write');
        const out=await base.call(this,starters,...rest);
        snapshot(starters,Date.now(),'after-write');
        return out;
      };
      wrapped.__rbStarterHistoryV1=true;writeLineup=wrapped;try{window.writeLineup=wrapped}catch{}return true;
    }catch{return false}
  }
  function observe(){snapshot(current(),Date.now(),'observe');hookWriteLineup()}
  window.rbStarterHistory={read,snapshot,at,eligible,evidence};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
  window.addEventListener('focus',observe);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')setTimeout(observe,0)},true);
  let n=0;const timer=setInterval(()=>{observe();if(++n>=120)clearInterval(timer)},15000);
})();
