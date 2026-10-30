(()=>{
  const SESSION_KEY='rbSleeperToken';
  const PERSIST_KEY='rbSleeperTokenPersistent';
  const VERIFIED_KEY='rbSleeperLockSyncVerified';
  const LINKED_USERNAME='rbSleeperLinkedUsername';
  const LINKED_USER_ID='rbSleeperLinkedUserId';

  const validJwt=v=>/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(v||'').trim());
  function sessionToken(){try{return sessionStorage.getItem(SESSION_KEY)||sessionStorage.getItem('rbSleeperAuth')||''}catch{return''}}
  function persistentToken(){try{return localStorage.getItem(PERSIST_KEY)||''}catch{return''}}
  function linkedUsername(){try{return localStorage.getItem(LINKED_USERNAME)||''}catch{return''}}
  function linkedUserId(){try{return localStorage.getItem(LINKED_USER_ID)||''}catch{return''}}
  function isVerified(){try{return sessionStorage.getItem(VERIFIED_KEY)==='1'}catch{return false}}
  function setVerified(v){try{if(v)sessionStorage.setItem(VERIFIED_KEY,'1');else sessionStorage.removeItem(VERIFIED_KEY)}catch{}}
  function rememberToken(token){
    token=String(token||'').trim();
    try{
      if(token&&validJwt(token)){
        sessionStorage.setItem(SESSION_KEY,token);
        localStorage.setItem(PERSIST_KEY,token);
      }else{
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem('rbSleeperAuth');
        localStorage.removeItem(PERSIST_KEY);
        setVerified(false);
      }
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

  const initial=sessionToken()||persistentToken();
  if(initial&&!validJwt(initial))rememberToken('');
  else if(!sessionToken()&&validJwt(persistentToken())){try{sessionStorage.setItem(SESSION_KEY,persistentToken())}catch{}}
  else if(validJwt(sessionToken())&&!persistentToken())rememberToken(sessionToken());

  function rosterForSleeperUser(userId){
    userId=String(userId||'');
    let teams=[];
    try{teams=currentData?.teams||[]}catch{}
    return teams.find(t=>String(t.owner_id||'')===userId)||null;
  }

  async function verifyLockSync(token){
    token=String(token||'').trim();
    if(!validJwt(token))throw new Error('That is not a Sleeper session token. It looks like a password or another value. Nothing was saved.');
    let lg='',rid=0,wk=0;
    try{lg=String(leagueId||'');rid=Number(selectedRoster);wk=Number(selectedWeek)}catch{}
    if(!lg||!rid||!wk)throw new Error('RosterBate is still loading the league. Try again in a moment.');
    const r=await fetch('/.netlify/functions/sleeper-lock-state',{
      method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
      body:JSON.stringify({token,leagueId:lg,rosterId:rid,round:wk,leg:wk})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d?.ok){
      const msg=String(d?.error||d?.detail||`Sleeper rejected this session (${r.status}).`);
      throw new Error(msg);
    }
    return d;
  }

  function refreshConnectionUi(){
    const b=document.getElementById('connectBtn');
    if(!b)return;
    const privateConnected=validJwt(sessionToken())&&isVerified();
    const linked=!!linkedUserId();
    b.textContent=privateConnected?'Sleeper Connected':linked?'Sleeper Linked · Lock Sync Off':'Link Sleeper';
    b.classList.toggle('connected',privateConnected);
    b.title=privateConnected?'Private Sleeper Lock-In sync verified':linked?`Linked as ${linkedUsername()||'Sleeper user'}; private Lock-In sync is not verified on this domain`:'Link your Sleeper username';
  }

  async function selectLinkedRoster(userId){
    const roster=rosterForSleeperUser(userId);
    if(!roster)throw new Error('That Sleeper account does not own a roster in this league.');
    selectedRoster=Number(roster.roster_id);
    localStorage.setItem('rbSleeperRoster',String(selectedRoster));
    setVerified(false);
    try{if(typeof clearSelection==='function')clearSelection()}catch{}
    try{if(typeof render==='function')render();else if(typeof renderTeam==='function')renderTeam()}catch{}
    const token=sessionToken();
    if(validJwt(token)){
      try{await verifyLockSync(token);setVerified(true);if(typeof loadLockState==='function')await loadLockState()}catch{setVerified(false)}
    }
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
       <div style="margin-top:10px;color:#8fa0b6;font-size:9px;line-height:1.5">No Sleeper password is needed for public league data. Private lineup writes and authoritative Lock-In state require a separate verified Sleeper session connection.</div>
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
    const current=validJwt(sessionToken())?sessionToken():validJwt(persistentToken())?persistentToken():'';
    showModal('Advanced Sleeper Connection',
      `<p>This enables the private Sleeper state used for authoritative Lock-In totals and lineup writes on this browser/domain.</p>
       <label>Sleeper session token</label>
       <input id="tokenInput" type="password" autocomplete="off" value="${typeof esc==='function'?esc(current):''}" placeholder="JWT session token">
       <div class="warning">Do not enter your Sleeper password here. A valid session token has three long sections separated by periods. The token is verified before RosterBate saves it.</div>`,
      `<button data-close>Cancel</button><button id="saveTokenPersistent" class="primary">Verify & Enable Lock Sync</button>`
    );
    setTimeout(()=>{
      const btn=document.getElementById('saveTokenPersistent');
      btn?.addEventListener('click',async()=>{
        const input=document.getElementById('tokenInput');
        const v=String(input?.value||'').trim();
        document.querySelectorAll('.modal-body .error').forEach(x=>x.remove());
        const old=btn.textContent;btn.disabled=true;btn.textContent='Verifying…';
        try{
          const result=await verifyLockSync(v);
          rememberToken(v);setVerified(true);
          try{if(typeof closeModal==='function')closeModal()}catch{}
          try{if(typeof loadLockState==='function')await loadLockState()}catch{}
          try{if(typeof renderTeam==='function')renderTeam()}catch{}
          try{if(typeof renderActivity==='function')renderActivity()}catch{}
          try{if(typeof setStatus==='function')setStatus(`Sleeper Lock-In sync verified (${Number(result.lockCount||0)} locked players found).`,'success')}catch{}
        }catch(e){
          rememberToken('');setVerified(false);refreshConnectionUi();
          const error=document.createElement('div');error.className='error';error.style.marginTop='10px';error.textContent=String(e?.message||e);document.querySelector('.modal-body')?.appendChild(error);
        }finally{btn.disabled=false;btn.textContent=old;refreshConnectionUi()}
      });
    },0);
  }

  function showConnectionSettings(){
    if(typeof showModal!=='function')return;
    const linked=!!linkedUserId(),privateConnected=validJwt(sessionToken())&&isVerified();
    const linkedText=linked?`<p><strong>Linked Sleeper:</strong> ${typeof esc==='function'?esc(linkedUsername()||linkedUserId()):linkedUsername()}</p>`:'<p>No Sleeper username is linked yet.</p>';
    const privateText=privateConnected?'<p style="color:#75e7bf"><strong>Lock-In sync:</strong> verified and active on this device/domain.</p>':'<p style="color:#f0b84b"><strong>Lock-In sync:</strong> OFF or unverified. Public roster data works, but authoritative locked points and private lineup writes do not.</p>';
    showModal('Sleeper Connection Settings',linkedText+privateText,
      `<button data-close>Close</button><button id="changeSleeperLink">${linked?'Change Linked Account':'Link Sleeper'}</button>${linked?'<button id="unlinkSleeper">Unlink</button>':''}${privateConnected?'<button id="forgetSleeper" class="danger">Forget Lock Sync</button>':'<button id="enableLockSync" class="primary">Enable Lock Sync</button>'}`
    );
    setTimeout(()=>{
      document.getElementById('changeSleeperLink')?.addEventListener('click',()=>{try{closeModal()}catch{};showPublicLink()});
      document.getElementById('unlinkSleeper')?.addEventListener('click',()=>{clearLink();try{closeModal()}catch{};refreshConnectionUi();try{if(typeof setStatus==='function')setStatus('Sleeper username unlinked.','success')}catch{}});
      document.getElementById('enableLockSync')?.addEventListener('click',()=>{try{closeModal()}catch{};showAdvancedConnect()});
      document.getElementById('forgetSleeper')?.addEventListener('click',()=>{rememberToken('');setVerified(false);try{lockedGames={}}catch{};try{closeModal()}catch{};refreshConnectionUi();try{if(typeof renderTeam==='function')renderTeam()}catch{};try{if(typeof setStatus==='function')setStatus('Sleeper Lock-In sync forgotten on this device.','success')}catch{}});
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
  if(validJwt(sessionToken())){
    Promise.resolve(verifyLockSync(sessionToken())).then(async()=>{
      setVerified(true);
      try{if(typeof loadLockState==='function')await loadLockState()}catch{}
      try{if(typeof renderTeam==='function')renderTeam()}catch{}
      refreshConnectionUi();
    }).catch(()=>{rememberToken('');setVerified(false);refreshConnectionUi()});
  }

  let last=sessionToken();
  setInterval(()=>{
    const now=sessionToken();
    if(now&&!validJwt(now)){rememberToken('');last=''}
    else if(now&&now!==last){last=now;setVerified(false)}
    if(!now&&last&&!persistentToken())last='';
    refreshConnectionUi();
  },1000);

  window.rbSleeperLink={show:showPublicLink,advanced:showAdvancedConnect,settings:showConnectionSettings,linkedUsername,linkedUserId,linkByUsername,verifyLockSync};
})();