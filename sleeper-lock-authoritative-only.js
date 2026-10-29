(()=>{
  function gameById(gid){
    try{return (currentData?.schedule||[]).find(g=>String(g?.game_id||'')===String(gid||''))||null}catch{return null}
  }
  function verified(btn){
    try{
      // Carry-forward buttons are only created by sleeper-lock-window after all of its
      // current eligibility checks pass (starter evidence/fallback, invalidation,
      // acquisition timing, already-locked state, and next-game window). Do not
      // second-guess that result with the older strict starter-history-only rule.
      if(String(btn?.dataset?.rbHistoryVerified||'')==='1')return true;
      const pid=String(btn?.dataset?.lockPlayer||''),gid=String(btn?.dataset?.lockGame||'');
      if(!pid||!gid||!window.rbStarterHistory?.eligible)return false;
      const g=gameById(gid);if(!g)return false;
      return !!window.rbStarterHistory.eligible(pid,g);
    }catch{return false}
  }
  function clean(){
    try{
      document.querySelectorAll('#teamView .lock-btn[data-rb-carry-lock="1"]').forEach(btn=>{
        if(verified(btn)){
          btn.dataset.rbHistoryVerified='1';
          btn.title=btn.title||'Verified by RosterBate carry-forward lock checks';
          return;
        }
        const row=btn.closest('.player-row');btn.remove();
        if(row&&!row.querySelector('.lock-btn')&&!row.querySelector('.lock-chip'))row.classList.remove('lockable');
      });
    }catch{}
  }
  const observer=new MutationObserver(clean);
  const start=()=>{const root=document.getElementById('teamView');if(root)observer.observe(root,{childList:true,subtree:true});clean()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))queueMicrotask(clean)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')setTimeout(clean,0)},true);
  window.addEventListener('focus',()=>queueMicrotask(clean));
  setInterval(clean,1000);
})();
