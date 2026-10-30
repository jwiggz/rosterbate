(()=>{
  // Lineup swap selection: make it obvious, and easy to back out of.
  // Cancel with the banner button, the Cancel button, Esc, clicking anywhere outside the
  // roster, or leaving the window. A refresh always starts with nothing selected.
  const css=`
#teamView .rb-swap-banner{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;margin:0 0 8px;padding:10px 14px;border-radius:9px;background:linear-gradient(90deg,#0a5f63,#0b4a52);border:1px solid #11c3c6;box-shadow:0 6px 18px rgba(0,0,0,.35);color:#e9fdfd;font-size:11px;font-weight:800}
#teamView .rb-swap-banner b{color:#fff}
#teamView .rb-swap-banner .hint{color:#a6e9ea;font-weight:700;font-size:9px}
#teamView .rb-swap-banner .sp{flex:1}
#teamView .rb-swap-banner button{all:unset;cursor:pointer;padding:7px 14px;border-radius:7px;background:#e9fdfd;color:#063c3f;font-size:10px;font-weight:950;letter-spacing:.03em}
#teamView .rb-swap-banner button:hover{background:#fff}
#teamView .rb-swap-banner button:focus-visible{outline:2px solid #fff;outline-offset:2px}
#teamView.rb-swapping .player-row.selected,#teamView.rb-swapping .player-row.rb-bench-selected{outline:2px solid #11c3c6!important;outline-offset:-2px!important;background:#1d4a52!important;box-shadow:0 0 0 4px rgba(17,195,198,.18)!important;opacity:1!important}
#teamView.rb-swapping .player-row.rb-swap-target{box-shadow:inset 4px 0 0 #11c3c6!important;cursor:pointer!important}
#teamView.rb-swapping .player-row.rb-swap-target:hover{background:rgba(17,195,198,.1)!important}
#teamView.rb-swapping .player-row.rb-swap-dim{opacity:.38!important}
#teamView #cancelSelect:not([disabled]){background:#11c3c6!important;color:#063c3f!important;border-color:#11c3c6!important;font-weight:950!important}
`;
  function addStyle(){if(document.getElementById('rbSwapUxStyle'))return;const s=document.createElement('style');s.id='rbSwapUxStyle';s.textContent=css;document.head.appendChild(s)}
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function starterIdx(){try{return typeof selectedStarterIndex!=='undefined'&&selectedStarterIndex!=null?Number(selectedStarterIndex):null}catch{return null}}
  function benchFirst(){try{return window.rbBenchFirst?.()||''}catch{return''}}
  function active(){return starterIdx()!=null||!!benchFirst()}
  function modalOpen(){return !!document.querySelector('.modal-backdrop:not(.hidden),#rbPlayerCardBackdrop')}

  function cancel(){
    const was=active();
    try{window.rbClearBenchFirst?.()}catch{}
    try{clearSelection()}catch{try{selectedStarterIndex=null;pendingSwap=null}catch{}}
    document.querySelectorAll('#teamView .player-row.selected').forEach(r=>r.classList.remove('selected'));
    if(was){try{renderTeam()}catch{}}
    decorate();
  }
  window.rbCancelLineupSelection=cancel;

  function decorate(){
    const root=document.getElementById('teamView');if(!root)return;
    const card=root.querySelector('.team-card');
    const idx=starterIdx(),bf=benchFirst();
    // Only redo work when the selection changed or the roster card was re-rendered.
    const sig=`${idx}|${bf}`;
    if(root.__rbSwapSig===sig&&root.__rbSwapCard===card)return;
    root.__rbSwapSig=sig;root.__rbSwapCard=card;
    root.querySelector('.rb-swap-banner')?.remove();
    root.querySelectorAll('.rb-swap-target,.rb-swap-dim').forEach(r=>r.classList.remove('rb-swap-target','rb-swap-dim'));
    root.classList.toggle('rb-swapping',idx!=null||!!bf);
    if(!card||(idx==null&&!bf))return;
    let html='';
    try{
      if(idx!=null){
        const m=matchup(selectedRoster),id=String((m?.starters||[])[idx]||'0'),labels=starterLabels((m?.starters||[]).length),slot=labels?.[idx]||'slot';
        const name=id==='0'?'Empty slot':player(id).full_name;
        html=`<span>Swapping <b>${esc(name)}</b> (${esc(slot)}) — pick an eligible bench player.</span>`;
        card.querySelectorAll('.bench .player-row').forEach(r=>r.classList.add(r.hasAttribute('data-bench-id')?'rb-swap-target':'rb-swap-dim'));
        card.querySelectorAll(':scope > .player-row').forEach(r=>{if(!r.classList.contains('selected'))r.classList.add('rb-swap-dim')});
      }else{
        const name=player(bf).full_name||'bench player';
        html=`<span>Moving <b>${esc(name)}</b> into the lineup — pick the starter to replace.</span>`;
        card.querySelectorAll(':scope > .player-row').forEach(r=>r.classList.add(r.hasAttribute('data-starter-index')&&!r.classList.contains('locked-in')&&!r.classList.contains('rb-slot-pinned')?'rb-swap-target':'rb-swap-dim'));
        card.querySelectorAll('.bench .player-row').forEach(r=>{if(!r.classList.contains('rb-bench-selected'))r.classList.add('rb-swap-dim')});
      }
    }catch{return}
    const b=document.createElement('div');b.className='rb-swap-banner';b.setAttribute('role','status');
    b.innerHTML=`${html}<span class="sp"></span><span class="hint">Esc or click outside to cancel</span><button type="button" data-rb-swap-cancel>Cancel</button>`;
    (card.querySelector('.editor-bar')||card.firstElementChild)?.insertAdjacentElement('afterend',b);
    // Base disables Cancel unless a starter is selected; enable it for any selection.
    const c=card.querySelector('#cancelSelect');if(c)c.disabled=false;
  }

  let queued=false;const soon=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})};

  function install(){
    addStyle();
    try{selectedStarterIndex=null;pendingSwap=null}catch{}
    try{if(typeof renderTeam==='function'&&!renderTeam.__rbSwapUx){const base=renderTeam;const w=function(...a){const o=base.apply(this,a);decorate();return o};w.__rbSwapUx=true;renderTeam=w;window.renderTeam=w}}catch{}
    const root=document.getElementById('teamView');
    // Re-decorate when the roster is rebuilt (new rows lose our classes); our own banner
    // insert doesn't change the signature, so this settles after one pass.
    if(root)new MutationObserver(()=>soon()).observe(root,{childList:true});
    root?.addEventListener('click',()=>setTimeout(decorate,0));
    window.addEventListener('rb:lineup-selection',()=>soon());
    // Any of our Cancel controls (the base button is re-enabled for bench-first picks too).
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-rb-swap-cancel],#cancelSelect')&&active()){e.preventDefault();e.stopImmediatePropagation();cancel()}
    },true);
    // Click anywhere that isn't the roster, the editor bar or an open dialog.
    document.addEventListener('pointerdown',e=>{
      if(!active()||modalOpen())return;
      if(e.target.closest?.('#teamView .player-row,#teamView .editor-bar,#teamView .rb-swap-banner,.modal-backdrop,#rbPlayerCardBackdrop'))return;
      cancel();
    },true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active()&&!modalOpen())cancel()});
    // Leaving the page (tab switch / clicking outside the browser window).
    window.addEventListener('blur',()=>{if(active()&&!modalOpen())cancel()});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())cancel()});
    // A day or tab switch always drops the selection.
    document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab')&&active())cancel()},true);
    decorate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
