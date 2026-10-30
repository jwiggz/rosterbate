(()=>{
  // Past days show the lineup as it actually was that day (from RosterBate's lineup
  // history), read-only. Today and future days keep the live lineup editor.
  const css=`
#teamView .rb-past-banner{margin:0 0 6px;padding:8px 12px;border:1px solid rgba(143,160,184,.25);border-radius:8px;background:rgba(25,36,52,.75);color:#c7d2e2;font-size:10px;font-weight:700;display:flex;align-items:center;gap:8px}
#teamView .rb-past-banner b{color:#e9eef7}
#teamView .rb-past-tag{margin-left:6px;padding:1px 6px;border-radius:4px;font-size:7px;font-weight:900;letter-spacing:.04em;vertical-align:middle;background:rgba(143,160,184,.14);color:#aab6c8;border:1px solid rgba(143,160,184,.28)}
#teamView.rb-past-view .player-row:not(.locked-in):not(.lockable){cursor:default!important}
#teamView.rb-past-view #cancelSelect,#teamView.rb-past-view #undoBtn,#teamView.rb-past-view #rbApplyDailyPlan{display:none!important}
`;
  function addStyle(){if(document.getElementById('rbPastLineupStyle'))return;const s=document.createElement('style');s.id='rbPastLineupStyle';s.textContent=css;document.head.appendChild(s)}
  const fantasyDay=()=>{const d=new Date();if(d.getHours()<6)d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  let view=null; // {day, hist:[...], cur:[...]} while a past lineup is on screen

  function historicLineup(){
    try{
      const day=String(selectedDay||'');
      if(!day||day==='all'||day>=fantasyDay())return null;
      const m=matchup(selectedRoster);if(!m)return null;
      const cur=(m.starters||[]).map(String);
      const hist=window.rbStarterHistory?.lineupOn?.(day);
      if(!Array.isArray(hist)||hist.length!==cur.length)return null;
      if(hist.every((x,i)=>x===cur[i]))return null;
      return{day,hist,cur};
    }catch{return null}
  }
  function pointsAligned(m,ids){
    const cur=(m.starters||[]).map(String),sp=Array.isArray(m.starters_points)?m.starters_points:[],pp=m.players_points||{};
    return ids.map(id=>{const i=cur.indexOf(String(id));if(i>=0&&sp[i]!=null)return sp[i];const v=Number(pp[String(id)]);return Number.isFinite(v)?v:0});
  }
  function pid(row){
    const c=String(row?.dataset?.rbPlayerId||'');if(c)return c;
    const name=String(row?.querySelector('.pname')?.textContent||'').replace(/\s*\(locked\)\s*$/i,'').trim().toLowerCase();
    for(const [id,p] of Object.entries(currentData?.players||{}))if(String(p?.full_name||'').trim().toLowerCase()===name){row.dataset.rbPlayerId=String(id);return String(id)}
    return'';
  }
  function tag(row,text){const host=row.querySelector('.matchup-meta')||row.querySelector('.pmeta')||row.querySelector('.pname');if(!host||row.querySelector('.rb-past-tag'))return;const s=document.createElement('span');s.className='rb-past-tag';s.textContent=text;host.appendChild(s)}
  function label(day){try{return new Date(`${day}T12:00:00`).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}catch{return day}}

  // Strip everything that would edit the lineup. Runs before bindTeam so no swap
  // handlers get attached, and again whenever other scripts redecorate the rows.
  function readOnly(){
    if(!view)return;
    const root=document.getElementById('teamView');if(!root)return;
    root.classList.add('rb-past-view');
    const card=root.querySelector('.team-card');if(!card)return;
    const curSet=new Set(view.cur.filter(x=>x!=='0')),histSet=new Set(view.hist.filter(x=>x!=='0'));
    card.querySelectorAll('.player-row').forEach(row=>{
      row.removeAttribute('data-starter-index');row.removeAttribute('data-bench-id');
      row.classList.remove('editable','selected','rb-bench-selected');
      const id=pid(row),inBench=!!row.closest('.bench,.ir-list');
      // A LOCK IN is only valid for someone who is still a starter right now.
      if(inBench||(id&&!curSet.has(id))){
        row.querySelectorAll('.lock-btn').forEach(b=>b.remove());
        if(!row.querySelector('.lock-chip'))row.classList.remove('lockable');
      }
      if(!inBench&&id&&!curSet.has(id))tag(row,'NOW ON BENCH');
      if(inBench&&id&&curSet.has(id)&&!histSet.has(id))tag(row,'NOW STARTING');
    });
    const bar=card.querySelector('.editor-bar');
    if(bar){const t=bar.querySelector('span');const msg=`Lineup on ${label(view.day)} · read-only`;if(t&&t.textContent!==`Lineup Editor: ${msg}`)t.innerHTML=`<strong>Lineup Editor:</strong> ${msg}`}
    if(!card.querySelector('.rb-past-banner')){
      const b=document.createElement('div');b.className='rb-past-banner';
      b.innerHTML=`<span>🕘</span><span>Showing your lineup as it was on <b>${label(view.day)}</b>. Lineup changes apply to today and later days.</span>`;
      (bar||card.querySelector('.day-strip'))?.insertAdjacentElement('afterend',b);
    }
  }

  let observer=null;
  function watch(){
    const root=document.getElementById('teamView');if(!root||observer)return;
    observer=new MutationObserver(()=>{if(view)queueMicrotask(readOnly)});
    observer.observe(root,{childList:true,subtree:true});
  }

  function hook(){
    try{
      if(typeof renderTeam!=='function'||renderTeam.__rbPastLineup)return;
      const base=renderTeam;
      const wrapped=function(...args){
        if(view&&view.__rendering)return base.apply(this,args);
        const h=historicLineup();
        const root=document.getElementById('teamView');
        if(!h){view=null;root?.classList.remove('rb-past-view');return base.apply(this,args)}
        const m=matchup(selectedRoster);
        const saved={starters:m.starters,starters_points:m.starters_points,bind:window.bindTeam};
        view=h;view.__rendering=true;
        try{selectedStarterIndex=null}catch{}
        m.starters=h.hist.slice();m.starters_points=pointsAligned({...m,starters:saved.starters,starters_points:saved.starters_points},h.hist);
        window.bindTeam=function(...a){readOnly();return saved.bind.apply(this,a)};
        try{return base.apply(this,args)}
        finally{if(view)view.__rendering=false;m.starters=saved.starters;m.starters_points=saved.starters_points;window.bindTeam=saved.bind;readOnly()}
      };
      wrapped.__rbPastLineup=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}
    }catch{}
  }
  function start(){addStyle();hook();watch()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('rb:lineup-history',()=>{try{if(String(selectedDay)!=='all'&&String(selectedDay)<fantasyDay())renderTeam()}catch{}});
})();
