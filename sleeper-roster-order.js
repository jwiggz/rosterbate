(()=>{
const css=`
#teamView .rb-inline-toolbar label:has(.rb-inline-sort),
#teamView .rb-inline-sort,
#teamView .rb-inline-dir{display:none!important}
#teamView .rb-inline-head-grid button{pointer-events:none!important;cursor:default!important;background:transparent!important;color:#8e9aae!important}
#teamView .rb-stat-sort-mark{display:none!important}
#teamView .player-row.rb-slot-pinned{cursor:not-allowed!important}
#teamView .player-row.rb-bench-selected{outline:1px solid #08c7c9!important;outline-offset:-1px!important;background:#203d47!important;opacity:1!important}
#teamView .day-btn.rb-has-plan{box-shadow:inset 0 -2px 0 #f3c75b!important}
#teamView .day-btn.rb-has-plan::after{content:'PLAN';display:block;margin-top:2px;color:#f3c75b;font-size:6px;font-weight:900;letter-spacing:.05em}
#teamView #rbApplyDailyPlan{margin-left:6px;background:#0a8e93;border-color:#0db4ba;color:#ecffff}
/* Never paint Sleeper's raw starter ordering. The direct starter rows are revealed
   only after the canonical order pass has run, preventing the UTIL-first snap. */
#teamView .team-card:not(.rb-order-ready) > .player-row{visibility:hidden!important}
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
  });
  const current=[...container.children].filter(x=>x.classList?.contains('player-row'));
  if(rows.every((r,i)=>r===current[i]))return;
  rows.forEach(r=>container.appendChild(r));
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
  starterRows.forEach(row=>{const want=pins[rowPlayerId(row)]!==undefined;if(row.classList.contains('rb-slot-pinned')!==want)row.classList.toggle('rb-slot-pinned',want)});
  const domStarters=starterRows.slice();
  starterRows.sort((a,b)=>{
    const ai=starters.has(rowPlayerId(a))?starters.get(rowPlayerId(a)):n(a.dataset.rbOriginalOrder);
    const bi=starters.has(rowPlayerId(b))?starters.get(rowPlayerId(b)):n(b.dataset.rbOriginalOrder);
    return ai-bi;
  });
  // Only move rows when they are out of order, and only if they sit directly before the bench.
  const inOrder=starterRows.every((r,i)=>r===domStarters[i])&&(!benchLabel||!starterRows.length||starterRows[starterRows.length-1].nextElementSibling===benchLabel);
  if(benchLabel&&!inOrder) starterRows.forEach(r=>card.insertBefore(r,benchLabel));
  orderRows(bench);
  orderRows(ir);
  if(ir){
    if(ir.parentElement===card&&card.lastElementChild!==ir){
      if(irLabel&&irLabel.parentElement===card) card.appendChild(irLabel);
      card.appendChild(ir);
    }
  }
  if(!card.classList.contains('rb-order-ready'))card.classList.add('rb-order-ready');
}
function todayKey(){const d=new Date();if(d.getHours()<6)d.setDate(d.getDate()-1);const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return`${y}-${m}-${day}`}
function dayMode(day){if(!day||day==='all')return'week';const today=todayKey();if(day<today)return'past';if(day>today)return'future';return'today'}
function planKey(day){try{return`rbDailyPlan:${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}:${String(day)}`}catch{return''}}
function readPlan(day){try{const raw=localStorage.getItem(planKey(day));const p=raw?JSON.parse(raw):null;return p&&(Array.isArray(p.swaps)||Array.isArray(p.starters))?p:null}catch{return null}}
function currentStarters(){try{const m=matchup(selectedRoster);return(m?.starters||[]).map(String)}catch{return[]}}
// Older plans saved a whole starter array; convert to the swaps it implies.
function planSwaps(p){if(!p)return[];if(Array.isArray(p.swaps))return p.swaps.map(s=>({index:Number(s.index),outId:String(s.outId),inId:String(s.inId),summary:s.summary||''}));const cur=currentStarters(),want=(p.starters||[]).map(String),out=[];want.forEach((id,i)=>{if(String(cur[i]??'0')!==id)out.push({index:i,outId:String(cur[i]??'0'),inId:id,summary:''})});return out}
// Apply swaps to a lineup by player id (not slot position) so other changes since planning survive.
function applySwaps(starters,swaps){const arr=starters.slice(),applied=[],skipped=[];for(const s of swaps){let idx=s.outId!=='0'?arr.indexOf(s.outId):(String(arr[s.index]??'')==='0'?s.index:-1);if(idx<0){skipped.push({...s,why:'out-moved'});continue}if(arr.includes(s.inId)){skipped.push({...s,why:'in-starting'});continue}arr[idx]=s.inId;applied.push({...s,index:idx})}return{starters:arr,applied,skipped}}
window.rbPlannedLineup=day=>{const p=readPlan(day);if(!p)return null;const swaps=planSwaps(p);return{plan:p,swaps,...applySwaps(currentStarters(),swaps)}};
function writePlan(day,plan){try{localStorage.setItem(planKey(day),JSON.stringify(plan));return true}catch{return false}}
function removePlan(day){try{localStorage.removeItem(planKey(day))}catch{}}
function selectedDayValue(){try{return String(selectedDay||'all')}catch{return'all'}}
function planSummary(){try{if(!pendingSwap)return'';const out=pendingSwap.outId==='0'?'Empty slot':player(pendingSwap.outId).full_name,inn=player(pendingSwap.inId).full_name;return`${out} → ${inn}`}catch{return'Planned lineup change'}}
function saveFuturePlan(){
  const day=selectedDayValue();if(dayMode(day)!=='future'||!pendingSwap)return false;
  // Add this swap to any swaps already planned for the day (planning never touches Sleeper).
  const swaps=planSwaps(readPlan(day)).filter(s=>s.outId!==String(pendingSwap.outId)&&s.inId!==String(pendingSwap.inId));
  swaps.push({index:Number(pendingSwap.index),outId:String(pendingSwap.outId),inId:String(pendingSwap.inId),summary:planSummary()});
  const ok=writePlan(day,{version:2,swaps,summary:swaps.map(s=>s.summary).filter(Boolean).join(', '),savedAt:Date.now()});
  try{closeModal();clearSelection();renderTeam();renderActivity();setStatus(ok?`Planned for ${day}: ${planSummary()}. Sleeper will not be changed until you apply it that day.`:'Unable to save planned lineup.','success')}catch{}
  setTimeout(refreshPlannerUi,0);return ok;
}
function swapChecks(sw,today){
  // Why a planned swap can't (or shouldn't) be applied right now.
  const p=id=>{try{return player(id)}catch{return{}}};const outP=p(sw.outId),inP=p(sw.inId);
  const gameOn=(id)=>{try{return gameForTeam(p(id).team,today)}catch{return null}};
  const started=g=>!!g&&String(g.status||'pre_game')!=='pre_game';
  const out={block:'',warn:'',lockable:null};
  const t=(()=>{try{return team(selectedRoster)}catch{return null}})();
  if(sw.inId!=='0'&&!(t?.players||[]).map(String).includes(sw.inId))out.block=`${inP.full_name||'That player'} is no longer on your roster.`;
  else if(sw.outId!=='0'&&!currentStarters().includes(sw.outId))out.block=`${outP.full_name||'That player'} is no longer in your starting lineup.`;
  else if(currentStarters().includes(sw.inId))out.block=`${inP.full_name||'That player'} is already starting.`;
  else if(sw.outId!=='0'&&(()=>{try{return !!lockedGames?.[sw.outId]}catch{return false}})())out.block=`${outP.full_name} is locked in for this week and can't be moved.`;
  else if(sw.outId!=='0'&&started(gameOn(sw.outId)))out.block=`${outP.full_name}'s game today has already started.`;
  else if(started(gameOn(sw.inId)))out.block=`${inP.full_name}'s game today has already started.`;
  if(out.block||sw.outId==='0')return out;
  // Benching a starter gives up locking his latest completed game if it's still lockable.
  try{
    const games=(currentData?.schedule||[]).filter(g=>!g.calendar_only&&(g.home===outP.team||g.away===outP.team)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const done=games.filter(g=>String(g.status)==='complete');const last=done[done.length-1];
    if(last){const next=games.find(g=>String(g.date)>String(last.date));const nextStarted=!!next&&started(next);
      if(!nextStarted){const v=window.rbLockedGameScore?.(sw.outId,last.game_id);out.lockable={date:last.date,score:Number.isFinite(v)?v:null};
        out.warn=`${outP.full_name} scored ${Number.isFinite(v)?v.toFixed(1)+' FPTS':'(score loading…)'} in his last game (${last.date}) and that game can still be locked in. Benching him now gives up that lock.`}}
  }catch{}
  return out;
}
function reviewHtml(day,plan){
  const rows=plan.swaps.map((sw,i)=>{const c=swapChecks(sw,day);const nm=id=>id==='0'?'Empty slot':esc(player(id).full_name||id);const proj=id=>id==='0'?'—':projectionText(id,day);
    const checked=!c.block&&!c.lockable;
    return`<label class="rb-plan-review-row ${c.block?'blocked':''}" style="display:grid;grid-template-columns:20px 1fr;gap:8px;padding:9px 0;border-top:1px solid rgba(255,255,255,.07)"><input type="checkbox" data-plan-swap="${i}" ${checked?'checked':''} ${c.block?'disabled':''}><span><strong>${nm(sw.outId)}</strong> <span style="color:#ff9aa9">OUT</span> (proj ${proj(sw.outId)}) → <strong>${nm(sw.inId)}</strong> <span style="color:#78efd3">IN</span> (proj ${proj(sw.inId)})${c.block?`<div style="color:#ff9aa9;font-size:10px;margin-top:3px">Can't apply: ${esc(c.block)}</div>`:''}${c.warn?`<div style="color:#f3d589;font-size:10px;margin-top:3px">⚠ ${esc(c.warn)}</div>`:''}</span></label>`}).join('');
  return`<p>Review the lineup you planned for <strong>${esc(day)}</strong>. Nothing is sent to Sleeper until you confirm. Swaps are applied to your <strong>current</strong> lineup.</p><div>${rows}</div>`;
}
function applyTodayPlan(){
  const day=selectedDayValue();if(dayMode(day)!=='today')return;const plan=window.rbPlannedLineup(day);if(!plan||!plan.swaps.length){removePlan(day);setTimeout(refreshPlannerUi,0);return}
  const open=()=>{showModal('Review Planned Lineup',reviewHtml(day,plan),`<button data-close>Keep Current Lineup</button><button id="rbDiscardPlan" class="danger">Discard Plan</button><button id="rbConfirmPlan" class="primary">Apply Selected</button>`);
    setTimeout(()=>{
      const sync=()=>{const n=document.querySelectorAll('[data-plan-swap]:checked').length;const b=document.getElementById('rbConfirmPlan');if(b){b.disabled=!n;b.textContent=n?`Apply ${n} Change${n===1?'':'s'}`:'Nothing Selected'}};
      document.querySelectorAll('[data-plan-swap]').forEach(x=>x.addEventListener('change',sync));sync();
      document.getElementById('rbDiscardPlan')?.addEventListener('click',()=>{removePlan(day);try{closeModal()}catch{}setStatus('Planned lineup discarded. Your Sleeper lineup is unchanged.','success');setTimeout(refreshPlannerUi,0);try{renderTeam()}catch{}});
      document.getElementById('rbConfirmPlan')?.addEventListener('click',async e=>{
        const btn=e.currentTarget;const pick=[...document.querySelectorAll('[data-plan-swap]:checked')].map(x=>plan.swaps[Number(x.dataset.planSwap)]).filter(sw=>!swapChecks(sw,day).block);
        if(!pick.length)return;btn.disabled=true;btn.textContent='Applying…';
        try{const {starters,applied}=applySwaps(currentStarters(),pick);if(!applied.length)throw new Error('Nothing left to apply — your lineup already changed.');
          setStatus(`Applying planned ${day} lineup to Sleeper…`);await writeLineup(starters,applied.map(s=>s.summary||`${player(s.outId).full_name} → ${player(s.inId).full_name}`).join(', '));
          const left=plan.swaps.filter(sw=>!applied.some(a=>a.outId===sw.outId&&a.inId===sw.inId));
          if(left.length)writePlan(day,{version:2,swaps:left,summary:left.map(s=>s.summary).filter(Boolean).join(', '),savedAt:Date.now()});else removePlan(day);
          try{closeModal()}catch{}if(typeof clearSelection==='function')clearSelection();if(typeof load==='function')await load(true);
          setStatus(`Applied ${applied.length} planned change${applied.length===1?'':'s'} on Sleeper.${left.length?` ${left.length} still planned.`:''}`,'success');
        }catch(err){setStatus(err?.message||String(err),'error');btn.disabled=false;sync()}
        setTimeout(refreshPlannerUi,0);
      });
    },0)};
  try{window.rbRequestLockedScores?.(plan.swaps.map(s=>s.outId).filter(x=>x!=='0'))}catch{}
  open();
  // Refresh the review (keeping your checkbox choices) as last-game scores arrive.
  const again=()=>{const modal=document.getElementById('rbConfirmPlan');if(!modal){window.removeEventListener('rb:locked-scores',again);return}const keep=new Map([...document.querySelectorAll('[data-plan-swap]')].map(x=>[x.dataset.planSwap,x.checked]));open();setTimeout(()=>{for(const [i,v] of keep){const x=document.querySelector(`[data-plan-swap="${i}"]`);if(x&&!x.disabled){x.checked=v;x.dispatchEvent(new Event('change',{bubbles:true}))}}},0)};
  window.addEventListener('rb:locked-scores',again);
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
  const b=document.createElement('button');b.id='rbApplyDailyPlan';b.className='mini-btn';b.textContent='Review Planned Lineup';b.title=plan.summary||'Review your planned lineup before anything is sent to Sleeper';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();applyTodayPlan()});
  const spacer=bar.querySelector('.spacer');spacer?bar.insertBefore(b,spacer):bar.appendChild(b);
}

let benchFirstId=null;
let optimistic=null;
function clearBenchFirst(){
  benchFirstId=null;
  document.querySelectorAll('#teamView .player-row.rb-bench-selected').forEach(r=>r.classList.remove('rb-bench-selected'));
}
window.rbBenchFirst=()=>benchFirstId;window.rbClearBenchFirst=()=>clearBenchFirst();
function selectBenchFirst(id,row){
  benchFirstId=String(id||'');
  document.querySelectorAll('#teamView .player-row.rb-bench-selected').forEach(r=>r.classList.remove('rb-bench-selected'));
  row?.classList.add('rb-bench-selected');
  try{window.dispatchEvent(new CustomEvent('rb:lineup-selection'))}catch{}
  try{const p=player(benchFirstId);setStatus(`Selected ${p.full_name||'bench player'} — choose the starter slot to replace.`)}catch{}
}
function applyLocalStarters(starters){
  try{
    const m=matchup(selectedRoster);
    if(m&&Array.isArray(starters)){m.starters=starters.map(String)}
    optimistic={leagueId:String(leagueId),rosterId:Number(selectedRoster),week:Number(selectedWeek),starters:(starters||[]).map(String),until:Date.now()+12000};
    if(typeof renderTeam==='function')renderTeam();
    if(typeof renderActivity==='function')renderActivity();
  }catch{}
}
function reapplyOptimistic(){
  try{
    if(!optimistic||Date.now()>optimistic.until){optimistic=null;return}
    if(String(leagueId)!==optimistic.leagueId||Number(selectedRoster)!==optimistic.rosterId||Number(selectedWeek)!==optimistic.week)return;
    const m=matchup(selectedRoster);if(!m)return;
    const now=(m.starters||[]).map(String),want=optimistic.starters;
    if(JSON.stringify(now)!==JSON.stringify(want)){
      m.starters=want.slice();
      if(typeof renderTeam==='function')renderTeam();
      if(typeof renderActivity==='function')renderActivity();
    }
  }catch{}
}

try{
  if(typeof writeLineup==='function'){
    const rbOriginalWriteLineup=writeLineup;
    writeLineup=async function(starters,...args){
      const data=await rbOriginalWriteLineup.call(this,starters,...args);
      applyLocalStarters(starters);
      return data;
    };
  }
  if(typeof load==='function'){
    const rbOriginalLoad=load;
    load=async function(...args){
      const out=await rbOriginalLoad.apply(this,args);
      reapplyOptimistic();
      return out;
    };
  }
}catch{}

addStyle();
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{enforce();refreshPlannerUi();reapplyOptimistic()},0)};
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
    e.preventDefault();e.stopImmediatePropagation();saveFuturePlan();clearBenchFirst();return;
  }

  const benchRow=e.target.closest?.('#teamView [data-bench-id]');
  if(benchRow){
    const id=benchRow.dataset.benchId;
    if(typeof selectedStarterIndex!=='undefined'&&selectedStarterIndex==null){
      if(dayMode(selectedDayValue())==='past')return;
      e.preventDefault();e.stopImmediatePropagation();
      selectBenchFirst(id,benchRow);
      return;
    }
    setTimeout(decorateSwapModal,0);
  }

  const starterRow=e.target.closest?.('#teamView [data-starter-index]');
  if(starterRow&&benchFirstId){
    if(starterRow.classList.contains('rb-slot-pinned')||starterRow.classList.contains('locked-in')){
      e.preventDefault();e.stopImmediatePropagation();
      try{setStatus('That starter slot is locked for the week.','error')}catch{}
      return;
    }
    const idx=Number(starterRow.dataset.starterIndex);
    if(Number.isInteger(idx)){
      e.preventDefault();e.stopImmediatePropagation();
      try{
        selectedStarterIndex=idx;
        const id=benchFirstId;
        clearBenchFirst();
        prepareSwap(id);
        setTimeout(decorateSwapModal,0);
      }catch(err){try{setStatus(err?.message||String(err),'error')}catch{}}
      return;
    }
  }

  if(e.target.closest?.('.day-btn[data-day]')){clearBenchFirst();setTimeout(refreshPlannerUi,0)}
  if(e.target.closest?.('#cancelSelect'))clearBenchFirst();
},true);
setTimeout(()=>{enforce();refreshPlannerUi();reapplyOptimistic()},0);setTimeout(()=>{enforce();refreshPlannerUi();reapplyOptimistic()},120);window.addEventListener('focus',()=>{enforce();refreshPlannerUi();reapplyOptimistic()});
})();