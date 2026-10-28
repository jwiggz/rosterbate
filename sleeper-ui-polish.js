(()=>{
const css=`
/* Pull season-stat cards closer to player info while keeping proj/pts on the right. */
#teamView .columns-head.rb-stats-cols,#teamView .player-row.rb-stats-row{grid-template-columns:42px minmax(215px,.72fr) minmax(690px,1.78fr) 70px 70px!important}
#teamView .rb-inline-head-grid,#teamView .rb-inline-stats{column-gap:7px!important}

/* Keep PROJ visually separated from the final fantasy-points result. */
#teamView .player-row.rb-stats-row > .proj{justify-self:center!important;transform:translateX(-12px)!important;text-align:center!important}
#teamView .columns-head.rb-stats-cols > :nth-last-child(2){justify-self:center!important;transform:translateX(-12px)!important;text-align:center!important}
#teamView .columns-head.rb-stats-cols > :last-child{justify-self:center!important;text-align:center!important;color:#80f0ca!important;font-weight:950!important}

/* Available lock buttons: yellow/gold decision state with a fast visible animated edge. */
@keyframes rbLockReadyEdge{
  0%{background-position:0 0,0% 50%;box-shadow:0 0 0 1px rgba(255,199,62,.28),0 0 7px rgba(255,198,61,.22)}
  50%{background-position:0 0,100% 50%;box-shadow:0 0 0 2px rgba(255,239,167,.62),0 0 16px rgba(255,205,71,.58)}
  100%{background-position:0 0,200% 50%;box-shadow:0 0 0 1px rgba(255,199,62,.28),0 0 7px rgba(255,198,61,.22)}
}
@keyframes rbLockReadyHover{
  0%{background-position:0 0,0% 50%;box-shadow:0 0 0 1px rgba(48,216,160,.48),0 0 10px rgba(48,216,160,.38)}
  50%{background-position:0 0,100% 50%;box-shadow:0 0 0 2px rgba(143,242,207,.88),0 0 22px rgba(48,216,160,.82)}
  100%{background-position:0 0,200% 50%;box-shadow:0 0 0 1px rgba(48,216,160,.48),0 0 10px rgba(48,216,160,.38)}
}
#teamView .player-row:not(.locked-in) .lock-btn{
  position:relative!important;box-sizing:border-box!important;width:82px!important;min-width:82px!important;height:28px!important;min-height:28px!important;margin-left:8px!important;margin-top:-1px!important;margin-bottom:-1px!important;padding:0 8px!important;border:1px solid transparent!important;border-radius:7px!important;color:#ffe9a6!important;font-size:9px!important;line-height:26px!important;font-weight:900!important;letter-spacing:.03em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;vertical-align:middle!important;gap:5px!important;white-space:nowrap!important;background:linear-gradient(#4a3b16,#4a3b16) padding-box,linear-gradient(110deg,#a8750d 0%,#e4b32f 22%,#fff7c8 43%,#fff0a1 50%,#ffd24f 58%,#dc9f17 76%,#a8750d 100%) border-box!important;background-size:100% 100%,240% 100%!important;animation:rbLockReadyEdge .9s linear infinite!important;transform:none!important
}
#teamView .player-row:not(.locked-in) .lock-btn:hover{color:#eafff7!important;border-color:transparent!important;background:linear-gradient(#17634e,#17634e) padding-box,linear-gradient(110deg,#238d69 0%,#30d8a0 22%,#d8fff0 43%,#9cf6d7 50%,#45e1ac 58%,#2aaa80 76%,#238d69 100%) border-box!important;background-size:100% 100%,240% 100%!important;animation:rbLockReadyHover .55s linear infinite!important}

/* Locked rows remain static; lock status now lives in the PTS pill instead of beside the player name. */
#teamView .lock-chip{display:none!important}
#teamView .player-row.locked-in .player-copy::before,#teamView .player-row.locked-in .player-copy::after,#teamView .player-row.locked-in .matchup-meta::before,#teamView .player-row.locked-in .matchup-meta::after{content:none!important;display:none!important;animation:none!important}
#teamView .player-row.locked-in{opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.12),rgba(48,216,160,.025) 55%,transparent)!important;box-shadow:inset 3px 0 0 rgba(48,216,160,.7)!important;animation:none!important;transform:none!important}
#teamView .player-row.locked-in .lock-btn{display:none!important;animation:none!important}

/* Make the far-right fantasy-point result read as the outcome of the row. */
#teamView .player-row.rb-stats-row > .pts{justify-self:center!important;align-self:center!important;box-sizing:border-box!important;width:54px!important;min-width:54px!important;height:34px!important;min-height:34px!important;padding:0 8px!important;border-radius:8px!important;border:1px solid rgba(48,216,160,.18)!important;background:linear-gradient(180deg,rgba(19,78,62,.42),rgba(9,43,35,.34))!important;color:#37efb2!important;font-size:13px!important;font-weight:950!important;line-height:1!important;text-align:center!important;text-shadow:0 0 8px rgba(55,239,178,.32)!important;box-shadow:inset 0 0 10px rgba(48,216,160,.045),0 1px 5px rgba(0,0,0,.14)!important;display:flex!important;align-items:center!important;justify-content:center!important;position:relative!important;overflow:visible!important}
#teamView .player-row.locked-in.rb-stats-row > .pts{width:68px!important;min-width:68px!important;height:42px!important;min-height:42px!important;padding:14px 7px 3px!important;border:2px solid #30d8a0!important;background:linear-gradient(180deg,rgba(20,95,73,.72),rgba(9,48,38,.62))!important;color:#7ff0ca!important;box-shadow:0 0 0 1px rgba(48,216,160,.18),0 0 14px rgba(48,216,160,.34),inset 0 0 12px rgba(48,216,160,.1)!important}
#teamView .player-row.locked-in.rb-stats-row > .pts::before{content:'LOCKED IN';position:absolute;top:4px;left:0;right:0;text-align:center;color:#b9ffe9;font-size:6px;font-weight:950;letter-spacing:.08em;line-height:1;text-shadow:0 0 5px rgba(48,216,160,.42)}

/* ALL / Week is a read-only Lock-In summary rather than a normal lineup-editing view. */
#teamView .team-card.rb-all-lock-summary .player-row:not(.locked-in){display:none!important}
#teamView .team-card.rb-all-lock-summary .bench,#teamView .team-card.rb-all-lock-summary .ir-list{display:none!important}
#teamView .team-card.rb-all-lock-summary .rb-hide-all-summary{display:none!important}
#teamView .team-card.rb-all-lock-summary .editor-bar{display:none!important}
#teamView .team-card.rb-all-lock-summary .section-label.rb-starters-label{color:#7ff0ca!important}

/* Empty IR capacity should look usable, not like a phantom player. */
#teamView .ir-list .rb-empty-ir-slot{opacity:.72!important;border-top:1px dashed rgba(239,102,128,.28)!important;background:linear-gradient(90deg,rgba(239,102,128,.055),rgba(39,39,53,.65))!important}
#teamView .ir-list .rb-empty-ir-slot .pname{color:#cfd8e5!important}
#teamView .ir-list .rb-empty-ir-slot .pmeta{color:#8693a7!important}

@media(max-width:1250px){#teamView .columns-head.rb-stats-cols,#teamView .player-row.rb-stats-row{grid-template-columns:38px minmax(190px,.68fr) minmax(590px,1.65fr) 60px 60px!important}#teamView .player-row.rb-stats-row > .proj,#teamView .columns-head.rb-stats-cols > :nth-last-child(2){transform:translateX(-8px)!important}#teamView .player-row.locked-in.rb-stats-row > .pts{width:60px!important;min-width:60px!important}}
`;
const params=new URLSearchParams(location.search);
const leagueId=String(params.get('league')||'');
const explicitWeek=String(params.get('week')||'');
const KNOWN_IR_CAPACITY={
  '1411477732390400000':3
};
function style(){if(document.getElementById('rbUiPolishStyle'))return;const s=document.createElement('style');s.id='rbUiPolishStyle';s.textContent=css;document.head.appendChild(s)}
function currentWeekKey(){const sel=document.getElementById('weekSel');return String(sel?.value||explicitWeek||'current')}
/* V2 intentionally ignores the old saved ALL default once, then resumes normal persistence. */
function dayKey(){return`rbSleeperDayV2:${leagueId||'league'}:${currentWeekKey()}`}
function irKey(){return`rbSleeperIrCapacity:${leagueId||'league'}`}
function localToday(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return`${y}-${m}-${day}`}
function rememberDay(day){if(!day)return;try{sessionStorage.setItem(dayKey(),String(day))}catch{}}
function arrangeDayStrip(){const strip=document.querySelector('#teamView .day-strip');if(!strip)return false;const all=strip.querySelector('.day-btn[data-day="all"]');if(all&&all!==strip.lastElementChild)strip.appendChild(all);return true}
function restoreDay(){
  try{
    const buttons=[...document.querySelectorAll('#teamView .day-btn[data-day]')];if(!buttons.length)return false;
    const saved=sessionStorage.getItem(dayKey());
    const wanted=saved||localToday();
    const target=buttons.find(b=>String(b.dataset.day)===String(wanted))||buttons.find(b=>String(b.dataset.day)===localToday())||buttons[0];
    if(!target)return false;
    if(target.classList.contains('active'))return true;
    target.click();return true;
  }catch{return false}
}
function configuredIrSlots(){
  let cached=0;try{cached=Number(sessionStorage.getItem(irKey())||0)||0}catch{}
  const known=Number(KNOWN_IR_CAPACITY[leagueId]||0)||0;
  const ir=document.querySelector('#teamView .ir-list');
  const visible=ir?[...ir.children].filter(x=>x.classList?.contains('player-row')).length:0;
  const target=Math.max(cached,known,visible);
  if(target){try{sessionStorage.setItem(irKey(),String(target))}catch{}}
  return target;
}
function normalizeRow(row){
  const name=row.querySelector('.pname');if(name)name.textContent=name.textContent.replace(/\s*\(locked\)\s*$/i,'').trim();
  if(!row.classList.contains('locked-in'))return;
  row.querySelectorAll('.lock-chip').forEach(x=>x.remove());
  row.querySelectorAll('.lock-btn').forEach(x=>x.remove());
  const pts=row.querySelector(':scope > .pts');
  if(pts){pts.setAttribute('aria-label',`Locked in fantasy points ${pts.textContent.trim()}`);pts.title='LOCKED IN'}
}
function markSummarySections(){
  document.querySelectorAll('#teamView .section-label').forEach(label=>{
    const text=String(label.textContent||'').trim().toLowerCase();
    label.classList.toggle('rb-starters-label',text==='starters');
    label.classList.toggle('rb-hide-all-summary',text==='bench'||text.includes('injured reserve'));
  });
}
function applyAllWeekMode(){
  const card=document.querySelector('#teamView .team-card');if(!card)return;
  const active=document.querySelector('#teamView .day-btn.active[data-day]');
  const all=String(active?.dataset.day||'')==='all';
  card.classList.toggle('rb-all-lock-summary',all);
  markSummarySections();
  const startersLabel=[...card.querySelectorAll('.section-label')].find(x=>String(x.textContent||'').trim().toLowerCase()==='starters');
  if(startersLabel)startersLabel.textContent=all?'Locked In This Week':'Starters';
}
function ensureIrCapacity(){
  const ir=document.querySelector('#teamView .ir-list');if(!ir)return false;const target=configuredIrSlots();if(!target)return false;
  const rows=[...ir.children].filter(x=>x.classList?.contains('player-row'));const existingEmpty=rows.filter(r=>r.classList.contains('rb-empty-ir-slot')||/empty ir slot/i.test(r.querySelector('.pname')?.textContent||''));existingEmpty.forEach(r=>r.classList.add('rb-empty-ir-slot'));
  for(let i=rows.length;i<target;i++){const wrap=document.createElement('div');wrap.className='player-row locked rb-empty-ir-slot';wrap.innerHTML='<div class="slot ir">IR</div><div><div class="pname">Empty IR slot</div><div class="pmeta">Available reserve position</div></div><div class="proj">—</div><div class="pts">—</div>';ir.appendChild(wrap)}
  return true;
}
function normalize(){arrangeDayStrip();document.querySelectorAll('#teamView .player-row').forEach(normalizeRow);ensureIrCapacity();restoreDay();applyAllWeekMode()}
style();
document.addEventListener('click',e=>{const b=e.target.closest?.('#teamView .day-btn[data-day]');if(b){rememberDay(b.dataset.day);requestAnimationFrame(applyAllWeekMode)}},true);
document.addEventListener('change',e=>{if(e.target?.id==='weekSel'){requestAnimationFrame(()=>{arrangeDayStrip();restoreDay();applyAllWeekMode()})}},true);
let startupFrames=0;function startup(){normalize();startupFrames++;if(startupFrames<180&&(!document.querySelector('#teamView .day-btn')||!document.querySelector('#teamView .ir-list')))requestAnimationFrame(startup)}requestAnimationFrame(startup);
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(normalize,16)};const root=document.getElementById('teamView')||document.body;new MutationObserver(mutations=>{
  const relevant=mutations.some(m=>{
    const target=m.target?.nodeType===1?m.target:m.target?.parentElement;
    if(target?.closest?.('.rb-inline-stats,.rb-inline-toolbar,.rb-inline-head-grid'))return false;
    const nodes=[...m.addedNodes,...m.removedNodes];
    if(nodes.length&&nodes.every(n=>n?.nodeType===1&&(
      n.matches?.('.rb-sleeper-headshot')||n.closest?.('.player-head')
    )))return false;
    return true;
  });
  if(relevant)schedule();
}).observe(root,{childList:true,subtree:true,characterData:true});
window.addEventListener('focus',normalize);
})();