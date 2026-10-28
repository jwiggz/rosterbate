(()=>{
  const root=document.getElementById('matchupView');
  if(!root)return;
  let applying=false,pending=false;
  function pairs(){
    const groups=new Map();
    for(const m of (currentData?.matchups||[])){
      const id=String(m?.matchup_id??'');
      if(!id)continue;
      if(!groups.has(id))groups.set(id,[]);
      groups.get(id).push(m);
    }
    return [...groups.entries()].map(([id,rows])=>({id,rows:rows.slice().sort((a,b)=>Number(a.roster_id)-Number(b.roster_id))})).sort((a,b)=>Number(a.id)-Number(b.id));
  }
  function exactState(){
    try{
      const raw=sessionStorage.getItem(`rbMatchupExact:${String(leagueId)}:${Number(selectedWeek)}`);
      return raw?JSON.parse(raw):null;
    }catch{return null}
  }
  function lockedIds(exact,m){
    const out=new Set(),valid=new Set((exact?.starters?.length?exact.starters:m?.starters||[]).map(String)),games=exact?.startersGames;
    if(!games||typeof games!=='object'||Array.isArray(games))return out;
    for(const [k,v] of Object.entries(games)){
      if(valid.has(String(k)))out.add(String(k));
      if(v&&typeof v==='object'){
        const pid=String(v.player_id??v.playerId??v.player??v.pid??'');
        if(valid.has(pid))out.add(pid);
      }
    }
    return out;
  }
  function actualFor(m,pid){
    const starters=(m?.starters||[]).map(String),i=starters.indexOf(String(pid));
    if(i>=0&&Array.isArray(m?.starters_points)){
      const v=Number(m.starters_points[i]);
      if(Number.isFinite(v))return v;
    }
    const v=Number(m?.players_points?.[String(pid)]);
    return Number.isFinite(v)?v:0;
  }
  function futureProjection(pid){
    const p=currentData?.projections?.[String(pid)];
    if(!p||!Array.isArray(p.games))return null;
    const teamAbbr=currentData?.players?.[String(pid)]?.team;
    let best=null;
    for(const pg of p.games){
      const pts=Number(pg?.points);if(!Number.isFinite(pts))continue;
      const gid=String(pg?.game_id||''),date=String(pg?.date||'');
      const sg=(currentData?.schedule||[]).find(g=>(gid&&String(g.game_id||'')===gid)||(!gid&&String(g.date||'')===date&&(!teamAbbr||g.home===teamAbbr||g.away===teamAbbr)));
      if(sg&&String(sg.status||'pre_game')!=='pre_game')continue;
      if(best===null||pts>best)best=pts;
    }
    return best;
  }
  function projectedLockIn(m,exact){
    if(!m)return null;
    const locked=lockedIds(exact,m),starters=(m.starters||[]).map(String).filter(x=>x&&x!=='0');
    let total=0;
    for(const pid of locked)total+=actualFor(m,pid);
    for(const pid of starters){
      if(locked.has(pid))continue;
      const v=futureProjection(pid);
      if(v!==null)total+=v;
    }
    return total;
  }
  function apply(){
    if(applying)return;applying=true;
    try{
      if(typeof currentData==='undefined'||!currentData)return;
      const ps=pairs(),sel=root.querySelector('#rbMatchSelect');
      if(!ps.length||!sel)return;
      const idx=Math.max(0,Math.min(ps.length-1,Number(sel.value)||0)),pair=ps[idx];
      if(!pair)return;
      const ex=exactState(),blocks=root.querySelectorAll('.rb-match-team-block');
      if(!ex||blocks.length<2)return;
      const a=pair.rows[0],b=pair.rows[1];
      const aExact=ex.byRoster?.[String(a?.roster_id)],bExact=ex.byRoster?.[String(b?.roster_id)];
      const aProj=projectedLockIn(a,aExact),bProj=projectedLockIn(b,bExact);
      const left=blocks[0].querySelector('.rb-team-projected-score'),right=blocks[1].querySelector('.rb-team-projected-score');
      if(left&&aProj!==null)left.innerHTML=`${aProj.toFixed(1)} <span>projected</span>`;
      if(right&&bProj!==null)right.innerHTML=`${bProj.toFixed(1)} <span>projected</span>`;
    }catch{}finally{applying=false}
  }
  function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;apply()})}
  const obs=new MutationObserver(muts=>{
    if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.match-top,.rb-match-team-block')||n.querySelector?.('.match-top,.rb-match-team-block')))))schedule();
  });
  obs.observe(root,{childList:true,subtree:true});
  document.addEventListener('change',e=>{if(e.target?.id==='rbMatchSelect')setTimeout(apply,0)},true);
  document.addEventListener('click',e=>{if(e.target?.id==='rbPrevMatch'||e.target?.id==='rbNextMatch')setTimeout(apply,0)},true);
  window.addEventListener('focus',apply);
  setTimeout(apply,0);setTimeout(apply,150);
})();