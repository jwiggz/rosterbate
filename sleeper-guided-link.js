(()=>{
  const css=`
  .rb-link-guide{font-size:11px;line-height:1.55;color:#c8d4e3}
  .rb-link-guide .steps{display:flex;gap:6px;margin:4px 0 16px}
  .rb-link-guide .step{flex:1;border:1px solid #34465e;border-radius:8px;padding:7px 8px;text-align:center;color:#8192a9;background:#182437;font-size:9px;font-weight:800}
  .rb-link-guide .step.active{border-color:#12c7cc;color:#eaffff;background:#12383f}
  .rb-link-guide .step.done{border-color:#2f9e75;color:#8ff1c7;background:#15342f}
  .rb-link-guide .panel{border:1px solid #34465e;background:#182437;border-radius:10px;padding:13px;margin:10px 0}
  .rb-link-guide h3{margin:0 0 7px;color:#fff;font-size:14px}
  .rb-link-guide p{margin:6px 0}
  .rb-link-guide .muted{color:#8798ae;font-size:9px}
  .rb-link-guide .good{color:#7ce8bd}
  .rb-link-guide .warn{color:#f5bf5a}
  .rb-link-guide input{width:100%;box-sizing:border-box;margin-top:7px}
  .rb-link-guide .summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
  .rb-link-guide .summary>div{border:1px solid #34465e;background:#142033;border-radius:8px;padding:10px}
  .rb-link-guide .label{font-size:8px;color:#8293aa;text-transform:uppercase;font-weight:800}
  .rb-link-guide .value{margin-top:3px;color:#fff;font-weight:900;font-size:12px}
  .rb-link-guide .feature{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #2d3d53}
  .rb-link-guide .feature:last-child{border-bottom:0}
  .rb-link-guide .on{color:#73e7b9;font-weight:900}.rb-link-guide .off{color:#f0b45b;font-weight:900}
  @media(max-width:640px){.rb-link-guide .steps{display:grid;grid-template-columns:1fr 1fr}.rb-link-guide .summary{grid-template-columns:1fr}}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function close(){try{if(typeof closeModal==='function')closeModal()}catch{}}
  function show(title,body,footer){if(typeof showModal==='function')showModal(title,`<div class="rb-link-guide">${body}</div>`,footer)}
  function steps(n){return `<div class="steps"><div class="step ${n===1?'active':n>1?'done':''}">1 · Username</div><div class="step ${n===2?'active':n>2?'done':''}">2 · Confirm</div><div class="step ${n===3?'active':''}">3 · Ready</div></div>`}

  function start(){
    const current=window.rbSleeperLink?.linkedUsername?.()||'';
    show('Connect Your Sleeper Account',`${steps(1)}
      <div class="panel"><h3>Enter your Sleeper username</h3><p>RosterBate will find your Sleeper account and match it to the roster you own in this league.</p>
      <label>Sleeper username</label><input id="rbGuideUsername" autocomplete="username" value="${esc(current)}" placeholder="ArmandoMsports">
      <div id="rbGuideLinkError" class="error" style="display:none;margin-top:9px"></div></div>
      <p class="good">No Sleeper password is needed.</p>`,
      `<button data-close>Cancel</button><button id="rbGuideFind" class="primary">Find My Team →</button>`);
    setTimeout(()=>{
      const input=document.getElementById('rbGuideUsername'),btn=document.getElementById('rbGuideFind'),err=document.getElementById('rbGuideLinkError');
      btn?.addEventListener('click',async()=>{
        const username=String(input?.value||'').trim();err.style.display='none';err.textContent='';
        if(!username){err.textContent='Enter your Sleeper username.';err.style.display='block';return}
        const old=btn.textContent;btn.disabled=true;btn.textContent='Finding team…';
        try{
          const fn=window.rbSleeperLink?.linkByUsername;if(typeof fn!=='function')throw new Error('Sleeper linking is still loading. Try again.');
          const result=await fn(username);close();confirm(result);
        }catch(e){err.textContent=String(e?.message||e);err.style.display='block'}finally{btn.disabled=false;btn.textContent=old}
      });
      input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();btn?.click()}});input?.focus();
    },0);
  }

  function confirm(result){
    const u=result?.user||{},r=result?.roster||{};
    show('Sleeper Team Found',`${steps(2)}
      <div class="panel"><h3>${esc(u.display_name||u.username||'Sleeper account')}</h3><p>RosterBate matched this Sleeper account to a roster in the current league.</p>
      <div class="summary"><div><div class="label">Sleeper username</div><div class="value">${esc(u.username||u.display_name||'—')}</div></div><div><div class="label">Roster ID</div><div class="value">${esc(r.roster_id??'—')}</div></div></div></div>
      <p class="muted">Your account link is saved only for this RosterBate user on this browser.</p>`,
      `<button id="rbGuideChange">← Change</button><button id="rbGuideFinish" class="primary">Use This Team →</button>`);
    setTimeout(()=>{
      document.getElementById('rbGuideChange')?.addEventListener('click',()=>{close();start()});
      document.getElementById('rbGuideFinish')?.addEventListener('click',()=>{close();ready(u)});
    },0);
  }

  function ready(user){
    show('Sleeper Linked',`${steps(3)}
      <div class="panel"><h3>You're ready to use RosterBate</h3><p><strong>${esc(user?.display_name||user?.username||'Your Sleeper account')}</strong> is linked to this RosterBate account.</p>
        <div class="feature"><span>League, roster & matchup data</span><span class="on">READY</span></div>
        <div class="feature"><span>Player stats, projections & waiver tools</span><span class="on">READY</span></div>
        <div class="feature"><span>Private Sleeper Lock-In/write sync</span><span class="off">NOT AUTHORIZED</span></div>
      </div>
      <p class="warn">Sleeper's documented public API does not provide an official third-party sign-in/write authorization flow. RosterBate will not ask normal users to extract or share private session credentials.</p>
      <p class="muted">If Sleeper provides RosterBate with an official OAuth/partner integration later, this last feature can become a normal one-click approval.</p>`,
      `<button id="rbGuideDone" class="primary">Done</button>`);
    setTimeout(()=>document.getElementById('rbGuideDone')?.addEventListener('click',close),0);
  }

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('#connectBtn');if(!t)return;
    const txt=String(t.textContent||'').toLowerCase();
    if(txt.includes('connected'))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();start();
  },true);

  window.rbSleeperGuidedLink={start};
})();