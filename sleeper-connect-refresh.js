(()=>{
  const SESSION_KEY='rbSleeperToken';
  const PERSIST_KEY='rbSleeperTokenPersistent';
  const LINKED_USERNAME='rbSleeperLinkedUsername';
  const LINKED_USER_ID='rbSleeperLinkedUserId';

  function sessionToken(){try{return sessionStorage.getItem(SESSION_KEY)||sessionStorage.getItem('rbSleeperAuth')||''}catch{return''}}
  function persistentToken(){try{return localStorage.getItem(PERSIST_KEY)||''}catch{return''}}
  function linkedUsername(){try{return localStorage.getItem(LINKED_USERNAME)||''}catch{return''}}
  function linkedUserId(){try{return localStorage.getItem(LINKED_USER_ID)||''}catch{return''}}
  function rememberToken(token){
    try{
      if(token){sessionStorage.setItem(SESSION_KEY,token);localStorage.setItem(PERSIST_KEY,token)}
      else{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem('rbSleeperAuth');localStorage.removeItem(PERSIST_KEY)}
    }catch{}
  }
  function rememberLink(user,rosterId){
    try{
      localStorage.setItem(LINKED_USERNAME,String(user?.username||user?.display_name||''));
      localStorage.setItem(LINKED_USER_ID,String(user?.user_id||''));
      if(rosterId!=null)localStorage.setItem('rbSleeperRoster',String(rosterId));
    }catch{}
  }
  function clearLink(){try{localStorage.removeItem(LINKED_USERNAME);localStorage.removeItem(LINKED_USER_ID)}catch{}}

  if(!sessionToken()){
    const saved=persistentToken();
    if(saved){try{sessionStorage.setItem(SESSION_KEY,saved)}catch{}}
  }else if(!persistentToken())rememberToken(sessionToken());

  function rosterForSleeperUser(userId){
    userId=String(userId||'');
    let teams=[];
    try{teams=currentData?.teams||[]}catch{}
    return teams.find(t=>String(t.owner_id||'')===userId)||null;
  }

  function refreshConnectionUi(){
    const b=document.getElementById('connectBtn');
    if(!b)return;
    const privateConnected=!!sessionToken();
    const linked=!!linkedUserId();
    b.textContent=privateConnected?'Sleeper Connected':linked?'Sleeper Linked':'Link Sleeper';
    b.classList.toggle('connected',privateConnected||linked);
    b.title=privateConnected?'Private Sleeper session connected':linked?`Linked as ${linkedUsername()||'Sleeper user'}`:'Link your Sleeper username';
  }

  async function selectLinkedRoster(userId){
    const roster=rosterForSleeperUser(userId);
    if(!roster)throw new Error('That Sleeper account does not own a roster in this league.');
    selectedRoster=Number(roster.roster_id);
    localStorage.setItem('rbSleeperRoster',String(selectedRoster));
    try{if(typeof clearSelection==='function')clearSelection()}catch{}
    try{if(typeof loadLockState==='function')await loadLockState()}catch{}
    try{if(typeof render==='function')render();else if(typeof renderTeam==='function')renderTeam()}catch{}
    refreshConnectionUi();
    return roster;
  }

  async function linkByUsername(username){
    username=String(username||'').trim();
    if(!username)throw new Error('Enter your Sleeper username.');
    const r=await fetch(`/.netlify/functions/sleeper-user?username=${encodeURIComponent(username)}`,{cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data?.ok)throw new Error(data?.error||'Unable to find that Sleeper username.');
    const roster=rosterForSleeperUser(data.user.user_id);
    if(!roster)throw new Error(`${data.user.display_name||data.user.username} does not own a roster in this league.`);
    rememberLink(data.user,roster.roster_id);
    await selectLinkedRoster(data.user.user_id);
    return {user:data.user,roster};
  }

  function showPublicLink(){
    if(typeof showModal!=='function')return;
    const current=linkedUsername();
    showModal('Link Sleeper Account',
      `<p>Enter your <strong>Sleeper username</strong>. RosterBate will find your Sleeper account and automatically open your roster in this league.</p>
       <label>Sleeper username</label>
       <input id="rbSleeperUsername" autocomplete="username" value="${typeof esc==='function'?esc(current):''}" placeholder="ArmandoMsports">
       <div style="margin-top:10px;color:#8fa0b6;font-size:9px;line-height:1.5">No Sleeper password or session code is needed for public league data. Private lineup writes and Lock-In syncing require an authorized Sleeper connection.</div>
       <button id="rbAdvancedSleeper" type="button" style="margin-top:12px;border:0;background:transparent;color:#8394ac;font-size:8px;text-decoration:underline;padding:0">Advanced / admin connection</button>`,
      `<button data-close>Cancel</button><button id="rbLinkSleeper" class="primary">Link My Sleeper</button>`
    );
    setTimeout(()=>{
      const input=document.getElementById('rbSleeperUsername'),btn=document.getElementById('rbLinkSleeper');
      btn?.addEventListener('click',async()=>{
        const old=btn.textContent;btn.disabled=true;btn.textContent='Finding roster…';
        document.querySelectorAll('.modal-body .error').forEach(x=>x.remove());
        try{
          const result=await linkByUsername(input?.value);
          try{if(typeof closeModal==='function')closeModal()}catch{}
          refreshConnectionUi();
          try{if(typeof setStatus==='function')setStatus(`Sleeper linked: ${result.user.display_name||result.user.username}. Showing your roster.`,'success')}catch{}
        }catch(e){
          const error=document.createElement('div');error.className='error';error.style.marginTop='10px';error.textContent=String(e?.message||e);document.querySelector('.modal-body')?.appendChild(error);
        }finally{btn.disabled=false;btn.textContent=old}
      });
      input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();btn?.click()}});
      document.getElementById('rbAdvancedSleeper')?.addEventListener('click',()=>{try{closeModal()}catch{};showAdvancedConnect()});
      input?.focus();
    },0);
  }

  function showAdvancedConnect(){
    if(typeof showModal!=='function')return;
    const current=sessionToken()||persistentToken();
    showModal('Advanced Sleeper Connection',
      `<p>This is an advanced development/admin connection for RosterBate's private Sleeper write features.</p>
       <label>Sleeper session credential</label>
       <input id="tokenInput" type="password" autocomplete="off" value="${typeof esc==='function'?esc(current):''}" placeholder="Session credential">
       <div class="warning">A Sleeper session credential is sensitive. Only use your own credential, never share it with another person, and never paste it into chat.</div>`,
      `<button data-close>Cancel</button><button id="saveTokenPersistent" class="primary">Remember On This Device</button>`
    );
    setTimeout(()=>{
      document.getElementById('saveTokenPersistent')?.addEventListener('click',async()=>{
        const v=String(document.getElementById('tokenInput')?.value||'').trim();
        rememberToken(v);
        try{if(typeof closeModal==='function')closeModal()}catch{}
        refreshConnectionUi();
        if(v){
          try{if(typeof loadLockState==='function')await loadLockState()}catch{}
          try{if(typeof renderTeam==='function')renderTeam()}catch{}
          try{if(typeof renderActivity==='function')renderActivity()}catch{}
          try{if(typeof setStatus==='function')setStatus('Advanced Sleeper connection enabled on this device.','success')}catch{}
        }else{
          try{lockedGames={}}catch{}
          try{if(typeof renderTeam==='function')renderTeam()}catch{}
        }
        refreshConnectionUi();
      });
    },0);
  }

  function showConnectionSettings(){
    if(typeof showModal!=='function')return;
    const linked=!!linkedUserId(),privateConnected=!!sessionToken();
    const linkedText=linked?`<p><strong>Linked Sleeper:</strong> ${typeof esc==='function'?esc(linkedUsername()||linkedUserId()):linkedUsername()}</p>`:'<p>No Sleeper username is linked yet.</p>';
    const privateText=privateConnected?'<p style="color:#75e7bf"><strong>Advanced write connection:</strong> active on this device.</p>':'<p style="color:#93a3b8">Advanced write connection is not active.</p>';
    showModal('Sleeper Connection Settings',linkedText+privateText,
      `<button data-close>Close</button><button id="changeSleeperLink" class="primary">${linked?'Change Linked Account':'Link Sleeper'}</button>${linked?'<button id="unlinkSleeper">Unlink</button>':''}${privateConnected?'<button id="forgetSleeper" class="danger">Forget Advanced Connection</button>':''}`
    );
    setTimeout(()=>{
      document.getElementById('changeSleeperLink')?.addEventListener('click',()=>{try{closeModal()}catch{};showPublicLink()});
      document.getElementById('unlinkSleeper')?.addEventListener('click',()=>{clearLink();try{closeModal()}catch{};refreshConnectionUi();try{if(typeof setStatus==='function')setStatus('Sleeper username unlinked.','success')}catch{}});
      document.getElementById('forgetSleeper')?.addEventListener('click',()=>{rememberToken('');try{lockedGames={}}catch{};try{closeModal()}catch{};refreshConnectionUi();try{if(typeof renderTeam==='function')renderTeam()}catch{};try{if(typeof setStatus==='function')setStatus('Advanced Sleeper connection forgotten on this device.','success')}catch{}});
    },0);
  }

  const connect=document.getElementById('connectBtn');
  if(connect){const replacement=connect.cloneNode(true);connect.replaceWith(replacement);replacement.addEventListener('click',showPublicLink)}
  const gear=document.querySelector('.head-actions .gear');
  if(gear){gear.title='Sleeper connection settings';gear.setAttribute('aria-label','Sleeper connection settings');gear.addEventListener('click',showConnectionSettings)}

  refreshConnectionUi();
  if(linkedUserId()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(rosterForSleeperUser(linkedUserId())){clearInterval(timer);selectLinkedRoster(linkedUserId()).catch(()=>{})}
      else if(attempts>=60)clearInterval(timer);
    },100);
  }
  if(sessionToken()){
    try{if(typeof loadLockState==='function')Promise.resolve(loadLockState()).then(()=>{try{renderTeam()}catch{};refreshConnectionUi()})}catch{}
  }

  let last=sessionToken();
  setInterval(()=>{
    const now=sessionToken();
    if(now&&now!==last){rememberToken(now);last=now}
    if(!now&&last&&!persistentToken())last='';
    refreshConnectionUi();
  },1000);

  window.rbSleeperLink={show:showPublicLink,advanced:showAdvancedConnect,linkedUsername,linkedUserId,linkByUsername};
})();
