(()=>{
  // 1) Other teams are view-only: no swaps, locks, plans or undo; clicking a player opens his card.
  // 2) Player card gets a Trade button that opens the Trades tab with that player preselected.
  const css=`
#teamView.rb-view-only .player-row{cursor:pointer!important}
#teamView.rb-view-only .player-row.selected,#teamView.rb-view-only .player-row.rb-bench-selected{outline:none!important}
#teamView.rb-view-only #cancelSelect,#teamView.rb-view-only #undoBtn,#teamView.rb-view-only #rbApplyDailyPlan,#teamView.rb-view-only #rbPlanBanner,#teamView.rb-view-only .rb-swap-banner{display:none!important}
#teamView .rb-view-banner{margin:0 0 6px;padding:8px 12px;border-radius:8px;background:rgba(25,36,52,.8);border:1px solid rgba(143,160,184,.25);color:#c7d2e2;font-size:10px;font-weight:750;display:flex;align-items:center;gap:8px}
#teamView .rb-view-banner b{color:#eef4ff}
#teamView .rb-view-banner button{all:unset;cursor:pointer;margin-left:auto;padding:5px 10px;border-radius:6px;background:#27354a;border:1px solid #40516b;color:#cfd8e6;font-size:9px;font-weight:900}
#teamView .rb-view-banner button:focus-visible{outline:2px solid #08c7c9;outline-offset:2px}
#teamView.rb-view-only .team-card .player-row.rb-stats-row > .pts.rb-other-lockable.rb-other-lockable{position:relative!important;width:68px!important;min-width:68px!important;height:42px!important;min-height:42px!important;padding:14px 7px 3px!important;border:2px dashed #e69a24!important;background:linear-gradient(180deg,rgba(104,65,10,.42),rgba(60,38,8,.36))!important;color:#ffd27a!important;text-shadow:none!important;cursor:default!important;animation:none!important}
#teamView.rb-view-only .team-card .player-row.rb-stats-row > .pts.rb-other-lockable.rb-other-lockable::before{content:'LOCKABLE'!important;display:block!important;position:absolute;top:4px;left:0;right:0;text-align:center;color:#ffe5ae;font-size:6px;font-weight:950;letter-spacing:.08em;line-height:1}
#rbPlayerCard .rb-card-trade{margin-left:auto;margin-right:10px;align-self:center;cursor:pointer;padding:9px 16px;border-radius:8px;border:1px solid #11c3c6;background:#0a8e93;color:#ecffff;font-size:11px;font-weight:950;letter-spacing:.03em}
#rbPlayerCard .rb-card-trade:hover{background:#0ba8ad}
#rbPlayerCard .rb-card-trade:focus-visible{outline:2px solid #fff;outline-offset:2px}
`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function linkedId(){try{return String(localStorage.getItem('rbSleeperLinkedUserId')||'')}catch{return''}}
  function myRoster(){const uid=linkedId();if(!uid)return 0;try{return Number((currentData?.teams||[]).find(t=>String(t.owner_id||'')===uid)?.roster_id||0)}catch{return 0}}
  function viewingOther(){try{return !!currentData&&Number(selectedRoster)!==myRoster()}catch{return false}}
  const team=rid=>{try{return(currentData?.teams||[]).find(t=>Number(t.roster_id)===Number(rid))||null}catch{return null}};

  function lockDown(){
    const root=document.getElementById('teamView');if(!root)return;
    const other=viewingOther();root.classList.toggle('rb-view-only',other);
    if(!other){root.querySelector('.rb-view-banner')?.remove();return}
    const card=root.querySelector('.team-card');if(!card)return;
    card.querySelectorAll('.player-row').forEach(row=>{
      row.removeAttribute('data-starter-index');row.removeAttribute('data-bench-id');
      row.classList.remove('editable','selected','rb-bench-selected','lockable');
      row.querySelectorAll('.lock-btn').forEach(b=>b.remove());
      const pts=row.querySelector(':scope > .pts');if(pts){pts.classList.remove('rb-lock-ready-pts');pts.removeAttribute('role');pts.removeAttribute('tabindex');pts.removeAttribute('title')}
    });
    // Show (not offer) which of their starters the owner could lock right now, like Sleeper's app.
    const ids=new Map();try{for(const [id,p] of Object.entries(currentData?.players||{}))ids.set(String(p?.full_name||'').trim().toLowerCase(),String(id))}catch{}
    const starterIds=(()=>{try{return new Set((matchup(selectedRoster)?.starters||[]).map(String))}catch{return new Set()}})();
    card.querySelectorAll(':scope > .player-row').forEach(row=>{
      const pts=row.querySelector(':scope > .pts');if(!pts)return;
      const pid=String(row.dataset.rbPlayerId||ids.get(String(row.querySelector('.pname')?.textContent||'').replace(/\s*\(locked\)\s*$/i,'').trim().toLowerCase())||'');
      const can=!!pid&&starterIds.has(pid)&&!row.classList.contains('locked-in')&&!!window.rbLockableGame?.(pid,(()=>{try{return selectedDay}catch{return'all'}})());
      if(pts.classList.contains('rb-other-lockable')!==can)pts.classList.toggle('rb-other-lockable',can);if(can&&pts.title!=='Lockable by the team owner')pts.title='Lockable by the team owner'
    });
    try{if(selectedStarterIndex!=null)selectedStarterIndex=null;if(pendingSwap)pendingSwap=null}catch{}
    try{window.rbClearBenchFirst?.()}catch{}
    const bar=card.querySelector('.editor-bar');const t=team(selectedRoster),me=myRoster();
    const msgText=`Viewing ${t?.team_name||'this team'} · read-only`;
    const span=bar?.querySelector('span');if(span&&span.textContent!==`Lineup Editor: ${msgText}`)span.innerHTML=`<strong>Lineup Editor:</strong> ${esc(msgText)}`;
    if(!card.querySelector('.rb-view-banner')){
      const b=document.createElement('div');b.className='rb-view-banner';b.setAttribute('role','status');
      b.innerHTML=`<span>👁</span><span>You're viewing <b>${esc(t?.team_name||'another team')}</b>. Only the team owner can change this lineup or lock players. Click a player to see his card.</span>${me?'<button type="button" data-rb-my-team>Back to my team</button>':''}`;
      (bar||card.querySelector('.day-strip'))?.insertAdjacentElement('afterend',b);
    }
  }

  function install(){
    if(!document.getElementById('rbViewOnlyStyle')){const s=document.createElement('style');s.id='rbViewOnlyStyle';s.textContent=css;document.head.appendChild(s)}
    // Strip edit hooks before bindTeam attaches handlers, then once more after render.
    try{if(typeof renderTeam==='function'&&!renderTeam.__rbViewOnly){const base=renderTeam;const w=function(...a){
      if(!viewingOther()){const o=base.apply(this,a);lockDown();return o}
      const bind=window.bindTeam;window.bindTeam=function(...b){lockDown();return bind.apply(this,b)};
      try{return base.apply(this,a)}finally{window.bindTeam=bind;lockDown()}
    };w.__rbViewOnly=true;renderTeam=w;window.renderTeam=w}}catch{}
    const root=document.getElementById('teamView');
    if(root)new MutationObserver(()=>{if(viewingOther())queueMicrotask(lockDown)}).observe(root,{childList:true,subtree:true});
    // Block any edit attempt that slips through (other scripts add buttons asynchronously).
    document.addEventListener('pointerdown',e=>{if(viewingOther()&&e.target.closest?.('#teamView .player-row'))e.stopImmediatePropagation()},true);
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-rb-my-team]')){const me=myRoster();const pk=document.getElementById('teamPicker');if(me&&pk){pk.value=String(me);pk.dispatchEvent(new Event('change',{bubbles:true}))}return}
      if(!viewingOther())return;
      const row=e.target.closest?.('#teamView .player-row');if(!row)return;
      if(e.target.closest?.('.lock-btn,.pts,[data-lock-player]')){e.preventDefault();e.stopImmediatePropagation()}
      // Anywhere on the row opens the player card (the card listens on the player block).
      if(!e.target.closest?.('.player-info,.player-head,.player-copy')){e.preventDefault();e.stopImmediatePropagation();row.querySelector('.player-info,.player-copy')?.dispatchEvent(new MouseEvent('click',{bubbles:true}))}
    },true);
    // Trade button on the player card.
    const addTrade=()=>{
      const back=document.getElementById('rbPlayerCardBackdrop');const card=back?.querySelector('#rbPlayerCard');if(!card||card.querySelector('.rb-card-trade'))return;
      const pid=String(back.dataset.playerId||'');const head=card.querySelector('.rbh');if(!pid||!head)return;
      const owner=(currentData?.teams||[]).find(t=>(t.players||[]).map(String).includes(pid));
      if(!owner||!myRoster())return; // free agents and unlinked viewers can't trade
      const mine=Number(owner.roster_id)===myRoster();
      const b=document.createElement('button');b.type='button';b.className='rb-card-trade';b.textContent=mine?'Trade Away':'Trade For';
      b.title=mine?'Open the trade builder with this player from your team':`Open the trade builder with ${owner.team_name||'his team'}`;
      b.addEventListener('click',()=>{back.remove();window.rbTrades?.startWith?.(pid)});
      head.querySelector('.rbclose')?.insertAdjacentElement('beforebegin',b);
    };
    // The card fills itself in after loading, so watch the card too (it re-renders its header).
    let watched=null;
    new MutationObserver(()=>{const back=document.getElementById('rbPlayerCardBackdrop');addTrade();if(back&&back!==watched){watched=back;new MutationObserver(addTrade).observe(back,{childList:true,subtree:true})}}).observe(document.body,{childList:true});
    lockDown();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
