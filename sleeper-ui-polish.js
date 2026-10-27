(()=>{
const css=`
/* Pull season-stat cards closer to player info while keeping proj/pts on the right. */
#teamView .columns-head.rb-stats-cols,#teamView .player-row.rb-stats-row{grid-template-columns:42px minmax(215px,.72fr) minmax(690px,1.78fr) 70px 70px!important}
#teamView .rb-inline-head-grid,#teamView .rb-inline-stats{column-gap:7px!important}

/* Available lock buttons: yellow/gold decision state with animated edge. */
@keyframes rbLockReadyEdge{0%{background-position:0 0,0% 50%;box-shadow:0 0 0 1px rgba(207,160,44,.10),0 0 5px rgba(255,198,61,.10)}50%{background-position:0 0,100% 50%;box-shadow:0 0 0 1px rgba(255,228,132,.34),0 0 11px rgba(255,198,61,.30)}100%{background-position:0 0,200% 50%;box-shadow:0 0 0 1px rgba(207,160,44,.10),0 0 5px rgba(255,198,61,.10)}}
#teamView .player-row:not(.locked-in) .lock-btn{
  position:relative!important;
  border:1px solid transparent!important;
  color:#ffe9a6!important;
  background:linear-gradient(#4a3b16,#4a3b16) padding-box,linear-gradient(110deg,#b88716 0%,#d7a72f 25%,#fff1a8 46%,#ffd95d 55%,#c9941e 72%,#b88716 100%) border-box!important;
  background-size:100% 100%,220% 100%!important;
  animation:rbLockReadyEdge 1.9s linear infinite!important;
  transform:none!important;
}
#teamView .player-row:not(.locked-in) .lock-btn:hover{color:#fff4c7!important;background:linear-gradient(#594718,#594718) padding-box,linear-gradient(110deg,#c8941d 0%,#edbe43 25%,#fff7c8 46%,#ffe26f 55%,#d9a52a 72%,#c8941d 100%) border-box!important;box-shadow:0 0 0 1px rgba(255,234,157,.38),0 0 14px rgba(255,198,61,.34)!important}

/* Actual locked state stays exactly green/static. */
#teamView .lock-chip{margin-left:8px!important;min-height:28px!important;padding:6px 10px!important;border:1px solid #2f9d79!important;border-radius:7px!important;background:#174d40!important;color:#8ff2cf!important;font-size:9px!important;line-height:1!important;font-weight:900!important;letter-spacing:.03em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;box-shadow:0 2px 8px rgba(0,0,0,.18)!important;white-space:nowrap!important;animation:none!important;transform:none!important;transition:none!important}
#teamView .lock-chip::before{content:'🔒';font-size:10px;line-height:1;animation:none!important}
#teamView .player-row.locked-in .player-copy::before,#teamView .player-row.locked-in .player-copy::after,#teamView .player-row.locked-in .matchup-meta::before,#teamView .player-row.locked-in .matchup-meta::after{content:none!important;display:none!important;animation:none!important}
#teamView .player-row.locked-in{opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.12),rgba(48,216,160,.025) 55%,transparent)!important;box-shadow:inset 3px 0 0 rgba(48,216,160,.7)!important;animation:none!important;transform:none!important}
#teamView .player-row.locked-in .lock-btn{animation:none!important}

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