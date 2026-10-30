(()=>{
  function stateCache(){
    try{
      const key=`rbLockState:${String(leagueId)}:${Number(selectedRoster)}:${Number(selectedWeek)}`;
      const raw=sessionStorage.getItem(key);if(!raw)return null;
      const x=JSON.parse(raw);return x?.data||null;
    }catch{return null}
  }
  function lockedIds(data){
    const out=new Set(),starters=(data?.starters||[]).map(String),sg=data?.startersGames;
    if(!sg||typeof sg!=='object'||Array.isArray(sg))return out;
    for(const [k,v] of Object.entries(sg)){
      if(starters.includes(String(k)))out.add(String(k));
      if(v&&typeof v==='object'){
        const pid=String(v.player_id??v.playerId??v.player??v.pid??'');
        if(pid&&starters.includes(pid))out.add(pid);
      }
    }
    return out;
  }
  function hydrateLockedSummary(){
    try{
      const box=document.querySelector('#teamView .rb-lock-total.locked');if(!box)return;
      const data=stateCache();if(!data)return;
      const locked=lockedIds(data);if(!locked.size)return;
      const m=(currentData?.matchups||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));if(!m)return;
      const starters=(m.starters||[]).map(String),pts=Array.isArray(m.starters_points)?m.starters_points:[];
      let total=0,count=0;
      starters.forEach((pid,i)=>{if(!locked.has(pid))return;const v=Number(pts[i]);if(Number.isFinite(v)){total+=v;count++}});
      if(!count)return;
      const b=box.querySelector('b'),s=box.querySelector('small');
      if(b)b.textContent=total.toFixed(1);
      if(s)s.textContent=`${count} verified locks`;
      box.dataset.rbCachedLockedTotal=total.toFixed(1);
      box.dataset.rbCachedLockedCount=String(count);
    }catch{}
  }
  function fmtDate(date,includeYear=false){
    try{return new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',...(includeYear?{year:'numeric'}:{})})}catch{return date}
  }
  function weekRange(){
    try{
      const dates=[...new Set((currentData?.schedule||[]).map(g=>String(g?.date||'')).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
      if(!dates.length)return'';
      return `${fmtDate(dates[0])}–${fmtDate(dates[dates.length-1],dates[0].slice(0,4)!==dates[dates.length-1].slice(0,4))}`;
    }catch{return''}
  }
  function labelWeek(){
    try{
      const sel=document.getElementById('weekSel');if(!sel)return;
      const opt=sel.options?.[sel.selectedIndex];if(!opt)return;
      const range=weekRange();
      opt.textContent=range?`Week ${Number(selectedWeek)} · ${range}`:`Week ${Number(selectedWeek)}`;
      sel.style.minWidth=range?'150px':'86px';
    }catch{}
  }
  let pending=false;
  function refresh(){
    if(pending)return;pending=true;
    requestAnimationFrame(()=>{pending=false;labelWeek();hydrateLockedSummary()});
  }
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbProductionPolish){
      const base=renderTeam;
      const wrapped=function(...args){const out=base.apply(this,args);refresh();return out};
      wrapped.__rbProductionPolish=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}
    }
  }catch{}
  try{
    if(typeof renderLockTotals==='function'&&!renderLockTotals.__rbProductionPolish){
      const baseTotals=renderLockTotals;
      const wrappedTotals=function(...args){const out=baseTotals.apply(this,args);hydrateLockedSummary();return out};
      wrappedTotals.__rbProductionPolish=true;renderLockTotals=wrappedTotals;try{window.renderLockTotals=wrappedTotals}catch{}
    }
  }catch{}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
  window.addEventListener('rb:sleeper-lock-state',refresh);
  window.addEventListener('rb:sleeper-vault',refresh);
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn')){setTimeout(hydrateLockedSummary,0);setTimeout(hydrateLockedSummary,32)}},true);
  document.addEventListener('change',e=>{if(e.target?.id==='weekSel'||e.target?.id==='teamPicker')refresh()},true);
  [0,100,250,500,1000].forEach(ms=>setTimeout(refresh,ms));
})();
