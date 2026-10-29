(()=>{
  const labels=[['gp','GP'],['min','MIN'],['pts','PTS'],['tpm','3PM'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['to','TO']];
  const done=new WeakSet();
  function data(){try{return typeof currentData!=='undefined'?currentData:null}catch{return null}}
  function league(){try{return typeof leagueId!=='undefined'?String(leagueId):''}catch{return''}}
  function roster(){try{return typeof selectedRoster!=='undefined'?String(selectedRoster):''}catch{return''}}
  function playerId(card){
    const img=card?.querySelector('.rbphoto img');
    if(img){try{const u=new URL(img.src,location.href),p=u.searchParams.get('player');if(p)return String(p)}catch{}}
    const name=String(card?.querySelector('.rbname')?.textContent||'').trim().toLowerCase();
    for(const [id,p] of Object.entries(data()?.players||{}))if(String(p?.full_name||'').trim().toLowerCase()===name)return String(id);
    return'';
  }
  function fmtDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?String(v||''):d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}
  function fmtTime(v){const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}
  function projectionGames(id){const p=data()?.projections?.[String(id)]||{};return Array.isArray(p.games)?p.games:[]}
  function localDateKey(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v||'').slice(0,10);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function matchProjection(id,game){const key=localDateKey(game.date);return projectionGames(id).find(x=>localDateKey(x.date)===key)||null}
  async function fillAverages(card,id){
    const stats=card.querySelector('.stats');if(!id||!stats)return;
    try{
      const rid=roster(),lid=league();if(!rid||!lid)return;
      const r=await fetch(`/.netlify/functions/sleeper-player-stats?league=${encodeURIComponent(lid)}&roster=${encodeURIComponent(rid)}&_=${Date.now()}`,{cache:'no-store'}),d=await r.json();
      const row=r.ok&&d?.ok?d.players?.[String(id)]:null;
      if(!row)return;
      stats.innerHTML=labels.map(([k,label])=>{
        const v=k==='gp'?(row.gp??row.averages?.gp):row.averages?.[k];
        const out=k==='gp'?String(v??'—'):Number.isFinite(Number(v))?Number(v).toFixed(1):'—';
        return `<div class="stat"><b>${out}</b><small>${label}</small></div>`;
      }).join('');
    }catch{}
  }
  async function rebuildProjections(card,id){
    const box=card.querySelector('.projs');if(!box||!id)return;
    try{
      const d0=data(),lid=league();
      const q=new URLSearchParams({player:id,league:lid});
      if(d0?.league?.season)q.set('season',String(d0.league.season));
      const p=d0?.players?.[String(id)]||{};
      if(/^\d+$/.test(String(p.espn_id||'')))q.set('espnId',String(p.espn_id));
      const r=await fetch(`/.netlify/functions/sleeper-player-detail?${q}&_=${Date.now()}`,{cache:'no-store'}),d=await r.json();
      if(!r.ok||!d?.ok)return;
      const now=Date.now();
      const future=(d.gameLog||[])
        .filter(g=>!g.completed&&Number.isFinite(Date.parse(g.date))&&Date.parse(g.date)>now)
        .sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))
        .slice(0,6);
      if(!future.length){box.innerHTML='<div class="empty">No upcoming games.</div>';return}
      box.innerHTML=future.map(g=>{
        const proj=matchProjection(id,g),points=Number(proj?.points),has=Number.isFinite(points),opp=`${g.homeAway==='away'?'@':'vs'} ${g.opponent||''}`;
        return `<div class="proj"><div class="projtop"><span>${fmtDate(g.date)}</span><span>Proj</span></div><div class="projopp">${opp}</div>${has?`<b>${points.toFixed(1)} proj</b>`:'<b style="color:#91a2b8;font-size:12px">Projection pending</b>'}<div class="projsmall">${fmtTime(g.date)}</div></div>`;
      }).join('');
    }catch{}
  }
  function run(card){
    if(!card)return;
    const id=playerId(card);if(!id)return;
    if(!done.has(card)){done.add(card);fillAverages(card,id);rebuildProjections(card,id)}
  }
  const mo=new MutationObserver(()=>{const card=document.getElementById('rbPlayerCard');if(card)requestAnimationFrame(()=>run(card))});
  mo.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',()=>{const card=document.getElementById('rbPlayerCard');if(card)setTimeout(()=>run(card),0)},true);
})();
