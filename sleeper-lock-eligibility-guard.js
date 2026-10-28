(()=>{
  const txState={key:'',ready:false,loading:null,acquired:new Map()};
  function scalar(v){return v==null?'':String(v)}
  function cacheKey(){try{return `rbLockState:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`}catch{return''}}
  function lockState(){try{const raw=sessionStorage.getItem(cacheKey());const parsed=raw?JSON.parse(raw):null;return parsed?.data||null}catch{return null}}
  function containsPlayer(node,pid,depth=0){
    if(depth>7||node==null)return false;pid=String(pid);
    if(Array.isArray(node))return node.some(v=>containsPlayer(v,pid,depth+1));
    if(typeof node!=='object')return scalar(node)===pid;
    const direct=scalar(node.player_id??node.playerId??node.player??node.pid);if(direct===pid)return true;
    for(const [k,v] of Object.entries(node)){
      if(String(k)===pid)return true;
      if(typeof v==='object'){if(containsPlayer(v,pid,depth+1))return true}
      else if(scalar(v)===pid)return true;
    }
    return false;
  }
  function invalidationKey(){try{return `rbLockInvalidatedV2:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`}catch{return''}}
  function isInvalidated(pid,gid){
    try{const raw=localStorage.getItem(invalidationKey()),v=raw?JSON.parse(raw):{},games=Array.isArray(v?.[String(pid)])?v[String(pid)]:[];return games.map(String).includes(String(gid))}catch{return false}
  }
  function gameTime(g){const t=Date.parse(String(g?.start_time||''));if(Number.isFinite(t))return t;const d=Date.parse(`${String(g?.date||'')}T12:00:00`);return Number.isFinite(d)?d:0}
  function txKey(){try{return `${String(leagueId)}:${String(selectedWeek)}:${String(selectedRoster)}`}catch{return''}}
  async function ensureTransactions(){
    const k=txKey();if(!k)return;
    if(txState.key!==k){txState.key=k;txState.ready=false;txState.loading=null;txState.acquired=new Map()}
    if(txState.ready)return;if(txState.loading)return txState.loading;
    txState.loading=(async()=>{
      try{
        const r=await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}/transactions/${encodeURIComponent(selectedWeek)}`,{headers:{Accept:'application/json'},cache:'no-store'});
        const rows=r.ok?await r.json():[];
        if(Array.isArray(rows))for(const tx of rows){const created=Number(tx?.created||0),adds=tx?.adds&&typeof tx.adds==='object'?tx.adds:{};for(const [pid,rid] of Object.entries(adds)){if(Number(rid)!==Number(selectedRoster)||!created)continue;const old=txState.acquired.get(String(pid));if(!old||created<old)txState.acquired.set(String(pid),created)}}
      }catch{}finally{txState.ready=true;txState.loading=null}
    })();return txState.loading;
  }
  function gameById(gid,pid){
    try{
      const schedule=currentData?.schedule||[],id=String(gid||'');
      if(id){const exact=schedule.find(g=>String(g?.game_id||'')===id);if(exact)return exact}
      const p=currentData?.players?.[String(pid)]||{},team=String(p.team||'');
      if(selectedDay&&selectedDay!=='all')return schedule.find(g=>String(g?.date||'')===String(selectedDay)&&(g.home===team||g.away===team))||null;
    }catch{}return null;
  }
  function acquiredAfterGame(pid,g){const at=Number(txState.acquired.get(String(pid))||0),gt=gameTime(g);return !!at&&!!gt&&at>gt}
  function eligible(pid,gid){
    const d=lockState();if(!d)return null;
    const g=gameById(gid,pid);
    if(!containsPlayer(d.playerMap,String(pid)))return false;
    if(isInvalidated(pid,gid))return false;
    if(g&&acquiredAfterGame(pid,g))return false;
    return true;
  }
  function markUnavailable(row,btn){
    btn?.remove();
    if(!row.querySelector('.lock-btn'))row.classList.remove('lockable');
    row.dataset.rbLockEligible='0';
    const meta=row.querySelector('.matchup-meta');
    if(meta&&!meta.querySelector('.rb-lock-unavailable')){const s=document.createElement('span');s.className='rb-lock-unavailable';s.textContent='NOT LOCKABLE';s.style.cssText='margin-left:6px;color:#8492a6;font-size:7px;font-weight:900;letter-spacing:.03em';meta.appendChild(s)}
  }
  function markEligible(row){row.dataset.rbLockEligible='1';row.querySelector('.rb-lock-unavailable')?.remove()}
  async function decorate(){
    try{
      await ensureTransactions();
      const root=document.getElementById('teamView');if(!root)return;
      root.querySelectorAll('.lock-btn[data-lock-player][data-lock-game]:not([data-rb-carry-lock="1"])').forEach(btn=>{
        const row=btn.closest('.player-row');if(!row)return;
        const ok=eligible(btn.dataset.lockPlayer,btn.dataset.lockGame);
        if(ok===false)markUnavailable(row,btn);else if(ok===true)markEligible(row);
      });
    }catch{}
  }
  const schedule=()=>queueMicrotask(()=>decorate());
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab,#cancelSelect,#undoBtn'))schedule()},true);
  document.addEventListener('change',e=>{if(['teamPicker','weekSel'].includes(e.target?.id))schedule()},true);
  window.addEventListener('focus',schedule);
  const observer=new MutationObserver(()=>schedule());
  const start=()=>{const root=document.getElementById('teamView');if(root)observer.observe(root,{childList:true,subtree:true});schedule()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();