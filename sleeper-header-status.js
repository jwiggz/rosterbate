(()=>{
  // Header: always show Sleeper link + Lock Sync status as two pills (click → settings).
  // "Change League" lives inside the settings dialog instead of the header.
  const css=`
.head-actions #connectBtn{display:none!important}
.head-actions #rbChangeLeague{display:none!important}
#rbHeaderStatus{display:inline-flex;align-items:center;gap:6px}
#rbHeaderStatus button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:7px;font-size:9px;font-weight:850;white-space:nowrap;border:1px solid transparent}
#rbHeaderStatus button:focus-visible{outline:2px solid #08c7c9;outline-offset:2px}
#rbHeaderStatus .dot{width:7px;height:7px;border-radius:50%;flex:0 0 7px}
#rbHeaderStatus .on{background:#164c46;color:#9ff6d7;border-color:rgba(48,216,160,.35)}#rbHeaderStatus .on .dot{background:#30d8a0;box-shadow:0 0 6px rgba(48,216,160,.7)}
#rbHeaderStatus .off{background:#3a2e17;color:#f3c75b;border-color:rgba(243,199,91,.35)}#rbHeaderStatus .off .dot{background:#f3c75b}
#rbHeaderStatus .none{background:#2a364b;color:#a9b5c7;border-color:#40516b}#rbHeaderStatus .none .dot{background:#6f7d92}
#rbHeaderStatus .wait{background:#2a364b;color:#a9b5c7;border-color:#40516b}#rbHeaderStatus .wait .dot{background:#8e9bb0;animation:rbPulse 1s ease-in-out infinite}
@keyframes rbPulse{50%{opacity:.3}}
@media(prefers-reduced-motion:reduce){#rbHeaderStatus .wait .dot{animation:none}}
`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let vaultChecked=false;
  function state(){
    let id='',name='',lock=false;
    try{id=String(localStorage.getItem('rbSleeperLinkedUserId')||'');name=String(localStorage.getItem('rbSleeperLinkedUsername')||'')}catch{}
    try{lock=!!window.rbSleeperVault?.isConnected?.()&&sessionStorage.getItem('rbSleeperLockSyncVerified')==='1'}catch{}
    if(!name&&id){try{const t=(currentData?.teams||[]).find(x=>String(x.owner_id||'')===id);name=t?.display_name||''}catch{}}
    return{linked:!!id,name,lock};
  }
  function openSettings(){try{window.rbSleeperLink?.settings?.()}catch{}}
  function render(){
    const host=document.querySelector('.head-actions');if(!host)return;
    let el=document.getElementById('rbHeaderStatus');
    if(!el){el=document.createElement('span');el.id='rbHeaderStatus';const anchor=document.getElementById('connectBtn')||host.querySelector('.gear');anchor?anchor.insertAdjacentElement('beforebegin',el):host.prepend(el);el.addEventListener('click',e=>{if(e.target.closest('button'))openSettings()})}
    const s=state();
    const sleeper=s.linked?`<button type="button" class="on" title="Linked Sleeper account"><span class="dot"></span>Sleeper: ${esc(s.name||'Linked')}</button>`:`<button type="button" class="none" title="Link your Sleeper account"><span class="dot"></span>Sleeper: Not linked</button>`;
    const lockCls=s.lock?'on':(!vaultChecked&&s.linked?'wait':'off');
    const lockTxt=s.lock?'Lock Sync: On':lockCls==='wait'?'Lock Sync: Checking…':'Lock Sync: Off';
    const lockTitle=s.lock?'Encrypted Lock Sync is connected and verified':'Lock Sync is off — locked points and lineup writes need it';
    const html=`${sleeper}<button type="button" class="${lockCls}" title="${lockTitle}"><span class="dot"></span>${lockTxt}</button>`;
    if(el.__html!==html){el.innerHTML=html;el.__html=html}
  }
  // Settings dialog: add "Change League" (same link the header button used).
  function addChangeLeague(){
    const head=[...document.querySelectorAll('.modal-head span,.modal-head')].find(x=>/Sleeper Connection Settings/.test(x.textContent||''));if(!head)return;
    const modal=head.closest('.modal');const actions=modal?.querySelector('.modal-actions');if(!actions||actions.querySelector('#rbChangeLeagueModal'))return;
    const a=document.createElement('a');a.id='rbChangeLeagueModal';a.href='/sleeper-leagues.html';a.textContent='Change League';
    a.style.cssText='display:inline-flex;align-items:center;height:30px;padding:0 10px;border:1px solid #40516b;background:#27354a;color:#cfd8e6;border-radius:7px;font-size:9px;font-weight:800;text-decoration:none;margin-right:auto';
    actions.prepend(a);
  }
  function install(){
    if(!document.getElementById('rbHeaderStatusStyle')){const s=document.createElement('style');s.id='rbHeaderStatusStyle';s.textContent=css;document.head.appendChild(s)}
    render();
    window.addEventListener('rb:sleeper-vault',()=>{vaultChecked=true;render()});
    window.addEventListener('storage',render);
    window.rbAuthReady?.then?.(()=>window.rbSleeperVault?.status?.().catch(()=>{}).finally(()=>{vaultChecked=true;render()}));
    setTimeout(()=>{vaultChecked=true;render()},8000);
    // Cheap poll (string compare only) to catch link/unlink from the settings dialog.
    setInterval(render,1500);
    const root=document.getElementById('modalRoot')||document.body;new MutationObserver(()=>addChangeLeague()).observe(root,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
