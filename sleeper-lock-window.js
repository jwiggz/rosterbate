(()=>{
  const txState={key:'',ready:false,loading:null,acquired:new Map()};
  const tokenUserId=()=>{
    try{
      const raw=String(sessionStorage.getItem('rbSleeperToken')||localStorage.getItem('rbSleeperTokenPersistent')||sessionStorage.getItem('rbSleeperAuth')||'').trim().replace(/^Bearer\s+/i,'');
      const part=raw.split('.')[1]||'';if(!part)return'';
      const b64=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
      const text=decodeURIComponent(Array.from(atob(b64),c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
      const m=text.match(/"user_id"\s*:\s*(?:"(\d+)"|(\d+))/);return String(m?.[1]||m?.[2]||'');
    }catch{return''}
  };
  function selectedIsOwned(){
    try{const uid=tokenUserId(),t=(currentData?.teams||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));return !!uid&&String(t?.owner_id||'')===uid}catch{return false}
  }
  function fantasyDay(){const d=new Date();if(d.getHours()<6)d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function rowPlayerId(row){
    const existing=String(row?.dataset?.rbPlayerId||'');if(existing)return existing;
    const name=String(row?.querySelector('.pname')?.textContent||'').trim().toLowerCase();if(!name)return'';
    for(const [id,p] of Object.entries(currentData?.players||{})){if(String(p?.full_name||'').trim().toLowerCase()===name)return String(id)}
    return'';
  }
  function gameTime(g){
    const t=Date.parse(String(g?.start_time||''));if(Number.isFinite(t))return t;
    const d=Date.parse(`${String(g?.date||'')}T12:00:00`);return Number.isFinite(d)?d:0;
  }
  function lockState(){
    try{
      const raw=sessionStorage.getItem(`rbLockState:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`);
      const parsed=raw?JSON.parse(raw):null;
      return parsed?.data||null;
    }catch{return null}
  }
  function invalidationKey(){return `rbLockInvalidatedV2:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`}
  function readInvalidated(){
    try{const raw=localStorage.getItem(invalidationKey());const v=raw?JSON.parse(raw):{};return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return{}}
  }
  function isInvalidated(pid,gid){
    const v=readInvalidated(),games=Array.isArray(v[String(pid)])?v[String(pid)]:[];
    return games.map(String).includes(String(gid));
  }
  function invalidate(pid,gid){
    if(!pid||!gid)return;
    try{
      const v=readInvalidated(),key=String(pid),games=new Set(Array.isArray(v[key])?v[key].map(String):[]);
      games.add(String(gid));v[key]=[...games];localStorage.setItem(invalidationKey(),JSON.stringify(v));
    }catch{}
  }
  function scalar(v){return v==null?'':String(v)}
  function containsPlayer(node,pid,depth=0){
    if(depth>7||node==null)return false;
    pid=String(pid);
    if(Array.isArray(node))return node.some(v=>containsPlayer(v,pid,depth+1));
    if(typeof node!=='object')return scalar(node)===pid;
    const direct=scalar(node.player_id??node.playerId??node.player??node.pid);
    if(direct===pid)return true;
    for(const [k,v] of Object.entries(node)){
      if(String(k)===pid)return true;
      if(typeof v==='object'){if(containsPlayer(v,pid,depth+1))return true}
      else if(scalar(v)===pid)return true;
    }
    return false;
  }
  function sleeperStarterHistory(pid){
    const d=lockState();if(!d)return false;
    pid=String(pid);
    return containsPlayer(d.playerMap,pid)||containsPlayer(d.subs,pid);
  }
  function txKey(){return `${String(leagueId)}:${String(selectedWeek)}:${String(selectedRoster)}`}
  async function ensureTransactions(){
    const k=txKey();
    if(txState.key!==k){txState.key=k;txState.ready=false;txState.loading=null;txState.acquired=new Map()}
    if(txState.ready)return;
    if(txState.loading)return txState.loading;
    txState.loading=(async()=>{
      try{
        const r=await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}/transactions/${encodeURIComponent(selectedWeek)}`,{headers:{Accept:'application/json'},cache:'no-store'});
        const rows=r.ok?await r.json():[];
        if(Array.isArray(rows))for(const tx of rows){
          const created=Number(tx?.created||0);const adds=tx?.adds&&typeof tx.adds==='object'?tx.adds:{};
          for(const [pid,rid] of Object.entries(adds)){
            if(Number(rid)!==Number(selectedRoster)||!created)continue;
            const old=txState.acquired.get(String(pid));
            if(!old||created<old)txState.acquired.set(String(pid),created);
          }
        }
      }catch{}finally{txState.ready=true;txState.loading=null}
    })();
    return txState.loading;
  }
  function acquiredAfterGame(pid,g){
    const at=Number(txState.acquired.get(String(pid))||0),gt=gameTime(g);
    return !!at&&!!gt&&at>gt;
  }
  function candidateCompletedGames(pid){
    try{
      const p=player(pid),next=gameForTeam(p.team);if(!next||String(next.status||'pre_game')!=='pre_game')return[];
      const nextT=gameTime(next);
      return (currentData?.schedule||[]).filter(g=>{
        if(String(g.status||'')!=='complete')return false;
        if(g.home!==p.team&&g.away!==p.team)return false;
        const t=gameTime(g);return !nextT||!t||t<nextT;
      }).sort((a,b)=>gameTime(b)-gameTime(a));
    }catch{return[]}
  }
  function priorCompletedGame(pid){
    try{
      if(selectedDay==='all'||String(selectedDay)!==fantasyDay())return null;
      if(lockedGames&&lockedGames[String(pid)])return null;
      if(!sleeperStarterHistory(pid))return null;
      return candidateCompletedGames(pid).find(g=>g?.game_id&&!isInvalidated(pid,String(g.game_id))&&!acquiredAfterGame(pid,g))||null;
    }catch{return null}
  }
  function showCarryReview(pid,g){
    try{
      const p=player(pid),m=matchup(selectedRoster),pts=pointsFor(m,pid),opp=opponent(g,p.team),when=gameWhen(g);
      showModal('Lock In Previous Completed Game',`<p><strong>${esc(p.full_name)}</strong>'s previous completed game is still available to lock because the next game has not started.</p><div class="change-card" style="grid-template-columns:1fr"><div><div class="change-person">${esc(p.full_name)}</div><div class="change-meta">${esc(when)} ${esc(opp)} · ${num(pts)} pts</div></div></div><div class="warning">Sleeper requires the player to have been in a starting slot when this game was played. Moving between starting positions preserves eligibility; moving the player to the bench does not. The window also closes when the next game begins.</div>`,`<button data-close>Cancel</button><button id="commitCarryLock" class="primary">Lock In</button>`);
      setTimeout(()=>document.getElementById('commitCarryLock')?.addEventListener('click',()=>commitLock(pid,String(g.game_id))),0);
    }catch{}
  }
  async function decorate(){
    try{
      if(!selectedIsOwned())return;
      await ensureTransactions();
      const root=document.getElementById('teamView');if(!root)return;
      root.querySelectorAll('.player-row[data-starter-index]').forEach(row=>{
        if(row.classList.contains('locked-in')||row.querySelector('.lock-chip'))return;
        const pid=rowPlayerId(row);if(!pid)return;
        const existing=row.querySelector('.lock-btn[data-rb-carry-lock="1"]');
        const g=priorCompletedGame(pid);
        if(!g){
          existing?.remove();
          if(!row.querySelector('.lock-btn'))row.classList.remove('lockable');
          return;
        }
        row.querySelector('.rb-lock-unavailable')?.remove();
        row.classList.add('lockable');
        let btn=existing;
        if(!btn){
          btn=document.createElement('button');btn.type='button';btn.className='lock-btn';btn.textContent='LOCK IN';btn.dataset.rbCarryLock='1';
          const meta=row.querySelector('.matchup-meta')||row.querySelector('.player-copy')||row.querySelector('.player-info');meta?.appendChild(btn);
        }
        btn.dataset.lockPlayer=pid;btn.dataset.lockGame=String(g.game_id);
        if(btn.dataset.rbCarryBound!=='1'){
          btn.dataset.rbCarryBound='1';
          btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const current=priorCompletedGame(pid);if(current)showCarryReview(pid,current)});
        }
      });
    }catch{}
  }
  function movementCandidates(before,after){
    const out=[];
    before=(Array.isArray(before)?before:[]).map(String);after=(Array.isArray(after)?after:[]).map(String);
    const beforeSet=new Set(before.filter(x=>x&&x!=='0')),afterSet=new Set(after.filter(x=>x&&x!=='0'));
    for(const pid of beforeSet){
      if(afterSet.has(pid))continue;
      const g=priorCompletedGame(pid);if(g?.game_id)out.push([pid,String(g.game_id)]);
    }
    for(const pid of afterSet){
      if(beforeSet.has(pid))continue;
      const g=candidateCompletedGames(pid)[0];if(g?.game_id)out.push([pid,String(g.game_id)]);
    }
    return out;
  }
  try{
    if(typeof writeLineup==='function'&&!writeLineup.__rbInvalidateMovedLocksV2){
      const base=writeLineup;
      const wrapped=async function(starters,...rest){
        let before=[];try{before=(matchup(selectedRoster)?.starters||[]).map(String)}catch{}
        const candidates=movementCandidates(before,starters);
        const result=await base.call(this,starters,...rest);
        candidates.forEach(([pid,gid])=>invalidate(pid,gid));
        queueMicrotask(()=>decorate());
        return result;
      };
      wrapped.__rbInvalidateMovedLocksV2=true;writeLineup=wrapped;try{window.writeLineup=wrapped}catch{}
    }
  }catch{}
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbCarryLockWindowV2){const base=renderTeam;const wrapped=function(...args){const out=base.apply(this,args);queueMicrotask(()=>decorate());return out};wrapped.__rbCarryLockWindowV2=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}}
  }catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))queueMicrotask(()=>decorate())},true);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')queueMicrotask(()=>decorate())},true);
  window.addEventListener('focus',()=>queueMicrotask(()=>decorate()));
  let attempts=0;const retry=setInterval(()=>{decorate();attempts++;if(attempts>=16)clearInterval(retry)},500);
  setTimeout(()=>decorate(),0);
})();