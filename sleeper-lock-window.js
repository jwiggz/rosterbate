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
      const g=games[0];return g?.game_id?g:null;
    }catch{return null}
  }
  function showCarryReview(pid,g){
    try{
      const p=player(pid),m=matchup(selectedRoster),pts=pointsFor(m,pid),opp=opponent(g,p.team),when=gameWhen(g);
      showModal('Lock In Previous Completed Game',`<p><strong>${esc(p.full_name)}</strong>'s previous completed game is still available to lock because today's game has not started.</p><div class="change-card" style="grid-template-columns:1fr"><div><div class="change-person">${esc(p.full_name)}</div><div class="change-meta">${esc(when)} ${esc(opp)} · ${num(pts)} pts</div></div></div><div class="warning">This lock window closes when ${esc(p.team||'the player')}'s next game begins. Sleeper Lock-In selections are irreversible once submitted.</div>`,`<button data-close>Cancel</button><button id="commitCarryLock" class="primary">Lock In</button>`);
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
        const g=priorCompletedGame(pid);if(!g)return;
        row.classList.add('lockable');
        let btn=row.querySelector('.lock-btn[data-rb-carry-lock="1"]');
        if(!btn){
          btn=document.createElement('button');btn.type='button';btn.className='lock-btn';btn.textContent='LOCK IN';btn.dataset.rbCarryLock='1';btn.dataset.lockPlayer=pid;btn.dataset.lockGame=String(g.game_id);
          const meta=row.querySelector('.matchup-meta')||row.querySelector('.player-copy')||row.querySelector('.player-info');meta?.appendChild(btn);
          btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showCarryReview(pid,g)});
        }
      });
    }catch{}
  }
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbCarryLockWindow){const base=renderTeam;const wrapped=function(...args){const out=base.apply(this,args);queueMicrotask(decorate);return out};wrapped.__rbCarryLockWindow=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}}
  }catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))queueMicrotask(decorate)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')queueMicrotask(decorate)},true);
  window.addEventListener('focus',()=>queueMicrotask(decorate));
  setTimeout(decorate,0);
})();