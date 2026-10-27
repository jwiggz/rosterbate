(()=>{
const css=`
#teamView .rb-inline-toolbar label:has(.rb-inline-sort),
#teamView .rb-inline-sort,
#teamView .rb-inline-dir{display:none!important}
#teamView .rb-inline-head-grid button{pointer-events:none!important;cursor:default!important;background:transparent!important;color:#8e9aae!important}
#teamView .rb-stat-sort-mark{display:none!important}
#teamView .player-row.rb-slot-pinned{cursor:not-allowed!important}
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
addStyle();
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(enforce,30)};
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
setTimeout(enforce,120);setTimeout(enforce,650);window.addEventListener('focus',enforce);
})();