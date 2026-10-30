(()=>{
  const css=`
  .rb-lock-guide{font-size:11px;line-height:1.55;color:#c8d4e3}
  .rb-lock-guide .card{border:1px solid #34465e;background:#182437;border-radius:10px;padding:14px;margin:8px 0}
  .rb-lock-guide h3{margin:0 0 8px;color:#fff;font-size:14px}
  .rb-lock-guide p{margin:7px 0}
  .rb-lock-guide .warn{border:1px solid rgba(243,199,91,.35);background:rgba(91,70,24,.24);border-radius:8px;padding:10px;color:#f4d27a}
  .rb-lock-guide .muted{font-size:9px;color:#8da0b8}
  .rb-lock-guide .choice{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
  .rb-lock-guide .choice button{border-radius:8px;padding:10px 12px;font-size:9px;font-weight:900;cursor:pointer}
  .rb-lock-guide .continue{border:1px solid #15c8cd;background:#09aeb2;color:#062e30}
  .rb-lock-guide .public{border:1px solid #3a4b63;background:#1a2639;color:#c9d6e7}
  @media(max-width:640px){.rb-lock-guide .choice{grid-template-columns:1fr}}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  function close(){try{if(typeof closeModal==='function')closeModal()}catch{}}
  function originalAdvanced(){
    const fn=window.rbSleeperLink?.__rawAdvanced;
    if(typeof fn==='function')return fn();
    const current=window.rbSleeperLink?.advanced;
    if(typeof current==='function'&&current!==showGuide)return current();
  }

  function showGuide(){
    if(typeof showModal!=='function')return;
    showModal('Enable Lock Sync',
      `<div class="rb-lock-guide">
        <div class="card">
          <h3>About the Lock Sync connection</h3>
          <p>Sleeper does not provide a normal user-facing “Lock Sync code” in its account settings.</p>
          <p>RosterBate's private Lock Sync currently uses an <strong>advanced Sleeper session token</strong>. This is different from your Sleeper username and password.</p>
          <div class="warn"><strong>Important:</strong> never enter your Sleeper password here. A session token is a sensitive credential and should be treated like a logged-in session.</div>
          <p class="muted">RosterBate cannot automatically read a private session from sleeper.com because browsers isolate one website's login data from another website.</p>
          <p class="muted">If you already have your own Sleeper session token, continue and RosterBate will verify it before saving anything. If you do not, you can keep using the public Sleeper link without Lock Sync.</p>
        </div>
        <div class="choice">
          <button id="rbLockGuidePublic" class="public" type="button">Continue Without Lock Sync</button>
          <button id="rbLockGuideHaveToken" class="continue" type="button">I Already Have My Session Token →</button>
        </div>
      </div>`,
      `<button data-close>Close</button>`
    );
    setTimeout(()=>{
      document.getElementById('rbLockGuidePublic')?.addEventListener('click',close);
      document.getElementById('rbLockGuideHaveToken')?.addEventListener('click',()=>{close();setTimeout(originalAdvanced,0)});
    },0);
  }

  function install(){
    if(!window.rbSleeperLink)return false;
    if(!window.rbSleeperLink.__rawAdvanced)window.rbSleeperLink.__rawAdvanced=window.rbSleeperLink.advanced;
    window.rbSleeperLink.advanced=showGuide;
    return true;
  }

  if(!install()){
    let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},50);
  }

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('#enableLockSync,#rbAdvancedSleeper');
    if(!t)return;
    if(!window.rbSleeperLink?.__rawAdvanced)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    showGuide();
  },true);
})();