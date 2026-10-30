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
  gate.style.cssText='position:fixed;inset:0;z-index:99999;background:#171d29;color:#f4f7fb;display:grid;place-items:center;font-family:Inter,system-ui,sans-serif';
  gate.innerHTML='<div style="text-align:center"><div style="font-weight:900;font-size:16px">RosterBate</div><div style="color:#8e9bb0;font-size:10px;margin-top:8px">Checking your account…</div></div>';
  (document.body||document.documentElement).appendChild(gate);

  function hideGate(){gate.remove()}
  function setActive(user){
    try{
      if(user){localStorage.setItem(ACTIVE,String(user.uid||''));localStorage.setItem(EMAIL,String(user.email||''))}
      else{localStorage.removeItem(ACTIVE);localStorage.removeItem(EMAIL)}
    }catch{}
  }
  function showAccount(user,username){
    const host=document.querySelector('.head-actions');
    if(host&&!document.getElementById('rbExistingAccountChip')){
      const chip=document.createElement('div');chip.id='rbExistingAccountChip';
      chip.style.cssText='display:flex;align-items:center;gap:7px;margin-left:6px';
      chip.innerHTML=`<span style="font-size:8px;color:#9aabc0;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${String(username||user.displayName||user.email||'RosterBate User').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span><button type="button" style="border:1px solid #40516b;background:#27354a;color:#dbe4f1;border-radius:6px;padding:6px 8px;font-size:8px;font-weight:900">Log out</button>`;
      host.appendChild(chip);
      chip.querySelector('button')?.addEventListener('click',async()=>{try{window.rbAccountStorage?.clearSecrets?.(String(user.uid||''));await firebase.auth().signOut()}finally{location.href='/index.html'}});
    }
  }
  function redirectToLogin(){
    gate.innerHTML='<div style="width:min(390px,calc(100% - 32px));background:#202a3a;border:1px solid #334258;border-radius:14px;padding:24px;text-align:center"><div style="font-weight:900;font-size:18px">Sign in to RosterBate</div><div style="color:#9aa8ba;font-size:10px;line-height:1.5;margin:10px 0 18px">Use the same RosterBate username and password you already use on the main website.</div><button id="rbGoLogin" style="border:1px solid #16c6c9;background:#0a8e93;color:#efffff;border-radius:8px;padding:10px 16px;font-size:10px;font-weight:900">Go to RosterBate Login</button></div>';
    document.getElementById('rbGoLogin')?.addEventListener('click',()=>{location.href='/index.html'});
  }

  window.rbAuthState={status:'loading',provider:'firebase',user:null};
  window.rbAuthReady=new Promise(resolve=>{
    try{
      if(!window.firebase){throw new Error('Firebase library unavailable')}
      if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
      const auth=firebase.auth();
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
      auth.onAuthStateChanged(async user=>{
        if(!user){setActive(null);window.rbAuthState={status:'ready',provider:'firebase',user:null};redirectToLogin();window.dispatchEvent(new CustomEvent('rb:auth-ready',{detail:window.rbAuthState}));resolve(null);return}
        setActive(user);
        window.rbAccountStorage?.setActiveUser?.(String(user.uid||''));
        let username='';
        try{
          const db=firebase.database();
          const snap=await db.ref('users/'+user.uid+'/username').once('value');
          username=String(snap.val()||'');
        }catch{}
        showAccount(user,username);
        window.rbAuthState={status:'ready',provider:'firebase',user:{uid:user.uid,email:user.email||'',displayName:username||user.displayName||''}};
        hideGate();
        window.dispatchEvent(new CustomEvent('rb:auth-ready',{detail:window.rbAuthState}));
        try{if(typeof updateConnect==='function')updateConnect()}catch{}
        try{if(typeof loadLockState==='function')await loadLockState()}catch{}
        try{if(typeof renderTeam==='function')renderTeam()}catch{}
        try{if(typeof renderActivity==='function')renderActivity()}catch{}
        resolve(user);
      });
    }catch(e){console.error('RosterBate Firebase auth failed',e);redirectToLogin();resolve(null)}
  });
})();