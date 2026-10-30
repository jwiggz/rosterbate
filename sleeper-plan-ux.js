(()=>{
  const STYLE_ID='rbPlanUxStyle';
  function addStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
#teamView .player-row.rb-plan-in{outline:2px solid #18c7c9!important;outline-offset:-2px!important;background:linear-gradient(90deg,rgba(10,142,147,.18),rgba(10,142,147,.05))!important}
#teamView .player-row.rb-plan-out{outline:2px dashed #e6a23c!important;outline-offset:-2px!important;background:linear-gradient(90deg,rgba(230,162,60,.14),rgba(230,162,60,.03))!important}
#teamView .player-row.rb-plan-move{outline:2px solid #b985ff!important;outline-offset:-2px!important;background:linear-gradient(90deg,rgba(153,102,255,.16),rgba(153,102,255,.04))!important}
#teamView .rb-plan-badge{display:inline-flex;align-items:center;gap:4px;margin-left:7px;padding:3px 6px;border-radius:999px;font-size:7px;font-weight:950;letter-spacing:.05em;vertical-align:middle;white-space:nowrap}
#teamView .rb-plan-in .rb-plan-badge{background:#0a8e93;color:#ecffff;border:1px solid #19c8cc}
#teamView .rb-plan-out .rb-plan-badge{background:#6b4514;color:#ffe0a3;border:1px solid #e6a23c}
#teamView .rb-plan-move .rb-plan-badge{background:#4f3574;color:#eadbff;border:1px solid #aa7ce8}
#rbPlanBanner{margin:8px 10px 10px;padding:12px 14px;border-radius:10px;border:1px solid #d7a43b;background:linear-gradient(90deg,rgba(103,72,18,.78),rgba(47,39,22,.72));display:flex;align-items:center;justify-content:space-between;gap:14px}
#rbPlanBanner.rb-plan-ready{border-color:#ffb247;background:linear-gradient(90deg,rgba(122,66,11,.86),rgba(58,38,22,.78));box-shadow:0 0 16px rgba(255,166,55,.16)}
#rbPlanBanner .rb-plan-copy{min-width:0}.rb-plan-kicker{font-size:8px;font-weight:950;letter-spacing:.09em;color:#ffd98d;text-transform:uppercase}.rb-plan-title{font-size:12px;font-weight:900;color:#fff;margin-top:2px}.rb-plan-sub{font-size:9px;color:#b9c5d6;margin-top:3px;line-height:1.4}.rb-plan-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#rbPlanBanner button{border-radius:7px;padding:8px 11px;font-size:9px;font-weight:900;border:1px solid #566985;background:#26354a;color:#fff;cursor:pointer}
#rbPlanBanner .rb-plan-apply{background:#0a8e93;border-color:#14b9bd;color:#efffff}
#rbPlanBanner .rb-plan-keep{background:#313d50;border-color:#596a81;color:#d9e2ef}
#teamView .day-btn.rb-has-plan{border-color:#c99d42!important;background:linear-gradient(180deg,rgba(113,82,23,.36),rgba(29,42,59,.96))!important;box-shadow:inset 0 -3px 0 #f3c75b,0 0 9px rgba(243,199,91,.12)!important}
@media(max-width:760px){#rbPlanBanner{align-items:flex-start;flex-direction:column}.rb-plan-actions{width:100%;justify-content:stretch}.rb-plan-actions button{flex:1}}
`;
    document.head.appendChild(s);
  }
  function todayKey(){const d=new Date();if(d.getHours()<6)d.setDate(d.getDate()-1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function day(){try{return String(selectedDay||'all')}catch{return'all'}}
  function mode(v){if(!v||v==='all')return'week';const t=todayKey();return v<t?'past':v>t?'future':'today'}
  function planKey(v){try{return`rbDailyPlan:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}:${String(v)}`}catch{return''}}
  function plan(v){try{const x=window.rbPlannedLineup?.(v);if(x)return{...x.plan,starters:x.starters};const raw=localStorage.getItem(planKey(v));const p=raw?JSON.parse(raw):null;return p&&Array.isArray(p.starters)?p:null}catch{return null}}
  function actual(){try{const m=typeof matchup==='function'?matchup(selectedRoster):null;return Array.isArray(m?.starters)?m.starters.map(String):[]}catch{return[]}}
  function pname(id){try{return String((typeof player==='function'?player(id):currentData?.players?.[String(id)])?.full_name||id)}catch{return String(id)}}
  function row(id){if(!id||id==='0')return null;try{return document.querySelector(`#teamView .player-row[data-rb-player-id="${CSS.escape(String(id))}"]`)}catch{return null}}
  function slotName(index,outRow){const slot=outRow?.querySelector('.slot');return String(slot?.textContent||`Starter ${index+1}`).trim()}
  function clear(){
    document.querySelectorAll('#teamView .player-row.rb-plan-in,#teamView .player-row.rb-plan-out,#teamView .player-row.rb-plan-move').forEach(r=>r.classList.remove('rb-plan-in','rb-plan-out','rb-plan-move'));
    document.querySelectorAll('#teamView .rb-plan-badge').forEach(x=>x.remove());
    document.getElementById('rbPlanBanner')?.remove();
    const old=document.getElementById('rbApplyDailyPlan');if(old)old.style.display='';
  }
  function addBadge(r,text,cls){if(!r)return;r.classList.add(cls);const n=r.querySelector('.pname')||r.querySelector('.player-copy')||r;const b=document.createElement('span');b.className='rb-plan-badge';b.textContent=text;n.appendChild(b)}
  function dismissKey(v,p){try{return`rbPlanDismiss:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}:${v}:${String(p?.savedAt||0)}`}catch{return''}}
  function fmt(v){try{return new Date(`${v}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}catch{return v}}
  function changes(p){
    const a=actual(),b=(p?.starters||[]).map(String),out=[];const n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++){const x=String(a[i]??'0'),y=String(b[i]??'0');if(x!==y)out.push({i,outId:x,inId:y})}
    return{a,b,out};
  }
  function decorateRows(p){
    const {out}=changes(p);if(!out.length)return out;
    const outgoing=new Map(),incoming=new Map();
    for(const c of out){if(c.outId!=='0')outgoing.set(c.outId,c);if(c.inId!=='0')incoming.set(c.inId,c)}
    const ids=new Set([...outgoing.keys(),...incoming.keys()]);
    ids.forEach(id=>{
      const r=row(id);if(!r)return;
      const isOut=outgoing.has(id),isIn=incoming.has(id);
      if(isOut&&isIn){const c=incoming.get(id);addBadge(r,`PLANNED MOVE → ${slotName(c.i,row(c.outId))}`,'rb-plan-move')}
      else if(isIn){const c=incoming.get(id);addBadge(r,`PLANNED IN → ${slotName(c.i,row(c.outId))}`,'rb-plan-in')}
      else addBadge(r,'PLANNED OUT','rb-plan-out');
    });
    return out;
  }
  function banner(v,p,out){
    if(!out.length)return;
    const m=mode(v);if(m!=='future'&&m!=='today')return;
    if(m==='today'&&sessionStorage.getItem(dismissKey(v,p))==='1')return;
    const host=document.querySelector('#teamView .editor-bar')?.parentElement||document.querySelector('#teamView .team-card')||document.getElementById('teamView');if(!host)return;
    const el=document.createElement('div');el.id='rbPlanBanner';if(m==='today')el.classList.add('rb-plan-ready');
    const summary=p.summary||out.map(c=>`${pname(c.outId)} → ${pname(c.inId)}`).join(', ');
    el.innerHTML=`<div class="rb-plan-copy"><div class="rb-plan-kicker">${m==='today'?'PLAN READY — NOT APPLIED':'PLAN SAVED'}</div><div class="rb-plan-title">${m==='today'?`Planned lineup changes for today are waiting for you`:`Planned lineup for ${fmt(v)}`}</div><div class="rb-plan-sub">${summary}. ${m==='today'?'Your current Sleeper lineup is still active so existing lock opportunities are preserved until you choose Apply Plan.':'Sleeper lineup is unchanged. This plan will never auto-apply.'}</div></div><div class="rb-plan-actions">${m==='today'?'<button type="button" class="rb-plan-keep">Keep Current Lineup</button><button type="button" class="rb-plan-apply">Review Plan</button>':'<button type="button" class="rb-plan-keep">Keep Current Lineup</button>'}</div>`;
    const editor=document.querySelector('#teamView .editor-bar');if(editor&&editor.parentElement)editor.insertAdjacentElement('afterend',el);else host.prepend(el);
    const tiny=document.getElementById('rbApplyDailyPlan');if(tiny&&m==='today')tiny.style.display='none';
    el.querySelector('.rb-plan-keep')?.addEventListener('click',()=>{
      if(m==='today')sessionStorage.setItem(dismissKey(v,p),'1');
      el.remove();if(tiny)tiny.style.display='';
      try{if(typeof setStatus==='function')setStatus(m==='today'?'Kept current Sleeper lineup. Saved plan is still available to apply later.':'Saved plan remains available; Sleeper lineup is unchanged.','success')}catch{}
    });
    el.querySelector('.rb-plan-apply')?.addEventListener('click',()=>{
      const btn=document.getElementById('rbApplyDailyPlan');if(btn){btn.style.display='';btn.click()}else try{if(typeof setStatus==='function')setStatus('Planned lineup apply control is not available yet.','error')}catch{}
    });
  }
  let pending=false;
  function decorate(){
    pending=false;clear();const v=day(),p=plan(v);if(!p)return;const out=decorateRows(p);banner(v,p,out);
  }
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(decorate)}
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbPlanUx){const base=renderTeam;const wrapped=function(...args){const out=base.apply(this,args);schedule();return out};wrapped.__rbPlanUx=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}}
  }catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('#teamView .day-btn,#teamView .tab,#commitSwap,#rbApplyDailyPlan'))setTimeout(schedule,0)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='weekSel'||e.target?.id==='teamPicker')setTimeout(schedule,0)},true);
  window.addEventListener('focus',schedule);
  addStyle();setTimeout(schedule,0);setTimeout(schedule,150);
})();
