// Hashtag projection import was removed; drop any saved imports so nothing stale lingers.
(()=>{try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.includes('rbHashtagProjV1'))localStorage.removeItem(k)}}catch{}})();
(()=>{
  const PLACEHOLDER='__RB_SLEEPER_VAULT__';
  async function restoreVaultIdentity(){
    try{
      if(window.rbAuthReady)await window.rbAuthReady;
      if(!window.rbSleeperVault?.status)return null;
      const d=await window.rbSleeperVault.status();
      if(!d?.connected||!d?.sleeperUserId)return d||null;
      const sid=String(d.sleeperUserId),rid=Number(d.rosterId||0);
      try{
        localStorage.setItem('rbSleeperLinkedUserId',sid);
        if(rid>0)localStorage.setItem('rbSleeperRoster',String(rid));
        sessionStorage.setItem('rbSleeperLockSyncVerified','1');
      }catch{}
      try{if(rid>0)selectedRoster=rid}catch{}
      try{
        const t=(currentData?.teams||[]).find(x=>String(x?.owner_id||'')===sid);
        const name=String(t?.display_name||t?.team_name||'').trim();
        if(name)localStorage.setItem('rbSleeperLinkedUsername',name);
      }catch{}
      try{window.dispatchEvent(new CustomEvent('rb:sleeper-vault',{detail:{connected:true,restoredIdentity:true,sleeperUserId:sid,rosterId:rid}}))}catch{}
      return d;
    }catch{return null}
  }
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
      const expectedTotal=total.toFixed(1),expectedCount=`${count} verified locks`;
      const b=box.querySelector('b'),s=box.querySelector('small');
      if(b&&b.textContent!==expectedTotal)b.textContent=expectedTotal;
      if(s&&s.textContent!==expectedCount)s.textContent=expectedCount;
      box.dataset.rbCachedLockedTotal=expectedTotal;
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
  function rangeFor(wk){
    try{
      const r=currentData?.week_ranges?.[String(wk)];
      if(r?.start&&r?.end){const yr=r.start.slice(0,4)!==r.end.slice(0,4),end=r.start.slice(0,7)===r.end.slice(0,7)&&!yr?String(Number(r.end.slice(8,10))):fmtDate(r.end,yr);return `${fmtDate(r.start)}–${end}`}
    }catch{}
    return Number(wk)===Number(selectedWeek)?weekRange():'';
  }
  function labelWeek(){
    try{
      const sel=document.getElementById('weekSel');if(!sel)return;
      let any=false;
      for(const opt of sel.options||[]){
        const wk=Number(opt.value);if(!wk)continue;
        const range=rangeFor(wk);if(range)any=true;
        const text=range?`Week ${wk} · ${range}`:`Week ${wk}`;
        if(opt.textContent!==text)opt.textContent=text;
      }
      sel.style.minWidth=any?'150px':'86px';
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
  let teamObserver=null;
  function observeTeam(){
    try{
      const root=document.getElementById('teamView');if(!root||teamObserver)return;
      teamObserver=new MutationObserver(()=>refresh());
      teamObserver.observe(root,{childList:true,subtree:true});
    }catch{}
  }
  function start(){observeTeam();refresh()}

  let initialReconcileStarted=false;
  async function finalInitialReconcile(){
    if(initialReconcileStarted)return;
    initialReconcileStarted=true;
    try{if(window.rbAuthReady)await window.rbAuthReady}catch{}
    for(let i=0;i<200&&!window.rbSleeperVault;i++)await new Promise(r=>setTimeout(r,20));
    for(let i=0;i<200;i++){
      let ready=false;
      try{ready=!!currentData&&Array.isArray(currentData.matchups)&&Number(selectedWeek)>0}catch{}
      if(ready)break;
      await new Promise(r=>setTimeout(r,20));
    }
    const vault=await restoreVaultIdentity();
    if(!vault?.connected)return;
    try{
      const body={token:PLACEHOLDER,leagueId:String(leagueId),rosterId:Number(selectedRoster),leg:Number(selectedWeek),round:Number(selectedWeek)};
      const res=await fetch('/.netlify/functions/sleeper-lock-state',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(body)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok)throw new Error(data?.error||`lock-state HTTP ${res.status}`);
      lockedGames=data.startersGames||{};
      try{sessionStorage.setItem(`rbLockState:${String(leagueId)}:${Number(selectedRoster)}:${Number(selectedWeek)}`,JSON.stringify({ts:Date.now(),data}))}catch{}
      try{window.dispatchEvent(new CustomEvent('rb:sleeper-lock-state',{detail:{ok:true,source:'direct-initial-reconcile',data}}))}catch{}
      try{if(typeof renderTeam==='function')renderTeam()}catch{}
      try{window.rbLockWindowRefresh?.()}catch{}
      refresh();
    }catch(e){
      try{console.warn('Lock Sync initial reconcile:',e?.message||String(e))}catch{}
    }
  }

  function boot(){start();setTimeout(finalInitialReconcile,0)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('rb:sleeper-lock-state',refresh);
  window.addEventListener('rb:sleeper-vault',refresh);
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn')){refresh();setTimeout(refresh,0);setTimeout(refresh,32)}},true);
  document.addEventListener('change',e=>{if(e.target?.id==='weekSel'||e.target?.id==='teamPicker')refresh()},true);
  [0,100,250,500,1000].forEach(ms=>setTimeout(start,ms));
})();
