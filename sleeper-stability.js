(()=>{
// Keep optional enhancement scripts from disrupting the base lineup editor.
// 1) The stats layer calls renderTeam() after a private lock refresh. That background
//    render can erase the starter slot the user just selected. Suppress only calls
//    originating from syncPrivateLocks; all normal/base renderTeam calls still run.
try{
  if(typeof renderTeam==='function' && !renderTeam.__rbStable){
    const baseRenderTeam=renderTeam;
    const stableRenderTeam=function(...args){
      const stack=String(new Error().stack||'');
      if(stack.includes('syncPrivateLocks')) return;
      return baseRenderTeam.apply(this,args);
    };
    stableRenderTeam.__rbStable=true;
    renderTeam=stableRenderTeam;
    try{window.renderTeam=stableRenderTeam}catch{}
  }
}catch{}

// 2) Disable the experimental live Sleeper-CDN headshot replacement for now.
//    Firefox/browser failures were causing repeated white flashes. We keep the
//    original initials fallback visible and leave avatar work isolated from lineup UI.
try{
  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(descriptor?.set && descriptor?.get && !HTMLImageElement.prototype.__rbAvatarGuard){
    Object.defineProperty(HTMLImageElement.prototype,'src',{
      configurable:true,
      enumerable:descriptor.enumerable,
      get:descriptor.get,
      set:function(value){
        const url=String(value||'');
        if(url.includes('sleepercdn.com/content/nba/players/thumb/')){
          this.dataset.rbAvatarSuppressed='1';
          // Transparent pixel: preserves the initials underneath without a network request.
          return descriptor.set.call(this,'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==');
        }
        return descriptor.set.call(this,value);
      }
    });
    HTMLImageElement.prototype.__rbAvatarGuard=true;
  }
}catch{}

const style=document.createElement('style');
style.id='rbStabilityStyle';
style.textContent=`
#teamView img.rb-sleeper-headshot[data-rb-avatar-suppressed="1"]{background:transparent!important;opacity:0!important;pointer-events:none!important}
`;
document.head.appendChild(style);

// 3) Opponent Lock-In display. Sleeper's public matchup row exposes the counted
//    matchup total plus index-aligned starter scores, but not always starters_games.
//    For a read-only opponent view, infer the counted starter subset whose scores
//    exactly equal matchup.points. This is display-only; lineup writes remain owner-only.
try{
  const inferredCache=new Map();
  function tokenUserId(){
    try{
      const raw=sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||'';
      const part=String(raw).replace(/^Bearer\s+/i,'').split('.')[1]||'';
      if(!part)return'';
      const b64=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
      const text=decodeURIComponent(Array.from(atob(b64),c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
      const m=text.match(/"user_id"\s*:\s*(?:"(\d+)"|(\d+))/);
      return String(m?.[1]||m?.[2]||'');
    }catch{return''}
  }
  function selectedIsOwned(){
    try{
      const uid=tokenUserId();
      const t=(currentData?.teams||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));
      return !!uid&&String(t?.owner_id||'')===uid;
    }catch{return true}
  }
  function playerNameMap(){
    const map=new Map();
    try{for(const [id,p] of Object.entries(currentData?.players||{})){const n=String(p?.full_name||'').trim().toLowerCase();if(n&&!map.has(n))map.set(n,String(id))}}catch{}
    return map;
  }
  function rowPlayerId(row,names){
    const existing=String(row?.dataset?.rbPlayerId||'');if(existing)return existing;
    const name=String(row?.querySelector('.pname')?.textContent||'').replace(/\s*\(locked\)\s*$/i,'').trim().toLowerCase();
    const id=names.get(name)||'';if(id&&row?.dataset)row.dataset.rbPlayerId=id;return id;
  }
  function explicitLocks(m){
    const out=new Set(),starters=(m?.starters||[]).map(String),sg=m?.starters_games||m?.startersGames;
    if(!sg||typeof sg!=='object'||Array.isArray(sg))return out;
    for(const [k,v] of Object.entries(sg)){
      if(starters.includes(String(k)))out.add(String(k));
      if(v&&typeof v==='object'){
        const pid=String(v.player_id??v.playerId??v.player??v.pid??'');
        if(pid&&starters.includes(pid))out.add(pid);
      }
    }
    return out;
  }
  function dayGameStatus(pid){
    try{
      if(typeof selectedDay==='undefined'||selectedDay==='all')return'';
      const team=String(currentData?.players?.[String(pid)]?.team||'');
      const g=(currentData?.schedule||[]).find(x=>String(x.date||'')===String(selectedDay)&&(x.home===team||x.away===team));
      return String(g?.status||'');
    }catch{return''}
  }
  function cacheKey(rid){return `${String(leagueId)}:${String(selectedWeek)}:${String(rid)}`}
  function readSessionLocks(rid){
    try{const raw=sessionStorage.getItem(`rbOpponentLocks:${cacheKey(rid)}`);return new Set(raw?JSON.parse(raw).map(String):[])}catch{return new Set()}
  }
  function writeSessionLocks(rid,set){try{sessionStorage.setItem(`rbOpponentLocks:${cacheKey(rid)}`,JSON.stringify([...set]))}catch{}}
  function inferCountedLocks(m){
    const rid=Number(m?.roster_id),explicit=explicitLocks(m);if(explicit.size)return explicit;
    const starters=(m?.starters||[]).map(String),raw=Array.isArray(m?.starters_points)?m.starters_points:[];
    const target=Math.round(Number(m?.points||0)*10);
    if(!target||!starters.length||!raw.length)return readSessionLocks(rid);
    const items=[];
    starters.forEach((pid,i)=>{
      const pts=Number(raw[i]),value=Math.round(pts*10);
      if(pid&&pid!=='0'&&Number.isFinite(pts)&&value!==0)items.push({pid,value,status:dayGameStatus(pid)});
    });
    if(!items.length||items.length>20)return readSessionLocks(rid);
    const prior=readSessionLocks(rid);let best=null;
    const limit=1<<items.length;
    for(let mask=1;mask<limit;mask++){
      let sum=0,count=0,live=0,pre=0,complete=0,priorHits=0;
      for(let i=0;i<items.length;i++)if(mask&(1<<i)){
        const it=items[i];sum+=it.value;count++;
        if(it.status==='in_game')live++;else if(it.status==='pre_game')pre++;else if(it.status==='complete')complete++;
        if(prior.has(it.pid))priorHits++;
      }
      if(sum!==target)continue;
      // Prefer previously established locks, then no live/pre-game rows, then completed
      // rows, then a larger counted set. This keeps the inference conservative/stable.
      const rank=[priorHits,-live,-pre,complete,count];
      if(!best||rank.some((v,j)=>v!==best.rank[j]&&(v>best.rank[j])&&!rank.slice(0,j).some((x,k)=>x!==best.rank[k]))){best={mask,rank}}
    }
    if(!best)return prior;
    const out=new Set(prior);
    items.forEach((it,i)=>{if(best.mask&(1<<i))out.add(it.pid)});
    inferredCache.set(cacheKey(rid),out);writeSessionLocks(rid,out);return out;
  }
  function makeLocked(row){
    if(!row)return;
    row.classList.remove('lockable','editable');row.classList.add('locked-in');row.setAttribute('aria-disabled','true');
    row.querySelectorAll('.lock-btn').forEach(x=>x.remove());
    let chip=row.querySelector('.lock-chip');if(!chip){chip=document.createElement('span');chip.className='lock-chip'}
    chip.textContent='LOCKED IN';chip.setAttribute('aria-label','Locked in on Sleeper');
    const meta=row.querySelector('.matchup-meta'),copy=row.querySelector('.player-copy')||row.querySelector('.player-info')||row;
    if(meta&&chip.parentElement!==meta)meta.appendChild(chip);else if(!meta&&chip.parentElement!==copy)copy.appendChild(chip);
  }
  function decorateOpponentLocks(){
    if(typeof currentData==='undefined'||!currentData||selectedIsOwned())return;
    const m=(currentData.matchups||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));if(!m)return;
    const locked=inferCountedLocks(m),starters=new Set((m.starters||[]).map(String)),names=playerNameMap();
    const card=document.querySelector('#teamView .team-card');if(!card)return;
    const bench=card.querySelector('.bench');
    [...card.querySelectorAll('.player-row')].forEach(row=>{
      if(bench?.contains(row)||row.closest('.ir-list'))return;
      const pid=rowPlayerId(row,names);if(!pid||!starters.has(pid))return;
      if(locked.has(pid))makeLocked(row);
      else{
        // Opponent rosters are read-only. Never render an actionable Lock In button.
        row.querySelectorAll('.lock-btn').forEach(x=>x.remove());
      }
    });
    const lockedTotal=Number(m.points);
    const totalBox=card.querySelector('.rb-lock-total.locked');
    if(totalBox&&Number.isFinite(lockedTotal)){
      const b=totalBox.querySelector('b'),small=totalBox.querySelector('small');
      if(b)b.textContent=lockedTotal.toFixed(1);if(small)small.textContent=`${locked.size} counted locks`;
    }
  }
  function burst(){decorateOpponentLocks();requestAnimationFrame(decorateOpponentLocks);setTimeout(decorateOpponentLocks,40);setTimeout(decorateOpponentLocks,140);setTimeout(decorateOpponentLocks,350)}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab,#teamPicker'))setTimeout(burst,0)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')setTimeout(burst,0)},true);
  window.addEventListener('focus',burst);
  let attempts=0;const boot=setInterval(()=>{attempts++;if(typeof currentData!=='undefined'&&currentData&&document.querySelector('#teamView .team-card')){clearInterval(boot);burst()}else if(attempts>=40)clearInterval(boot)},100);
}catch{}
})();