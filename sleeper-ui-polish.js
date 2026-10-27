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
  position:relative!important;
  box-sizing:border-box!important;
  width:82px!important;
  min-width:82px!important;
  height:28px!important;
  min-height:28px!important;
  margin-left:8px!important;
  margin-top:-1px!important;
  margin-bottom:-1px!important;
  padding:0 8px!important;
  border:1px solid transparent!important;
  border-radius:7px!important;
  color:#ffe9a6!important;
  font-size:9px!important;
  line-height:26px!important;
  font-weight:900!important;
  letter-spacing:.03em!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  vertical-align:middle!important;
  gap:5px!important;
  white-space:nowrap!important;
  background:linear-gradient(#4a3b16,#4a3b16) padding-box,linear-gradient(110deg,#a8750d 0%,#e4b32f 22%,#fff7c8 43%,#fff0a1 50%,#ffd24f 58%,#dc9f17 76%,#a8750d 100%) border-box!important;
  background-size:100% 100%,240% 100%!important;
  animation:rbLockReadyEdge .9s linear infinite!important;
  transform:none!important;
}
#teamView .player-row:not(.locked-in) .lock-btn:hover{
  color:#eafff7!important;
  border-color:transparent!important;
  background:linear-gradient(#17634e,#17634e) padding-box,linear-gradient(110deg,#238d69 0%,#30d8a0 22%,#d8fff0 43%,#9cf6d7 50%,#45e1ac 58%,#2aaa80 76%,#238d69 100%) border-box!important;
  background-size:100% 100%,240% 100%!important;
  animation:rbLockReadyHover .55s linear infinite!important;
}

/* Actual locked state stays green/static, but uses the exact same box as LOCK IN. */
#teamView .lock-chip{box-sizing:border-box!important;margin-left:8px!important;margin-top:-1px!important;margin-bottom:-1px!important;width:82px!important;min-width:82px!important;height:28px!important;min-height:28px!important;padding:0 8px!important;border:1px solid #2f9d79!important;border-radius:7px!important;background:#174d40!important;color:#8ff2cf!important;font-size:9px!important;line-height:26px!important;font-weight:900!important;letter-spacing:.03em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;vertical-align:middle!important;gap:5px!important;box-shadow:0 2px 8px rgba(0,0,0,.18)!important;white-space:nowrap!important;animation:none!important;transform:none!important;transition:none!important}
#teamView .lock-chip::before{content:'🔒';font-size:10px;line-height:1;animation:none!important}
#teamView .player-row.locked-in .player-copy::before,#teamView .player-row.locked-in .player-copy::after,#teamView .player-row.locked-in .matchup-meta::before,#teamView .player-row.locked-in .matchup-meta::after{content:none!important;display:none!important;animation:none!important}
#teamView .player-row.locked-in{opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.12),rgba(48,216,160,.025) 55%,transparent)!important;box-shadow:inset 3px 0 0 rgba(48,216,160,.7)!important;animation:none!important;transform:none!important}
#teamView .player-row.locked-in .lock-btn{animation:none!important}

/* Make the far-right fantasy-point result read as the outcome of the row. */
#teamView .player-row.rb-stats-row > .pts{
  justify-self:center!important;
  align-self:center!important;
  box-sizing:border-box!important;
  width:54px!important;
  min-width:54px!important;
  height:34px!important;
  min-height:34px!important;
  padding:0 8px!important;
  border-radius:8px!important;
  border:1px solid rgba(48,216,160,.18)!important;
  background:linear-gradient(180deg,rgba(19,78,62,.42),rgba(9,43,35,.34))!important;
  color:#37efb2!important;
  font-size:13px!important;
  font-weight:950!important;
  line-height:1!important;
  text-align:center!important;
  text-shadow:0 0 8px rgba(55,239,178,.32)!important;
  box-shadow:inset 0 0 10px rgba(48,216,160,.045),0 1px 5px rgba(0,0,0,.14)!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
}

/* Empty IR capacity should look usable, not like a phantom player. */
#teamView .ir-list .rb-empty-ir-slot{opacity:.72!important;border-top:1px dashed rgba(239,102,128,.28)!important;background:linear-gradient(90deg,rgba(239,102,128,.055),rgba(39,39,53,.65))!important}
#teamView .ir-list .rb-empty-ir-slot .pname{color:#cfd8e5!important}
#teamView .ir-list .rb-empty-ir-slot .pmeta{color:#8693a7!important}

@media(max-width:1250px){#teamView .columns-head.rb-stats-cols,#teamView .player-row.rb-stats-row{grid-template-columns:38px minmax(190px,.68fr) minmax(590px,1.65fr) 60px 60px!important}#teamView .player-row.rb-stats-row > .proj,#teamView .columns-head.rb-stats-cols > :nth-last-child(2){transform:translateX(-8px)!important}}
`;
function style(){if(document.getElementById('rbUiPolishStyle'))return;const s=document.createElement('style');s.id='rbUiPolishStyle';s.textContent=css;document.head.appendChild(s)}
function normalizeRow(row){
  const name=row.querySelector('.pname');
  if(name) name.textContent=name.textContent.replace(/\s*\(locked\)\s*$/i,'').trim();
  if(!row.classList.contains('locked-in')) return;
  const copy=row.querySelector('.player-copy');
  if(!copy) return;
  const chips=[...row.querySelectorAll('.lock-chip')];
  let chip=chips[0]||null;
  if(!chip){chip=document.createElement('span');chip.className='lock-chip';}
  chip.textContent='LOCKED IN';
  chip.setAttribute('aria-label','Locked in on Sleeper');
  chip.style.animation='none';
  chip.style.transform='none';
  chips.slice(1).forEach(x=>x.remove());
  row.querySelectorAll('.lock-btn').forEach(x=>x.remove());
  const meta=copy.querySelector('.matchup-meta');
  if(meta){
    if(chip.parentElement!==meta) meta.appendChild(chip);
  }else if(chip.parentElement!==copy){
    copy.appendChild(chip);
  }
}
function configuredIrSlots(){
  try{
    const league=currentData?.league||{},settings=league.settings||{};
    const rosterCount=(league.roster_positions||[]).filter(x=>['IR','RESERVE'].includes(String(x).toUpperCase())).length;
    const settingCandidates=[settings.reserve_slots,settings.ir_slots,settings.injured_reserve_slots,settings.injured_reserve,settings.reserve];
    const settingCount=Math.max(0,...settingCandidates.map(v=>Number(v)).filter(Number.isFinite));
    const roster=typeof team==='function'?team(selectedRoster):{};
    const occupied=Array.isArray(roster?.reserve)?roster.reserve.length:0;
    return Math.max(rosterCount,settingCount,occupied);
  }catch{return 0}
}
function ensureIrCapacity(){
  const ir=document.querySelector('#teamView .ir-list');if(!ir)return;
  const target=configuredIrSlots();if(!target)return;
  const rows=[...ir.children].filter(x=>x.classList?.contains('player-row'));
  const existingEmpty=rows.filter(r=>r.classList.contains('rb-empty-ir-slot')||/empty ir slot/i.test(r.querySelector('.pname')?.textContent||''));
  existingEmpty.forEach(r=>r.classList.add('rb-empty-ir-slot'));
  for(let i=rows.length;i<target;i++){
    const wrap=document.createElement('div');wrap.className='player-row locked rb-empty-ir-slot';
    wrap.innerHTML='<div class="slot ir">IR</div><div><div class="pname">Empty IR slot</div><div class="pmeta">Available reserve position</div></div><div class="proj">—</div><div class="pts">—</div>';
    ir.appendChild(wrap);
  }
}
function normalize(){document.querySelectorAll('#teamView .player-row').forEach(normalizeRow);ensureIrCapacity()}
style();
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(normalize,35)};
const root=document.getElementById('teamView')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
setTimeout(normalize,100);window.addEventListener('focus',normalize);
})();