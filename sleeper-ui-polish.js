(()=>{
const css=`
#teamView .lock-chip{margin-left:8px!important;min-height:28px!important;padding:6px 10px!important;border:1px solid #2f9d79!important;border-radius:7px!important;background:#174d40!important;color:#8ff2cf!important;font-size:9px!important;line-height:1!important;font-weight:900!important;letter-spacing:.03em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;box-shadow:0 2px 8px rgba(0,0,0,.18)!important;white-space:nowrap!important;animation:none!important;transform:none!important;transition:none!important}
#teamView .lock-chip::before{content:'🔒';font-size:10px;line-height:1;animation:none!important}
#teamView .player-row.locked-in .player-copy::before,#teamView .player-row.locked-in .player-copy::after,#teamView .player-row.locked-in .matchup-meta::before,#teamView .player-row.locked-in .matchup-meta::after{content:none!important;display:none!important;animation:none!important}
#teamView .player-row.locked-in{opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.12),rgba(48,216,160,.025) 55%,transparent)!important;box-shadow:inset 3px 0 0 rgba(48,216,160,.7)!important;animation:none!important;transform:none!important}
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