(()=>{
  const labels=[['gp','GP'],['min','MIN'],['pts','PTS'],['tpm','3PM'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['to','TO']];
  const done=new WeakSet();
  function playerId(card){
    const img=card?.querySelector('.rbphoto img');
    if(img){try{const u=new URL(img.src,location.href),p=u.searchParams.get('player');if(p)return String(p)}catch{}}
    const name=String(card?.querySelector('.rbname')?.textContent||'').trim().toLowerCase();
    for(const [id,p] of Object.entries(window.currentData?.players||{}))if(String(p?.full_name||'').trim().toLowerCase()===name)return String(id);
    return'';
  }
  function cleanProjections(card){
    const box=card.querySelector('.projs');if(!box)return;
    box.querySelectorAll('.proj').forEach(x=>{
      const opp=String(x.querySelector('.projopp')?.textContent||'').trim().toLowerCase();
      if(opp==='scheduled game')x.remove();
    });
    if(!box.querySelector('.proj'))box.innerHTML='<div class="empty">No projections for scheduled games.</div>';
  }
  async function fillAverages(card){
    const id=playerId(card),stats=card.querySelector('.stats');if(!id||!stats)return;
    try{
      const r=await fetch(`/.netlify/functions/sleeper-player-season-summary?league=${encodeURIComponent(window.leagueId||'')}&player=${encodeURIComponent(id)}&_=${Date.now()}`,{cache:'no-store'}),d=await r.json();
      if(!r.ok||!d?.ok||!d.gp)return;
      stats.innerHTML=labels.map(([k,label])=>{
        const v=k==='gp'?d.gp:d.averages?.[k];
        const text=k==='gp'?String(v??'—'):Number.isFinite(Number(v))?Number(v).toFixed(1):'—';
        return `<div class="stat"><b>${text}</b><small>${label}</small></div>`;
      }).join('');
    }catch{}
  }
  function run(card){
    if(!card)return;
    cleanProjections(card);
    if(!done.has(card)){done.add(card);fillAverages(card)}
  }
  const mo=new MutationObserver(()=>{const card=document.getElementById('rbPlayerCard');if(card)requestAnimationFrame(()=>run(card))});
  mo.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',()=>{const card=document.getElementById('rbPlayerCard');if(card)setTimeout(()=>run(card),0)},true);
})();
