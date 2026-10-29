(()=>{
  function fantasyDay(){
    const d=new Date();
    if(d.getHours()<6)d.setDate(d.getDate()-1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function rowPlayerId(row){
    const direct=String(row?.dataset?.rbPlayerId||'');
    if(direct)return direct;
    const name=String(row?.querySelector('.pname')?.textContent||'').replace(/\s*\(locked\)\s*$/i,'').trim().toLowerCase();
    if(!name)return'';
    try{
      for(const [id,p] of Object.entries(currentData?.players||{})){
        if(String(p?.full_name||'').trim().toLowerCase()===name)return String(id);
      }
    }catch{}
    return'';
  }
  function isLocked(row,pid){
    if(row?.classList?.contains('locked-in')||row?.querySelector('.lock-chip'))return true;
    try{return !!(lockedGames&&lockedGames[String(pid)])}catch{return false}
  }
  function isFutureDay(){
    try{return selectedDay!=='all'&&/^\d{4}-\d{2}-\d{2}$/.test(String(selectedDay||''))&&String(selectedDay)>fantasyDay()}catch{return false}
  }
  function decorate(){
    const root=document.getElementById('teamView');
    if(!root)return;
    const future=isFutureDay();
    root.querySelectorAll('.player-row').forEach(row=>{
      const pts=row.querySelector(':scope > .pts');
      if(!pts)return;
      if(!pts.dataset.rbDayOriginal)pts.dataset.rbDayOriginal=pts.textContent.trim();
      const pid=rowPlayerId(row);
      if(future&&pid&&!isLocked(row,pid)){
        pts.textContent='0.0';
        pts.dataset.rbFutureZero='1';
        pts.classList.remove('rb-lock-ready-pts');
        return;
      }
      if(pts.dataset.rbFutureZero==='1'){
        pts.textContent=pts.dataset.rbDayOriginal||pts.textContent;
        delete pts.dataset.rbFutureZero;
      }
    });
  }
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbFutureDayPts){
      const base=renderTeam;
      const wrapped=function(...args){const out=base.apply(this,args);queueMicrotask(decorate);return out};
      wrapped.__rbFutureDayPts=true;
      renderTeam=wrapped;
      try{window.renderTeam=wrapped}catch{}
    }
  }catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))queueMicrotask(decorate)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='weekSel'||e.target?.id==='teamPicker')queueMicrotask(decorate)},true);
  const root=document.getElementById('teamView');
  if(root)new MutationObserver(()=>queueMicrotask(decorate)).observe(root,{childList:true,subtree:true});
  setTimeout(decorate,0);
})();