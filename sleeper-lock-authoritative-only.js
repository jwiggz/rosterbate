(()=>{
  function clean(){
    try{
      document.querySelectorAll('#teamView .lock-btn[data-rb-carry-lock="1"]').forEach(btn=>{
        const row=btn.closest('.player-row');btn.remove();if(row&&!row.querySelector('.lock-btn')&&!row.querySelector('.lock-chip'))row.classList.remove('lockable');
      });
    }catch{}
  }
  const observer=new MutationObserver(clean);
  const start=()=>{const root=document.getElementById('teamView');if(root)observer.observe(root,{childList:true,subtree:true});clean()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))queueMicrotask(clean)},true);
})();
