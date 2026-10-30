(()=>{
  const START=Date.now();
  const MAX_WAIT=10000;
  const JWT=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  let released=false;

  function token(){
    try{return sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||localStorage.getItem('rbSleeperTokenPersistent')||''}catch{return''}
  }
  function hasPrivateSync(){return JWT.test(String(token()||'').trim())}
  function verified(){try{return sessionStorage.getItem('rbSleeperLockSyncVerified')==='1'}catch{return false}}
  function data(){try{return typeof currentData!=='undefined'?currentData:null}catch{return null}}
  function rosterId(){try{return Number(typeof selectedRoster!=='undefined'?selectedRoster:0)}catch{return 0}}
  function week(){try{return Number(typeof selectedWeek!=='undefined'?selectedWeek:0)}catch{return 0}}
  function league(){try{return String(typeof leagueId!=='undefined'?leagueId:'')}catch{return''}}
  function baseReady(){
    try{
      const d=data();
      if(!d)return false;
      if(!Array.isArray(d?.teams)||!d.teams.length)return false;
      if(!d?.players||!Object.keys(d.players).length)return false;
      if(!document.querySelector('#teamView .player-row'))return false;
      return true;
    }catch{return false}
  }
  function projectionsReady(){
    try{
      const d=data();
      const status=String(document.querySelector('.status')?.textContent||'').toLowerCase();
      if(status.includes('projections loaded'))return true;
      if(d?.projections&&Object.keys(d.projections).length)return true;
      return false;
    }catch{return false}
  }
  function lockCache(){
    try{
      const lg=league(),rid=rosterId(),wk=week();
      if(!lg||!rid||!wk)return null;
      const raw=sessionStorage.getItem(`rbLockState:${lg}:${rid}:${wk}`);
      if(!raw)return null;
      const x=JSON.parse(raw);
      return x?.data?x:null;
    }catch{return null}
  }
  function freshLockCacheReady(){
    const x=lockCache();
    if(!x)return false;
    return Number(x.ts||0)>=START-500;
  }
  function lockUiApplied(){
    try{
      const d=data();
      const m=(d?.matchups||[]).find(x=>Number(x.roster_id)===rosterId());
      const sg=m?.starters_games||m?.startersGames||{};
      const privateSg=lockCache()?.data?.startersGames||{};
      const expected=Math.max(Object.keys(sg||{}).length,Object.keys(privateSg||{}).length);
      if(expected===0)return true;
      const lockedRows=document.querySelectorAll('#teamView .player-row.locked-in').length;
      return lockedRows>=expected;
    }catch{return false}
  }
  function lockReady(){
    if(!hasPrivateSync())return true;
    return verified()&&freshLockCacheReady()&&lockUiApplied();
  }
  function linkedRosterReady(){
    try{
      const d=data();
      const uid=localStorage.getItem('rbSleeperLinkedUserId')||'';
      if(!uid)return true;
      const roster=(d?.teams||[]).find(t=>String(t.owner_id||'')===String(uid));
      return !!roster&&rosterId()===Number(roster.roster_id);
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
    setTimeout(tick,80);
  }
  function makeCover(){
    if(document.getElementById('rbReadyCover'))return;
    const el=document.createElement('div');
    el.id='rbReadyCover';
    el.innerHTML=`<div class="rb-ready-card"><div class="rb-ready-mark">RB</div><div id="rbReadyLabel" class="rb-ready-title">Loading RosterBate…</div><div id="rbReadySub" class="rb-ready-sub">Loading league data…</div><div class="rb-ready-track"><span id="rbReadyBar"></span></div></div>`;
    document.body.appendChild(el);
  }

  document.addEventListener('DOMContentLoaded',()=>{makeCover();tick()},{once:true});
  if(document.readyState!=='loading'){makeCover();tick()}
})();