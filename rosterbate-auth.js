(()=>{
  const ACTIVE='rbActiveIdentityUser';
  const EMAIL='rbActiveIdentityEmail';
  window.rbAuthState={status:'loading',enabled:null,user:null};

  const css=`
#rbAuthGate{position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 30% 20%,#21344b 0,#171d29 42%,#111722 100%);display:grid;place-items:center;padding:24px;font-family:Inter,system-ui,sans-serif;color:#f4f7fb}
#rbAuthGate.hidden{display:none!important}.rb-auth-card{width:min(430px,100%);background:#202a3a;border:1px solid #394a61;border-radius:16px;box-shadow:0 32px 90px rgba(0,0,0,.5);overflow:hidden}.rb-auth-head{padding:22px 22px 15px;border-bottom:1px solid #334258}.rb-auth-brand{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:900}.rb-auth-brand img{width:34px;height:34px;object-fit:contain}.rb-auth-sub{color:#94a3b8;font-size:11px;line-height:1.5;margin-top:7px}.rb-auth-body{padding:20px 22px}.rb-auth-tabs{display:flex;gap:8px;margin-bottom:16px}.rb-auth-tab{flex:1;border:1px solid #3d4d64;background:#273246;color:#aebbd0;padding:9px;border-radius:7px;font-size:10px;font-weight:900}.rb-auth-tab.active{background:#0a8e93;border-color:#12bdc2;color:#efffff}.rb-auth-label{display:block;font-size:9px;font-weight:900;color:#dce6f3;margin:11px 0 5px}.rb-auth-input{width:100%;background:#151e2b;border:1px solid #3d4d64;color:#fff;border-radius:8px;padding:11px;font-size:11px;outline:none}.rb-auth-input:focus{border-color:#08c7c9;box-shadow:0 0 0 2px rgba(8,199,201,.12)}.rb-auth-primary{width:100%;margin-top:15px;border:1px solid #18c9cc;background:#0a8e93;color:#efffff;border-radius:8px;padding:11px;font-size:10px;font-weight:950}.rb-auth-status{min-height:18px;margin-top:10px;font-size:9px;color:#9eabc0;line-height:1.4}.rb-auth-status.error{color:#ffacbb;background:transparent;border:0;padding:0}.rb-auth-status.success{color:#83eec9;background:transparent;border:0;padding:0}.rb-auth-note{font-size:8px;color:#77869c;margin-top:13px;line-height:1.45}.rb-account-chip{display:flex;align-items:center;gap:7px;margin-left:6px}.rb-account-email{font-size:8px;color:#9aabc0;max-width:135px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rb-account-logout{border:1px solid #40516b;background:#27354a;color:#dbe4f1;border-radius:6px;padding:6px 8px;font-size:8px;font-weight:900}
`;
  function addStyle(){if(document.getElementById('rbAuthStyle'))return;const s=document.createElement('style');s.id='rbAuthStyle';s.textContent=css;document.head.appendChild(s)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function gate(){
    let g=document.getElementById('rbAuthGate');if(g)return g;
    g=document.createElement('div');g.id='rbAuthGate';
    g.innerHTML=`<div class="rb-auth-card"><div class="rb-auth-head"><div class="rb-auth-brand"><img src="/rosterbate-main-logo-transparent-v3.png" alt="RosterBate"><span>RosterBate</span></div><div class="rb-auth-sub">Sign in to use your fantasy basketball dashboard. Your RosterBate account and Sleeper connection stay separate.</div></div><div class="rb-auth-body"><div class="rb-auth-tabs"><button type="button" class="rb-auth-tab active" data-mode="login">Log In</button><button type="button" class="rb-auth-tab" data-mode="signup">Create Account</button></div><div id="rbAuthNameWrap" style="display:none"><label class="rb-auth-label">Display name</label><input id="rbAuthName" class="rb-auth-input" autocomplete="name"></div><label class="rb-auth-label">Email</label><input id="rbAuthEmail" class="rb-auth-input" type="email" autocomplete="email"><label class="rb-auth-label">Password</label><input id="rbAuthPassword" class="rb-auth-input" type="password" autocomplete="current-password"><button id="rbAuthSubmit" type="button" class="rb-auth-primary">Log In</button><div id="rbAuthStatus" class="rb-auth-status"></div><div class="rb-auth-note">Sleeper credentials remain private to this browser. RosterBate never asks you to share a Sleeper token with another user.</div></div></div>`;
    document.body.appendChild(g);return g;
  }
  function status(msg,type=''){const el=document.getElementById('rbAuthStatus');if(!el)return;el.className=`rb-auth-status ${type}`.trim();el.textContent=msg||''}
  function setMode(mode){
    const signup=mode==='signup';
    document.querySelectorAll('.rb-auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const wrap=document.getElementById('rbAuthNameWrap');if(wrap)wrap.style.display=signup?'block':'none';
    const pass=document.getElementById('rbAuthPassword');if(pass)pass.autocomplete=signup?'new-password':'current-password';
    const submit=document.getElementById('rbAuthSubmit');if(submit){submit.dataset.mode=mode;submit.textContent=signup?'Create Account':'Log In'}
    status('');
  }
  function activeId(){try{return localStorage.getItem(ACTIVE)||''}catch{return''}}
  function setActive(user){try{localStorage.setItem(ACTIVE,String(user?.id||''));localStorage.setItem(EMAIL,String(user?.email||''))}catch{}}
  function clearActive(){try{localStorage.removeItem(ACTIVE);localStorage.removeItem(EMAIL)}catch{}}
  function metadata(user){return user?.userMetadata||user?.user_metadata||{}}
  function renderAccount(user,identity){
    const host=document.querySelector('.head-actions');if(!host||document.getElementById('rbAccountChip'))return;
    const chip=document.createElement('div');chip.id='rbAccountChip';chip.className='rb-account-chip';chip.innerHTML=`<span class="rb-account-email" title="${esc(user.email||'')}">${esc(user.email||'Account')}</span><button type="button" class="rb-account-logout">Log out</button>`;
    host.appendChild(chip);
    chip.querySelector('button')?.addEventListener('click',async()=>{
      try{chip.querySelector('button').disabled=true;window.rbAccountStorage?.clearSecrets?.(String(user.id||activeId()));await identity.logout()}catch(e){}finally{clearActive();location.reload()}
    });
    const box=document.querySelector('.userbox');if(box){
      const meta=metadata(user);const display=meta.full_name||meta.fullName||user.email||'RosterBate User';
      const initials=String(display).trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
      box.innerHTML=`<div class="avatar">${esc(initials||'RB')}</div><div><div>${esc(display)}</div><div style="font-size:8px;color:#78879b;margin-top:2px">Signed in</div></div>`;
    }
  }
  function ready(enabled,user=null){window.rbAuthState={status:'ready',enabled,user};window.dispatchEvent(new CustomEvent('rb:auth-ready',{detail:window.rbAuthState}));try{if(typeof renderTeam==='function')renderTeam()}catch{}}
  function failOpen(err){
    window.rbAuthState={status:'ready',enabled:false,user:null,error:String(err?.message||err||'Identity unavailable')};
    document.getElementById('rbAuthGate')?.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('rb:auth-ready',{detail:window.rbAuthState}));
    console.warn('RosterBate Identity is not enabled yet:',err);
  }

  addStyle();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',gate,{once:true});else gate();

  window.rbAuthReady=(async()=>{
    try{
      const identity=await import('https://esm.sh/@netlify/identity@2.0.0');
      try{await identity.handleAuthCallback()}catch{}
      const user=await identity.getUser();
      const g=gate();
      g.querySelectorAll('.rb-auth-tab').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
      const submit=document.getElementById('rbAuthSubmit');
      submit?.addEventListener('click',async()=>{
        const mode=submit.dataset.mode||'login';
        const email=String(document.getElementById('rbAuthEmail')?.value||'').trim();
        const password=String(document.getElementById('rbAuthPassword')?.value||'');
        const name=String(document.getElementById('rbAuthName')?.value||'').trim();
        if(!email||!password){status('Enter your email and password.','error');return}
        submit.disabled=true;status(mode==='signup'?'Creating account…':'Signing in…');
        try{
          if(mode==='signup'){
            const created=await identity.signup(email,password,name?{full_name:name}:undefined);
            if(created?.confirmedAt||created?.confirmed_at){setActive(created);location.reload();return}
            status('Account created. Check your email for the confirmation link, then return here to sign in.','success');
          }else{
            const logged=await identity.login(email,password);setActive(logged);location.reload();return;
          }
        }catch(e){status(e?.message||String(e),'error')}finally{submit.disabled=false}
      });
      document.getElementById('rbAuthPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')submit?.click()});

      if(user){
        const prior=activeId();setActive(user);
        if(prior&&prior!==String(user.id)){location.reload();return user}
        g.classList.add('hidden');renderAccount(user,identity);ready(true,user);return user;
      }
      if(activeId()){window.rbAccountStorage?.clearSecrets?.(activeId());clearActive()}
      setMode('login');ready(true,null);return null;
    }catch(e){failOpen(e);return null}
  })();
})();
