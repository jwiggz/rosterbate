(()=>{
const css=`
#teamView .rb-inline-toolbar label:has(.rb-inline-sort),
#teamView .rb-inline-sort,
#teamView .rb-inline-dir{display:none!important}
#teamView .rb-inline-head-grid button{pointer-events:none!important;cursor:default!important;background:transparent!important;color:#8e9aae!important}
#teamView .rb-stat-sort-mark{display:none!important}
`;
function addStyle(){if(document.getElementById('rbRosterOrderStyle'))return;const s=document.createElement('style');s.id='rbRosterOrderStyle';s.textContent=css;document.head.appendChild(s)}
function n(v,f=9999){const x=Number(v);return Number.isFinite(x)?x:f}
function rowPlayerId(row){return String(row?.dataset?.rbPlayerId||'')}
function starterOrder(){
  try{
    const m=typeof matchup==='function'?matchup(selectedRoster):null;
    const starters=Array.isArray(m?.starters)?m.starters.map(String):[];
    const map=new Map();starters.forEach((id,i)=>map.set(id,i));return map;
  }catch{return new Map()}
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
  const starters=starterOrder();
  const bench=card.querySelector('.bench');
  const ir=card.querySelector('.ir-list');
  const benchLabel=bench?.previousElementSibling||null;
  const irLabel=ir?.previousElementSibling||null;
  const starterRows=[...card.children].filter(x=>x.classList?.contains('player-row'));
  starterRows.sort((a,b)=>{
    const ai=starters.has(rowPlayerId(a))?starters.get(rowPlayerId(a)):n(a.dataset.rbOriginalOrder);
    const bi=starters.has(rowPlayerId(b))?starters.get(rowPlayerId(b)):n(b.dataset.rbOriginalOrder);
    return ai-bi;
  });
  if(benchLabel) starterRows.forEach(r=>card.insertBefore(r,benchLabel));
  orderRows(bench);
  orderRows(ir);
  // IR is always the final roster section.
  if(ir){
    if(irLabel&&irLabel.parentElement===card) card.appendChild(irLabel);
    if(ir.parentElement===card) card.appendChild(ir);
  }
}
addStyle();
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(enforce,30)};
const root=document.getElementById('teamView');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
setTimeout(enforce,120);window.addEventListener('focus',enforce);
})();