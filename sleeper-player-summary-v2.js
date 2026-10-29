(()=>{
  const patched=new WeakMap();
  const labels=[['gp','GP'],['min','MIN'],['pts','PTS'],['tpm','3PM'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['to','TO']];
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function getGlobal(name){try{return Function(`return typeof ${name}!==\"undefined\"?${name}:undefined`)()}catch{return undefined}}
  function data(){return getGlobal('currentData')||null}
  function league(){return getGlobal('leagueId')||''}
  function roster(){return getGlobal('selectedRoster')||''}
  function playerId(card){
    const img=card?.querySelector('.rbphoto img');
    if(img){try{const u=new URL(img.src,location.href),v=u.searchParams.get('player');if(v)return String(v)}catch{}}
    const name=String(card?.querySelector('.rbname')?.textContent||'').trim().toLowerCase();
    for(const [id,p] of Object.entries(data()?.players||{}))if(String(p?.full_name||'').trim().toLowerCase()===name)return String(id);
    return'';
  }
  function dateKey(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v||'').slice(0,10);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function fmtDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?String(v||''):d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}
  function fmtTime(v){const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}
  function projMap(id){const out=new Map();const pg=data()?.projections?.[String(id)]?.games||[];for(const g of pg)out.set(dateKey(g.date),g);return out}
  async function getAverages(id){
    const lid=String(league()),rid=String(roster());
    if(!lid||!rid)return null;
    const r=await fetch(`/.netlify/functions/sleeper-player-stats?league=${encodeURIComponent(lid)}&roster=${encodeURIComponent(rid)}&_=${Date.now()}`,{cache:'no-store'});
    const d=await r.json().catch(()=>null);if(!r.ok||!d?.ok)return null;
    return d.players?.[String(id)]||null;
  }
  async function getDetail(id){
    const d0=data(),p=d0?.players?.[String(id)]||{},q=new URLSearchParams({player:String(id),league:String(league())});
    if(d0?.league?.season)q.set('season',String(d0.league.season));
    if(/^\d+$/.test(String(p.espn_id||'')))q.set('espnId',String(p.espn_id));
    const r=await fetch(`/.netlify/functions/sleeper-player-detail?${q}&_=${Date.now()}`,{cache:'no-store'}),d=await r.json().catch(()=>null);
    return r.ok&&d?d:null;
  }
  function renderStats(card,row){
    const box=card.querySelector('.stats');if(!box)return;
    if(!row){box.innerHTML='<div class="empty">Season stats unavailable.</div>';return}
    box.innerHTML=labels.map(([k,label])=>{const v=k==='gp'?(row.gp??row.averages?.gp):row.averages?.[k];const text=k==='gp'?String(v??'—'):Number.isFinite(Number(v))?Number(v).toFixed(1):'—';return `<div class="stat"><b>${esc(text)}</b><small>${label}</small></div>`}).join('');
  }
  function renderFuture(card,id,detail){
    const box=card.querySelector('.projs');if(!box)return;
    const now=Date.now(),pm=projMap(id);
    const future=(detail?.gameLog||[]).filter(g=>{
      const t=Date.parse(g.date);return Number.isFinite(t)&&t>now&&!g.completed;
    }).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,6);
    if(!future.length){box.innerHTML='<div class="empty">No upcoming games.</div>';return}
    box.innerHTML=future.map(g=>{const p=pm.get(dateKey(g.date)),pts=Number(p?.points),has=Number.isFinite(pts),opp=`${g.homeAway==='away'?'@':'vs'} ${g.opponent||''}`;return `<div class="proj"><div class="projtop"><span>${esc(fmtDate(g.date))}</span><span>Proj</span></div><div class="projopp">${esc(opp)}</div>${has?`<b>${pts.toFixed(1)} proj</b>`:'<b style="color:#91a2b8;font-size:12px">Projection pending</b>'}<div class="projsmall">${esc(fmtTime(g.date))}</div></div>`}).join('');
  }
  async function patch(card){
    if(!card||!card.querySelector('.rbtab.on[data-t="s"]'))return;
    const id=playerId(card);if(!id)return;
    const sig=`${id}:${String(league())}:${String(roster())}`;if(patched.get(card)===sig)return;patched.set(card,sig);
    const [avg,detail]=await Promise.all([getAverages(id).catch(()=>null),getDetail(id).catch(()=>null)]);
    if(!document.body.contains(card))return;
    renderStats(card,avg);renderFuture(card,id,detail);
  }
  setInterval(()=>{const card=document.getElementById('rbPlayerCard');if(card)patch(card)},250);
  document.addEventListener('click',e=>{if(e.target.closest?.('.rbtab[data-t="s"]'))setTimeout(()=>{const card=document.getElementById('rbPlayerCard');if(card){patched.delete(card);patch(card)}},50)},true);
})();
