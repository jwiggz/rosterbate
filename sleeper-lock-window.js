(()=>{
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
  function invalidationKey(){return `rbLockInvalidated:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`}
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
  function deepPair(node,pid,gid,depth=0){
    if(depth>6||node==null)return false;
    if(Array.isArray(node))return node.some(v=>deepPair(v,pid,gid,depth+1));
    if(typeof node!=='object')return false;
    const p=scalar(node.player_id??node.playerId??node.player??node.pid),g=scalar(node.game_id??node.gameId??node.game??node.gid);
    if(p===pid&&g===gid)return true;
    for(const [k,v] of Object.entries(node)){
      if(k===pid&&scalar(v)===gid)return true;
      if(k===gid&&scalar(v)===pid)return true;
      if(typeof v==='object'&&deepPair(v,pid,gid,depth+1))return true;
    }
    return false;
  }
  function sleeperEligible(pid,gid){
    const d=lockState();if(!d)return false;
    pid=String(pid);gid=String(gid);
    if(isInvalidated(pid,gid))return false;
    return deepPair(d.playerMap,pid,gid)||deepPair(d.subs,pid,gid)||deepPair(d.customPoints,pid,gid);
  }
  function priorCompletedGame(pid){
    try{
      if(selectedDay==='all'||String(selectedDay)!==fantasyDay())return null;
      if(lockedGames&&lockedGames[String(pid)])return null;
      const p=player(pid),next=gameForTeam(p.team);if(!next||String(next.status||'pre_game')!=='pre_game')return null;
      const nextT=gameTime(next);
      const games=(currentData?.schedule||[]).filter(g=>{
        if(String(g.status||'')!=='complete')return false;
        if(g.home!==p.team&&g.away!==p.team)return false;
        const t=gameTime(g);return !nextT||!t||t<nextT;
      }).sort((a,b)=>gameTime(b)-gameTime(a));
      return games.find(g=>g?.game_id&&sleeperEligible(pid,String(g.game_id)))||null;
    }catch{return null}
  }
  function showCarryReview(pid,g){
    try{
      const p=player(pid),m=matchup(selectedRoster),pts=pointsFor(m,pid),opp=opponent(g,p.team),when=gameWhen(g);
      showModal('Lock In Previous Completed Game',`<p><strong>${esc(p.full_name)}</strong>'s previous completed game is still available to lock because today's game has not started.</p><div class="change-card" style="grid-template-columns:1fr"><div><div class="change-person">${esc(p.full_name)}</div><div class="change-meta">${esc(when)} ${esc(opp)} · ${num(pts)} pts</div></div></div><div class="warning">Moving this player out of the starter slot that produced this score makes the score permanently ineligible to lock. This lock window also closes when ${esc(p.team||'the player')}'s next game begins.</div>`,`<button data-close>Cancel</button><button id="commitCarryLock" class="primary">Lock In</button>`);
      setTimeout(()=>document.getElementById('commitCarryLock')?.addEventListener('click',()=>commitLock(pid,String(g.game_id))),0);
    }catch{}
  }
  function decorate(){
    try{
      if(!selectedIsOwned())return;
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
    before.forEach((pid,i)=>{
      if(!pid||pid==='0'||after.indexOf(pid)===i)return;
      const g=priorCompletedGame(pid);if(g?.game_id)out.push([pid,String(g.game_id)]);
    });
    return out;
  }
  try{
    if(typeof writeLineup==='function'&&!writeLineup.__rbInvalidateMovedLocks){
      const base=writeLineup;
      const wrapped=async function(starters,...rest){
        let before=[];try{before=(matchup(selectedRoster)?.starters||[]).map(String)}catch{}
        const candidates=movementCandidates(before,starters);
        const result=await base.call(this,starters,...rest);
        candidates.forEach(([pid,gid])=>invalidate(pid,gid));
        queueMicrotask(decorate);
        return result;
      };
      wrapped.__rbInvalidateMovedLocks=true;writeLineup=wrapped;try{window.writeLineup=wrapped}catch{}
    }
  }catch{}
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbCarryLockWindow){const base=renderTeam;const wrapped=function(...args){const out=base.apply(this,args);queueMicrotask(decorate);return out};wrapped.__rbCarryLockWindow=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}}
  }catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))queueMicrotask(decorate)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')queueMicrotask(decorate)},true);
  window.addEventListener('focus',()=>queueMicrotask(decorate));
  setTimeout(decorate,0);
})();