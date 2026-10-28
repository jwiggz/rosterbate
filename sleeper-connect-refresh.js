(()=>{
  const SESSION_KEY='rbSleeperToken';
  const PERSIST_KEY='rbSleeperTokenPersistent';

  function sessionToken(){
    try{return sessionStorage.getItem(SESSION_KEY)||sessionStorage.getItem('rbSleeperAuth')||''}catch{return''}
  }
  function persistentToken(){
    try{return localStorage.getItem(PERSIST_KEY)||''}catch{return''}
  }
  function remember(token){
    try{
      if(token){
        sessionStorage.setItem(SESSION_KEY,token);
        localStorage.setItem(PERSIST_KEY,token);
      }else{
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem('rbSleeperAuth');
        localStorage.removeItem(PERSIST_KEY);
      }
    }catch{}
  }

  // Restore the remembered device connection immediately. This script is injected
  // while the base league request is still in flight, so loadLockState() sees the
  // token before the first completed roster render in normal conditions.
  if(!sessionToken()){
    const saved=persistentToken();
    if(saved){
      try{sessionStorage.setItem(SESSION_KEY,saved)}catch{}
    }
  }else if(!persistentToken()){
    // Migrate an existing tab-only connection to remembered-on-this-device.
    remember(sessionToken());
  }

  function refreshConnectionUi(){
    try{if(typeof updateConnect==='function')updateConnect()}catch{}
  }

  function applyAuthenticatedState(){
    refreshConnectionUi();
    try{
      if(typeof loadLockState==='function'){
        Promise.resolve(loadLockState()).then(()=>{
          try{if(typeof renderTeam==='function')renderTeam()}catch{}
          try{if(typeof renderActivity==='function')renderActivity()}catch{}
        });
      }
    }catch{}
  }

  function showPersistentConnect(){
    if(typeof showModal!=='function')return;
    const current=sessionToken()||persistentToken();
    showModal(
      'Connect Sleeper',
      `<p>Paste the Authorization value from your logged-in Sleeper browser. RosterBate will remember it on this browser so you do not need to reconnect every visit.</p><label>Sleeper token</label><input id="tokenInput" type="password" autocomplete="off" value="${typeof esc==='function'?esc(current):''}" placeholder="eyJ... or Bearer eyJ..."><div class="warning">This is a Sleeper session credential. It is stored only in this browser's local storage, not in the RosterBate database. Do not paste it into chat or share it.</div>`,
      `<button data-close>Cancel</button><button id="saveTokenPersistent" class="primary">Remember On This Device</button>`
    );
    setTimeout(()=>{
      document.getElementById('saveTokenPersistent')?.addEventListener('click',async()=>{
        const v=String(document.getElementById('tokenInput')?.value||'').trim();
        remember(v);
        try{if(typeof closeModal==='function')closeModal()}catch{}
        refreshConnectionUi();
        if(v){
          try{if(typeof loadLockState==='function')await loadLockState()}catch{}
          try{if(typeof renderTeam==='function')renderTeam()}catch{}
          try{if(typeof renderActivity==='function')renderActivity()}catch{}
          try{if(typeof setStatus==='function')setStatus('Sleeper connected and remembered on this device.','success')}catch{}
        }else{
          try{lockedGames={}}catch{}
          try{if(typeof renderTeam==='function')renderTeam()}catch{}
          try{if(typeof setStatus==='function')setStatus('Sleeper connection cleared.','success')}catch{}
        }
      });
    },0);
  }

  function showConnectionSettings(){
    if(typeof showModal!=='function')return;
    const connected=!!(sessionToken()||persistentToken());
    const body=connected
      ? `<p><strong>Sleeper is connected on this device.</strong></p><p>Your saved session credential is restored automatically when you open this league.</p><div class="warning">Use Forget This Device if this is a shared computer or if you want to replace the Sleeper connection.</div>`
      : `<p>No Sleeper account is currently connected on this device.</p>`;
    const actions=connected
      ? `<button data-close>Close</button><button id="reconnectSleeper">Replace Connection</button><button id="forgetSleeper" class="danger">Forget This Device</button>`
      : `<button data-close>Close</button><button id="settingsConnectSleeper" class="primary">Connect Sleeper</button>`;
    showModal('Sleeper Connection Settings',body,actions);
    setTimeout(()=>{
      document.getElementById('settingsConnectSleeper')?.addEventListener('click',()=>{try{closeModal()}catch{};showPersistentConnect()});
      document.getElementById('reconnectSleeper')?.addEventListener('click',()=>{try{closeModal()}catch{};showPersistentConnect()});
      document.getElementById('forgetSleeper')?.addEventListener('click',()=>{
        remember('');
        try{lockedGames={}}catch{}
        try{sessionStorage.removeItem('rbSleeperConnectedReload')}catch{}
        try{if(typeof closeModal==='function')closeModal()}catch{}
        refreshConnectionUi();
        try{if(typeof renderTeam==='function')renderTeam()}catch{}
        try{if(typeof renderActivity==='function')renderActivity()}catch{}
        try{if(typeof setStatus==='function')setStatus('Sleeper connection forgotten on this device.','success')}catch{}
      });
    },0);
  }

  // Replace the original button node so its old tab-only click listener is removed.
  const connect=document.getElementById('connectBtn');
  if(connect){
    const replacement=connect.cloneNode(true);
    connect.replaceWith(replacement);
    replacement.addEventListener('click',showPersistentConnect);
  }

  const gear=document.querySelector('.head-actions .gear');
  if(gear){
    gear.title='Sleeper connection settings';
    gear.setAttribute('aria-label','Sleeper connection settings');
    gear.addEventListener('click',showConnectionSettings);
  }

  refreshConnectionUi();
  if(sessionToken())applyAuthenticatedState();

  // If the old Connect modal is still used anywhere else, detect a newly saved
  // session token and migrate it into persistent device storage automatically.
  let last=sessionToken();
  setInterval(()=>{
    const now=sessionToken();
    if(now&&now!==last){remember(now);last=now;refreshConnectionUi()}
    if(!now&&last&&!persistentToken())last='';
  },250);
})();
