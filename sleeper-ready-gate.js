(()=>{
  const START=Date.now();
  const MAX_WAIT=10000;
  const JWT=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  let lockSettled=false;
  let lockStatus='';
  let released=false;

  function token(){
    try{return sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||localStorage.getItem('rbSleeperTokenPersistent')||''}catch{return''}
  }
  function hasPrivateSync(){return JWT.test(String(token()||'').trim())}
  function verified(){try{return sessionStorage.getItem('rbSleeperLockSyncVerified')==='1'}catch{return false}}
  function baseReady(){
    try{
      if(!window.currentData)return false;
      if(!Array.isArray(currentData?.teams)||!currentData.teams.length)return false;
      if(!currentData?.players||!Object.keys(currentData.players).length)return false;
      if(!document.querySelector('#teamView .player-row'))return false;
      return true;
    }catch{return false}
  }
  function projectionsReady(){
    try{
      const status=String(document.querySelector('.status')?.textContent||'').toLowerCase();
      if(status.includes('projections loaded'))return true;
      if(currentData?.projections&&Object.keys(currentData.projections).length)return true;
      return false;
    }catch{return false}
  }
  function lockReady(){
    if(!hasPrivateSync())return true;
    if(verified()&&lockSettled&&['ok','cached'].includes(lockStatus))return true;
    return false;
  }
  function linkedRosterReady(){
    try{
      const uid=localStorage.getItem('rbSleeperLinkedUserId')||'';
      if(!uid)return true;
      const roster=(currentData?.teams||[]).find(t=>String(t.owner_id||'')===String(uid));
      return !!roster&&Number(window.selectedRoster)===Number(roster.roster_id);
    }catch{return true}
  }
  function progress(){
    const steps=[
      ['League & roster',baseReady()],
      ['Stats & projections',projectionsReady()],
      ['Your Sleeper roster',linkedRosterReady()],
      ['Lock-In state',lockReady()]
    ];
    const done=steps.filter(x=>x[1]).length;
    const label=document.getElementById('rbReadyLabel');
    const sub=document.getElementById('rbReadySub');
    const bar=document.getElementById('rbReadyBar');
    if(label)label.textContent=`Loading RosterBate… ${done}/${steps.length}`;
    if(sub){const pending=steps.find(x=>!x[1]);sub.textContent=pending?`Syncing ${pending[0]}…`:'Finalizing dashboard…'}
    if(bar)bar.style.width=`${Math.max(12,done/steps.length*100)}%`;
    return done===steps.length;
  }
  function release(reason='ready'){
    if(released)return;released=true;
    const cover=document.getElementById('rbReadyCover');
    document.documentElement.classList.remove('rb-loading');
    document.body?.classList.remove('rb-initializing');
    if(cover){cover.classList.add('rb-ready');setTimeout(()=>cover.remove(),220)}
    try{window.dispatchEvent(new CustomEvent('rb:dashboard-ready',{detail:{reason,elapsed:Date.now()-START}}))}catch{}
  }
  function tick(){
    if(released)return;
    if(progress())return release('ready');
    if(Date.now()-START>=MAX_WAIT)return release('timeout');
    requestAnimationFrame(()=>setTimeout(tick,80));
  }
  function makeCover(){
    if(document.getElementById('rbReadyCover'))return;
    const el=document.createElement('div');
    el.id='rbReadyCover';
    el.innerHTML=`<div class="rb-ready-card"><div class="rb-ready-mark">RB</div><div id="rbReadyLabel" class="rb-ready-title">Loading RosterBate…</div><div id="rbReadySub" class="rb-ready-sub">Loading league data…</div><div class="rb-ready-track"><span id="rbReadyBar"></span></div></div>`;
    document.body.appendChild(el);
  }

  window.addEventListener('rb:lock-sync-settled',e=>{
    lockSettled=true;lockStatus=String(e?.detail?.status||'');
    progress();
  });
  document.addEventListener('DOMContentLoaded',()=>{makeCover();tick()},{once:true});
  if(document.readyState!=='loading'){makeCover();tick()}
})();