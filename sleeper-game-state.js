(()=>{
const style=document.createElement('style');
style.textContent=`
#teamView .rb-game-state{display:block;margin-top:2px;font-size:8px;font-weight:900;letter-spacing:.01em;color:#b9c6d8}
#teamView .rb-game-state.live{color:#6ef2c5}
#teamView .rb-game-state.final{color:#9fb0c4}
#teamView .rb-game-state .score{color:#eef5ff;font-size:inherit;font-weight:950}
#teamView .rb-game-state .clock{color:#f3c75b;font-weight:950}
`;
document.head.appendChild(style);
let games=[],fetching=false;
const normalize=t=>String(t||'').trim().toUpperCase().replace(/^BRK$/,'BKN').replace(/^CHO$/,'CHA').replace(/^GS$/,'GSW').replace(/^NO$/,'NOP').replace(/^NY$/,'NYK').replace(/^PHO$/,'PHX').replace(/^SA$/,'SAS');
function day(){try{return String(selectedDay||'')}catch{return''}}
function statusKind(g){const s=String(g?.status||'').toLowerCase();if(/in_game|live|in progress|inprogress/.test(s))return'live';if(/complete|final|closed|post/.test(s))return'final';return'pre'}
function periodLabel(p){if(p==null||p==='')return'';const n=Number(p);if(Number.isFinite(n)){if(n<=4)return`Q${n}`;return n===5?'OT':`${n-4}OT`}return String(p).toUpperCase()}
function rowTeam(row){const meta=row.querySelector('.pmeta');if(!meta)return'';return normalize(String(meta.textContent||'').split('·')[0].trim())}
function gameFor(team){const d=day();if(!team||!d||d==='all')return null;return games.find(g=>g.date===d&&(normalize(g.home)===team||normalize(g.away)===team))||null}
function stateText(g){
  const kind=statusKind(g),hs=Number(g.home_score),as=Number(g.away_score),hasScore=Number.isFinite(hs)&&Number.isFinite(as);
  if(kind==='pre'||!hasScore)return null;
  const score=`${g.away} ${as}–${hs} ${g.home}`;
  if(kind==='final')return{kind,text:`FINAL · ${score}`};
  const p=periodLabel(g.period),c=String(g.clock||'').trim();
  const gameClock=[p,c].filter(Boolean).join(' ');
  return{kind,text:gameClock?`${score} · ${gameClock}`:score};
}
function decorate(){
  document.querySelectorAll('#teamView .player-row').forEach(row=>{
    const meta=row.querySelector('.matchup-meta');if(!meta)return;
    const g=gameFor(rowTeam(row)),state=g&&stateText(g);
    let el=meta.querySelector('.rb-game-state');
    if(!state){if(el)el.remove();return}
    if(!el){el=document.createElement('span');el.className='rb-game-state';meta.appendChild(el)}
    el.className=`rb-game-state ${state.kind}`;
    if(el.textContent!==state.text)el.textContent=state.text;
  });
}
async function refresh(){
  const d=day();if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||fetching){decorate();return}
  fetching=true;
  try{
    const r=await fetch(`/.netlify/functions/sleeper-live-games?date=${encodeURIComponent(d)}&_=${Date.now()}`,{cache:'no-store'});
    const data=await r.json();
    if(r.ok&&data?.ok&&Array.isArray(data.games)){games=data.games;decorate()}
  }catch{}finally{fetching=false}
}
let timer;const scheduleDecorate=()=>{clearTimeout(timer);timer=setTimeout(decorate,0)};
new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes].some(n=>n?.nodeType===1&&!n.matches?.('.rb-game-state'))))scheduleDecorate()}).observe(document.getElementById('teamView')||document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('#teamView .day-btn[data-day]'))requestAnimationFrame(()=>{games=[];decorate();refresh()})},true);
document.addEventListener('change',e=>{if(e.target?.id==='weekSel')setTimeout(()=>{games=[];refresh()},50)},true);
window.addEventListener('focus',refresh);
setTimeout(refresh,0);
setInterval(refresh,20000);
})();
