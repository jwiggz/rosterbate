(()=>{
const css=`
/* Pull season-stat cards closer to player info while keeping proj/pts on the right. */
#teamView .columns-head.rb-stats-cols,#teamView .player-row.rb-stats-row{grid-template-columns:42px minmax(215px,.72fr) minmax(690px,1.78fr) 70px 70px!important}
#teamView .rb-inline-head-grid,#teamView .rb-inline-stats{column-gap:7px!important}

/* Available lock buttons: yellow/gold decision state with a faster, more visible animated edge. */
@keyframes rbLockReadyEdge{
  0%{background-position:0 0,0% 50%;box-shadow:0 0 0 1px rgba(255,199,62,.28),0 0 7px rgba(255,198,61,.22)}
  50%{background-position:0 0,100% 50%;box-shadow:0 0 0 2px rgba(255,239,167,.62),0 0 16px rgba(255,205,71,.58)}
  100%{background-position:0 0,200% 50%;box-shadow:0 0 0 1px rgba(255,199,62,.28),0 0 7px rgba(255,198,61,.22)}
}
#teamView .player-row:not(.locked-in) .lock-btn{
  position:relative!important;
  box-sizing:border-box!important;
  width:82px!important;
  min-width:82px!important;
  height:28px!important;
  min-height:28px!important;
  margin-left:8px!important;
  padding:0 8px!important;
  border:1px solid transparent!important;
  border-radius:7px!important;
  color:#ffe9a6!important;
  font-size:9px!important;
  line-height:1!important;
  font-weight:900!important;
  letter-spacing:.03em!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:5px!important;
  white-space:nowrap!important;
  background:linear-gradient(#4a3b16,#4a3b16) padding-box,linear-gradient(110deg,#a8750d 0%,#e4b32f 22%,#fff7c8 43%,#fff0a1 50%,#ffd24f 58%,#dc9f17 76%,#a8750d 100%) border-box!important;
  background-size:100% 100%,240% 100%!important;
  animation:rbLockReadyEdge .9s linear infinite!important;
  transform:none!important;
}
#teamView .player-row:not(.locked-in) .lock-btn:hover{color:#fff8d6!important;background:linear-gradient(#594718,#594718) padding-box,linear-gradient(110deg,#c8941d 0%,#edbe43 22%,#fffbe1 43%,#fff0a1 50%,#ffe26f 58%,#d9a52a 76%,#c8941d 100%) border-box!important;box-shadow:0 0 0 2px rgba(255,240,177,.70),0 0 19px rgba(255,205,71,.70)!important}

/* Actual locked state stays green/static, but uses the exact same box as LOCK IN. */
#teamView .lock-chip{box-sizing:border-box!important;margin-left:8px!important;width:82px!important;min-width:82px!important;height:28px!important;min-height:28px!important;padding:0 8px!important;border:1px solid #2f9d79!important;border-radius:7px!important;background:#174d40!important;color:#8ff2cf!important;font-size:9px!important;line-height:1!important;font-weight:900!important;letter-spacing:.03em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;box-shadow:0 2px 8px rgba(0,0,0,.18)!important;white-space:nowrap!important;animation:none!important;transform:none!important;transition:none!important}
#teamView .lock-chip::before{content:'🔒';font-size:10px;line-height:1;animation:none!important}
#teamView .player-row.locked-in .player-copy::before,#teamView .player-row.locked-in .player-copy::after,#teamView .player-row.locked-in .matchup-meta::before,#teamView .player-row.locked-in .matchup-meta::after{content:none!important;display:none!important;animation:none!important}
#teamView .player-row.locked-in{opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.12),rgba(48,216,160,.025) 55%,transparent)!important;box-shadow:inset 3px 0 0 rgba(48,216,160,.7)!important;animation:none!important;transform:none!important}
#teamView .player-row.locked-in .lock-btn{animation:none!important}

/* Make the far-right fantasy-point result read as the outcome of the row. */
#teamView .player-row.rb-stats-row > .pts{
  justify-self:center!important;
  min-width:54px!important;
  min-height:34px!important;
  padding:6px 8px!important;
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
}
#teamView .columns-head.rb-stats-cols > :last-child{color:#80f0ca!important;font-weight:950!important}

@media(max-width:1250px){#teamView .columns-head.rb-stats-cols,#teamView .player-row.rb-stats-row{grid-template-columns:38px minmax(190px,.68fr) minmax(590px,1.65fr) 60px 60px!important}}
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
function normalize(){document.querySelectorAll('#teamView .player-row').forEach(normalizeRow)}
style();
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(normalize,35)};
const root=document.getElementById('teamView')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
setTimeout(normalize,100);window.addEventListener('focus',normalize);
})();