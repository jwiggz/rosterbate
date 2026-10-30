(()=>{
  if(document.getElementById('rbLockPulseScrollFix'))return;
  const style=document.createElement('style');
  style.id='rbLockPulseScrollFix';
  style.textContent=`
@keyframes rbPtsLockReady5s{
  0%,84%,100%{box-shadow:0 0 0 1px rgba(255,163,54,.28),0 0 7px rgba(255,147,42,.20)}
  88%{box-shadow:0 0 0 2px rgba(255,210,132,.92),0 0 22px rgba(255,150,38,.80)}
  92%{box-shadow:0 0 0 1px rgba(255,180,72,.52),0 0 12px rgba(255,150,38,.44)}
  96%{box-shadow:0 0 0 2px rgba(255,218,148,.82),0 0 18px rgba(255,150,38,.64)}
}
#teamView .player-row.rb-stats-row.lockable > .pts.rb-lock-ready-pts{
  animation:rbPtsLockReady5s 5s ease-in-out infinite!important;
}
@media (prefers-reduced-motion: reduce){
  #teamView .player-row.rb-stats-row.lockable > .pts.rb-lock-ready-pts{animation:none!important}
}
`;
  document.head.appendChild(style);

  let saved=null;
  const playerTarget=e=>e.target?.closest?.('#teamView .player-info,#teamView .player-head,#teamView .player-copy');
  const capture=e=>{
    if(!playerTarget(e))return;
    saved={x:window.scrollX||window.pageXOffset||0,y:window.scrollY||window.pageYOffset||0,ts:Date.now()};
  };
  const restore=()=>{
    if(!saved||Date.now()-saved.ts>3000)return;
    const {x,y}=saved;
    const go=()=>{try{window.scrollTo({left:x,top:y,behavior:'instant'})}catch{window.scrollTo(x,y)}};
    go();
    requestAnimationFrame(()=>{go();requestAnimationFrame(go)});
    setTimeout(go,60);
    setTimeout(go,180);
    setTimeout(()=>{go();saved=null},450);
  };

  document.addEventListener('pointerdown',capture,true);
  document.addEventListener('mousedown',capture,true);
  document.addEventListener('touchstart',capture,{capture:true,passive:true});
  document.addEventListener('click',e=>{if(playerTarget(e)){if(!saved)capture(e);queueMicrotask(restore)}},true);

  new MutationObserver(muts=>{
    if(!saved)return;
    for(const m of muts){
      for(const n of m.addedNodes||[]){
        if(n?.id==='rbPlayerCardBackdrop'||n?.querySelector?.('#rbPlayerCardBackdrop')){restore();return}
      }
    }
  }).observe(document.body,{childList:true,subtree:false});
})();
