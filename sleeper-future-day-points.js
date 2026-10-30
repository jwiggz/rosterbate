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
  let decorating=false;
  function decorate(){
    if(decorating)return;
    decorating=true;
    try{
      const root=document.getElementById('teamView');
      if(!root)return;
      const future=isFutureDay();
      root.querySelectorAll('.player-row').forEach(row=>{
        const pts=row.querySelector(':scope > .pts');
        if(!pts)return;
        if(!pts.dataset.rbDayOriginal)pts.dataset.rbDayOriginal=pts.textContent.trim();
        const pid=rowPlayerId(row);
        const shouldZero=!!(future&&pid&&!isLocked(row,pid));
        if(shouldZero){
          if(pts.dataset.rbFutureZero!=='1'){
            pts.dataset.rbFutureZero='1';
            pts.classList.remove('rb-lock-ready-pts');
          }
          if(pts.textContent.trim()!=='0.0')pts.textContent='0.0';
          return;
        }
        if(pts.dataset.rbFutureZero==='1'){
          const original=pts.dataset.rbDayOriginal||pts.textContent;
          delete pts.dataset.rbFutureZero;
          if(pts.textContent.trim()!==original)pts.textContent=original;
        }
      });
    }finally{decorating=false}
  }
  function scheduleDecorate(){
    if(scheduleDecorate.pending)return;
    scheduleDecorate.pending=true;
    requestAnimationFrame(()=>{scheduleDecorate.pending=false;decorate()});
  }
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbFutureDayPtsV2){
      const base=renderTeam;
      const wrapped=function(...args){const out=base.apply(this,args);scheduleDecorate();return out};
      wrapped.__rbFutureDayPtsV2=true;
      renderTeam=wrapped;
      try{window.renderTeam=wrapped}catch{}
    }
  }catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))scheduleDecorate()},true);
  document.addEventListener('change',e=>{if(e.target?.id==='weekSel'||e.target?.id==='teamPicker')scheduleDecorate()},true);
  setTimeout(scheduleDecorate,0);
})();