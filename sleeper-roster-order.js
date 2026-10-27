(()=>{
const css=`
#teamView .rb-inline-toolbar label:has(.rb-inline-sort),
#teamView .rb-inline-sort,
#teamView .rb-inline-dir{display:none!important}
#teamView .rb-inline-head-grid button{pointer-events:none!important;cursor:default!important;background:transparent!important;color:#8e9aae!important}
#teamView .rb-stat-sort-mark{display:none!important}
#teamView .player-row.rb-slot-pinned{cursor:not-allowed!important}
#teamView .day-btn.rb-has-plan{box-shadow:inset 0 -2px 0 #f3c75b!important}
#teamView .day-btn.rb-has-plan::after{content:'PLAN';display:block;margin-top:2px;color:#f3c75b;font-size:6px;font-weight:900;letter-spacing:.05em}
#teamView #rbApplyDailyPlan{margin-left:6px;background:#0a8e93;border-color:#0db4ba;color:#ecffff}
`;
function addStyle(){if(document.getElementById('rbRosterOrderStyle'))return;const s=document.createElement('style');s.id='rbRosterOrderStyle';s.textContent=css;document.head.appendChild(s)}
function n(v,f=9999){const x=Number(v);return Number.isFinite(x)?x:f}
function rowPlayerId(row){return String(row?.dataset?.rbPlayerId||'')}
function currentStarters(){
  try{const m=typeof matchup==='function'?matchup(selectedRoster):null;return Array.isArray(m?.starters)?m.starters.map(String):[]}catch{return[]}
}
function pinKey(){
  try{return `rbLockedSlots:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`}catch{return'rbLockedSlots:unknown'}
}
function readPins(){
  try{const raw=sessionStorage.getItem(pinKey());const obj=raw?JSON.parse(raw):{};return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{}}catch{return{}}
}
function writePins(pins){try{sessionStorage.setItem(pinKey(),JSON.stringify(pins))}catch{}}
function hasDirectLock(pid){
  try{
    if(!lockedGames||typeof lockedGames!=='object')return false;
    const v=lockedGames[String(pid)];
    return v!==undefined&&v!==null&&String(v)!=='';
  }catch{return false}
}
function capturePins(){
  const starters=currentStarters();if(!starters.length)return readPins();
  const pins=readPins();let changed=false;
  starters.forEach((pid,index)=>{
    if(pid==='0')return;
    const row=document.querySelector(`#teamView .player-row[data-rb-player-id="${CSS.escape(pid)}"]`);
    const locked=hasDirectLock(pid)||row?.classList.contains('locked-in')||false;
    if(locked&&pins[pid]===undefined){pins[pid]=index;changed=true}
  });
  if(changed)writePins(pins);
  return pins;
}
function starterOrder(){
  const starters=currentStarters();
  const pins=capturePins();
  const ordered=starters.slice();
  for(const [pid,slotRaw] of Object.entries(pins)){
    const from=ordered.indexOf(String(pid));
    if(from<0)continue;
    const slot=Math.max(0,Math.min(ordered.length-1,Number(slotRaw)||0));
    ordered.splice(from,1);
    ordered.splice(slot,0,String(pid));
  }
  const map=new Map();ordered.forEach((id,i)=>map.set(id,i));return{map,pins};
}
function orderRows(container,orderMap=null){
  if(!container)return;
  const rows=[...container.children].filter(x=>x.classList?.contains('player-row'));
  rows.sort((a,b)=>{
    if(orderMap){
      const ai=orderMap.has(rowPlayerId(a))?orderMap.get(rowPlayerId(a)):n(a.dataset.rbOriginalOrder);
      const bi=orderMap.has(rowPlayerId(b))?orderMap.get(rowPlayerId(b)):n(b.dataset.rbOriginalOrder);
      return ai-bi;
    }
    return n(a.dataset.rbOriginalOrder)-n(b.dataset.rbOriginalOrder);
  }).forEach(r=>container.appendChild(r));
}
function neutralizeStatsHeader(){
  document.querySelectorAll('#teamView .rb-inline-head-grid button').forEach(btn=>{
    const span=document.createElement('span');
    span.textContent=btn.textContent.replace(/[▼▲]/g,'').trim();
    span.style.cssText='display:flex;align-items:center;justify-content:center;color:#8e9aae;font-size:8px;font-weight:900;text-transform:uppercase;padding:3px 2px';
    btn.replaceWith(span);
  });
  document.querySelector('#teamView .rb-inline-sort')?.closest('label')?.remove();
  document.querySelector('#teamView .rb-inline-dir')?.remove();
}
function enforce(){
  const card=document.querySelector('#teamView .team-card');if(!card)return;
  neutralizeStatsHeader();
  const {map:starters,pins}=starterOrder();
  const bench=card.querySelector('.bench');
  const ir=card.querySelector('.ir-list');
  const benchLabel=bench?.previousElementSibling||null;
  const irLabel=ir?.previousElementSibling||null;
  const starterRows=[...card.children].filter(x=>x.classList?.contains('player-row'));
  starterRows.forEach(row=>row.classList.toggle('rb-slot-pinned',pins[rowPlayerId(row)]!==undefined));
  starterRows.sort((a,b)=>{
    const ai=starters.has(rowPlayerId(a))?starters.get(rowPlayerId(a)):n(a.dataset.rbOriginalOrder);
    const bi=starters.has(rowPlayerId(b))?starters.get(rowPlayerId(b)):n(b.dataset.rbOriginalOrder);
    return ai-bi;
  });
  if(benchLabel) starterRows.forEach(r=>card.insertBefore(r,benchLabel));
  orderRows(bench);
  orderRows(ir);
  if(ir){
    if(irLabel&&irLabel.parentElement===card) card.appendChild(irLabel);
    if(ir.parentElement===card) card.appendChild(ir);
  }
}
function todayKey(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return`${y}-${m}-${day}`}
function dayMode(day){if(!day||day==='all')return'week';const today=todayKey();if(day<today)return'past';if(day>today)return'future';return'today'}
function planKey(day){try{return`rbDailyPlan:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}:${String(day)}`}catch{return''}}
function readPlan(day){try{const raw=localStorage.getItem(planKey(day));const p=raw?JSON.parse(raw):null;return p&&Array.isArray(p.starters)?p:null}catch{return null}}
function writePlan(day,plan){try{localStorage.setItem(planKey(day),JSON.stringify(plan));return true}catch{return false}}
function removePlan(day){try{localStorage.removeItem(planKey(day))}catch{}}
function selectedDayValue(){try{return String(selectedDay||'all')}catch{return'all'}}
function planSummary(){try{if(!pendingSwap)return'';const out=pendingSwap.outId==='0'?'Empty slot':player(pendingSwap.outId).full_name,inn=player(pendingSwap.inId).full_name;return`${out} → ${inn}`}catch{return'Planned lineup change'}}
function saveFuturePlan(){
  const day=selectedDayValue();if(dayMode(day)!=='future'||!pendingSwap)return false;
  const ok=writePlan(day,{starters:pendingSwap.after.map(String),summary:planSummary(),savedAt:Date.now()});
  try{closeModal();clearSelection();renderTeam();renderActivity();setStatus(ok?`Planned for ${day}: ${planSummary()}. Sleeper will not be changed until you apply it that day.`:'Unable to save planned lineup.','success')}catch{}
  setTimeout(refreshPlannerUi,0);return ok;
}
async function applyTodayPlan(){
  const day=selectedDayValue();if(dayMode(day)!=='today')return;const plan=readPlan(day);if(!plan)return;
  const btn=document.getElementById('rbApplyDailyPlan');if(btn){btn.disabled=true;btn.textContent='Applying…'}
  try{
    if(typeof setStatus==='function')setStatus(`Applying planned ${day} lineup to Sleeper…`);
    if(typeof writeLineup!=='function')throw new Error('Sleeper lineup writer is unavailable.');
    await writeLineup(plan.starters,plan.summary||`Planned lineup for ${day}`);
    removePlan(day);
    if(typeof clearSelection==='function')clearSelection();
    if(typeof load==='function')await load(true);
    if(typeof setStatus==='function')setStatus(`Applied planned lineup on Sleeper for ${day}.`,'success');
  }catch(e){if(typeof setStatus==='function')setStatus(e?.message||String(e),'error');if(btn){btn.disabled=false;btn.textContent='Apply Planned Lineup'}}
  setTimeout(refreshPlannerUi,0);
}
function decorateSwapModal(){
  const btn=document.getElementById('commitSwap');if(!btn)return;
  const mode=dayMode(selectedDayValue());
  const modal=btn.closest('.modal');const p=modal?.querySelector('.modal-body p');const warning=modal?.querySelector('.warning');
  if(mode==='future'){
    btn.textContent='Save Plan';
    if(p)p.innerHTML=`This saves a <strong>RosterBate plan</strong> for ${selectedDayValue()}. Sleeper has no future daily lineup, so nothing is sent yet.`;
    if(warning)warning.textContent='Open RosterBate on that date and apply the planned lineup before the relevant games begin.';
  }else if(mode==='past'){
    btn.textContent='Past Day';btn.disabled=true;
    if(p)p.textContent='Past-day starter changes cannot be sent to Sleeper.';
  }
}
function markPlans(){
  document.querySelectorAll('#teamView .day-btn[data-day]').forEach(btn=>btn.classList.toggle('rb-has-plan',!!readPlan(btn.dataset.day)));
}
function refreshPlannerUi(){
  markPlans();
  document.getElementById('rbApplyDailyPlan')?.remove();
  const day=selectedDayValue(),plan=readPlan(day);if(dayMode(day)!=='today'||!plan)return;
  const bar=document.querySelector('#teamView .editor-bar');if(!bar)return;
  const b=document.createElement('button');b.id='rbApplyDailyPlan';b.className='mini-btn';b.textContent='Apply Planned Lineup';b.title=plan.summary||'Apply saved lineup plan to Sleeper';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();applyTodayPlan()});
  const spacer=bar.querySelector('.spacer');spacer?bar.insertBefore(b,spacer):bar.appendChild(b);
}
addStyle();
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{enforce();refreshPlannerUi()},30)};
const root=document.getElementById('teamView');
if(root){
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  root.addEventListener('click',e=>{
    const row=e.target.closest?.('.player-row.rb-slot-pinned');
    if(!row)return;
    e.preventDefault();
    e.stopPropagation();
  },true);
}
document.addEventListener('click',e=>{
  const commit=e.target.closest?.('#commitSwap');
  if(commit&&dayMode(selectedDayValue())==='future'){
    e.preventDefault();e.stopImmediatePropagation();saveFuturePlan();return;
  }
  if(e.target.closest?.('[data-bench-id]'))setTimeout(decorateSwapModal,0);
  if(e.target.closest?.('.day-btn[data-day]'))setTimeout(refreshPlannerUi,0);
},true);
setTimeout(()=>{enforce();refreshPlannerUi()},120);setTimeout(()=>{enforce();refreshPlannerUi()},650);window.addEventListener('focus',()=>{enforce();refreshPlannerUi()});
})();