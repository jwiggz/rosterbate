(()=>{
  const firebaseConfig={
    apiKey:'AIzaSyAs8NPmI_BF9ggyWHZz-lUojGQPJ6gdazQ',
    authDomain:'rosterbate-51339.firebaseapp.com',
    databaseURL:'https://rosterbate-51339-default-rtdb.firebaseio.com',
    projectId:'rosterbate-51339',
    storageBucket:'rosterbate-51339.firebasestorage.app',
    messagingSenderId:'951275364572',
    appId:'1:951275364572:web:758d1b4d970b7b87c05419',
    measurementId:'G-DNSFKMKYVC'
  };
  const ACTIVE='rbActiveFirebaseUid';
  const EMAIL='rbActiveFirebaseEmail';
  const gate=document.createElement('div');
  gate.id='rbFirebaseGate';
  gate.style.cssText='position:fixed;inset:0;z-index:99999;background:#171d29;color:#f4f7fb;display:grid;place-items:center;font-family:Inter,system-ui,sans-serif;padding:20px';
  gate.innerHTML='<div style="text-align:center"><div style="font-weight:900;font-size:16px">RosterBate</div><div style="color:#8e9bb0;font-size:10px;margin-top:8px">Checking your account…</div></div>';
  (document.body||document.documentElement).appendChild(gate);

  let auth=null,db=null;
  function hideGate(){gate.remove()}
  function setActive(user){
    try{
      if(user){localStorage.setItem(ACTIVE,String(user.uid||''));localStorage.setItem(EMAIL,String(user.email||''))}
      else{localStorage.removeItem(ACTIVE);localStorage.removeItem(EMAIL)}
    }catch{}
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function normalizeUsername(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,20)}
  function usernameLookupKey(value){return encodeURIComponent(normalizeUsername(value).toLowerCase())}
  async function resolveLoginEmail(identifier){
    const value=String(identifier||'').trim();
    if(!value)throw new Error('Email or username is required.');
    if(value.includes('@'))return value;
    const key=usernameLookupKey(value);
    if(!key)throw new Error('Email or username is required.');
    const snap=await db.ref('usernames/'+key).once('value');
    const record=snap.val();
    if(record?.email)return String(record.email).trim();
    throw new Error('No account found for that username.');
  }
  function friendlyAuthError(e){
    const code=String(e?.code||'');
    if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return 'Incorrect username/email or password.';
    if(code.includes('too-many-requests'))return 'Too many login attempts. Try again shortly.';
    if(code.includes('network-request-failed'))return 'Network error while signing in.';
    return String(e?.message||e||'Unable to sign in.').replace(/^Firebase:\s*/,'');
  }
  function showAccount(user,username){
    const host=document.querySelector('.head-actions');
    if(host&&!document.getElementById('rbExistingAccountChip')){
      const chip=document.createElement('div');chip.id='rbExistingAccountChip';
      chip.style.cssText='display:flex;align-items:center;gap:7px;margin-left:6px';
      chip.innerHTML=`<span style="font-size:8px;color:#9aabc0;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(username||user.displayName||user.email||'RosterBate User')}</span><button type="button" style="border:1px solid #40516b;background:#27354a;color:#dbe4f1;border-radius:6px;padding:6px 8px;font-size:8px;font-weight:900">Log out</button>`;
      host.appendChild(chip);
      chip.querySelector('button')?.addEventListener('click',async()=>{try{window.rbAccountStorage?.clearSecrets?.(String(user.uid||''));await auth.signOut()}finally{location.href='/index.html'}});
    }
  }
  function showLogin(){
    gate.innerHTML=`<form id="rbInlineLogin" style="width:min(410px,calc(100% - 24px));background:#202a3a;border:1px solid #334258;border-radius:14px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.35)" autocomplete="on">
      <div style="font-weight:900;font-size:19px;text-align:center">Sign in to RosterBate</div>
      <div style="color:#9aa8ba;font-size:10px;line-height:1.55;margin:9px 0 18px;text-align:center">Use the same existing RosterBate username/email and password. This signs you into this preview domain.</div>
      <label style="display:block;color:#dbe5f2;font-size:9px;font-weight:900;margin:0 0 6px">USERNAME OR EMAIL</label>
      <input id="rbLoginIdentifier" autocomplete="username" style="width:100%;border:1px solid #40516b;background:#151e2b;color:#fff;border-radius:8px;padding:11px 12px;font-size:11px;outline:none" placeholder="Username or email">
      <label style="display:block;color:#dbe5f2;font-size:9px;font-weight:900;margin:12px 0 6px">PASSWORD</label>
      <input id="rbLoginPassword" type="password" autocomplete="current-password" style="width:100%;border:1px solid #40516b;background:#151e2b;color:#fff;border-radius:8px;padding:11px 12px;font-size:11px;outline:none" placeholder="Password">
      <div id="rbLoginError" style="min-height:18px;color:#ff9bae;font-size:9px;margin-top:9px"></div>
      <button id="rbLoginSubmit" type="submit" style="width:100%;border:1px solid #16c6c9;background:#0a8e93;color:#efffff;border-radius:8px;padding:11px 16px;font-size:10px;font-weight:900">Sign In</button>
      <div style="text-align:center;margin-top:12px"><a href="/index.html" style="color:#93a3b8;font-size:9px;text-decoration:none">Back to main RosterBate site</a></div>
    </form>`;
    const form=document.getElementById('rbInlineLogin'),identifier=document.getElementById('rbLoginIdentifier'),password=document.getElementById('rbLoginPassword'),submit=document.getElementById('rbLoginSubmit'),error=document.getElementById('rbLoginError');
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      if(submit.disabled)return;
      error.textContent='';submit.disabled=true;submit.textContent='Signing In…';
      try{
        const email=await resolveLoginEmail(identifier.value);
        await auth.signInWithEmailAndPassword(email,password.value);
      }catch(err){error.textContent=friendlyAuthError(err);submit.disabled=false;submit.textContent='Sign In'}
    });
    setTimeout(()=>identifier?.focus(),0);
  }

  window.rbAuthState={status:'loading',provider:'firebase',user:null};
  window.rbAuthReady=new Promise(resolve=>{
    let settled=false;
    const finish=v=>{if(!settled){settled=true;resolve(v)}};
    try{
      if(!window.firebase)throw new Error('Firebase library unavailable');
      if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
      auth=firebase.auth();db=firebase.database();
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
      auth.onAuthStateChanged(async user=>{
        if(!user){
          setActive(null);
          window.rbAuthState={status:'ready',provider:'firebase',user:null};
          showLogin();
          window.dispatchEvent(new CustomEvent('rb:auth-ready',{detail:window.rbAuthState}));
          finish(null);
          return;
        }
        setActive(user);
        window.rbAccountStorage?.setActiveUser?.(String(user.uid||''));
        let username='';
        try{const snap=await db.ref('users/'+user.uid+'/username').once('value');username=String(snap.val()||'')}catch{}
        showAccount(user,username);
        window.rbAuthState={status:'ready',provider:'firebase',user:{uid:user.uid,email:user.email||'',displayName:username||user.displayName||''}};
        hideGate();
        window.dispatchEvent(new CustomEvent('rb:auth-ready',{detail:window.rbAuthState}));
        try{if(typeof updateConnect==='function')updateConnect()}catch{}
        try{if(typeof loadLockState==='function')await loadLockState()}catch{}
        try{if(typeof renderTeam==='function')renderTeam()}catch{}
        try{if(typeof renderActivity==='function')renderActivity()}catch{}
        finish(user);
      });
    }catch(e){console.error('RosterBate Firebase auth failed',e);showLogin();finish(null)}
  });
})();