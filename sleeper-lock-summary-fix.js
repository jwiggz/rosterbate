(()=>{
  let totalsObserver=null,observedBox=null;
  function selectedIsOwned(){
    try{
      const raw=String(sessionStorage.getItem('rbSleeperToken')||localStorage.getItem('rbSleeperTokenPersistent')||sessionStorage.getItem('rbSleeperAuth')||'').trim().replace(/^Bearer\s+/i,'');
      const part=raw.split('.')[1]||'';if(!part)return false;
      const b64=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
      const text=decodeURIComponent(Array.from(atob(b64),c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
      const m=text.match(/"user_id"\s*:\s*(?:"(\d+)"|(\d+))/);const uid=String(m?.[1]||m?.[2]||'');
      const t=(currentData?.teams||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));
      return !!uid&&String(t?.owner_id||'')===uid;
    }catch{return false}
  }
  function exactState(){try{const key=`${String(leagueId)}:${Number(selectedWeek)}:${Number(selectedRoster)}`;const raw=sessionStorage.getItem(`rbOpponentExact:${key}`);return raw?JSON.parse(raw):null}catch{return null}}
  function lockedIds(state,m){const out=new Set(),valid=new Set((state?.starters?.length?state.starters:m?.starters||[]).map(String)),games=state?.startersGames;if(!games||typeof games!=='object'||Array.isArray(games))return out;for(const [k,v] of Object.entries(games)){if(valid.has(String(k)))out.add(String(k));if(v&&typeof v==='object'){const pid=String(v.player_id??v.playerId??v.player??v.pid??'');if(valid.has(pid))out.add(pid)}}return out}
  function actualFor(m,pid){const starters=(m?.starters||[]).map(String),i=starters.indexOf(String(pid));if(i>=0&&Array.isArray(m?.starters_points)){const v=Number(m.starters_points[i]);if(Number.isFinite(v))return v}const v=Number(m?.players_points?.[pid]??m?.players_points?.[String(pid)]);return Number.isFinite(v)?v:0}
  function futureProjection(pid){const p=currentData?.projections?.[String(pid)];if(!p||!Array.isArray(p.games))return null;const team=currentData?.players?.[String(pid)]?.team;let best=null;for(const pg of p.games){const pts=Number(pg?.points);if(!Number.isFinite(pts))continue;const gid=String(pg?.game_id||''),date=String(pg?.date||'');const sg=(currentData?.schedule||[]).find(g=>(gid&&String(g.game_id||'')===gid)||(!gid&&String(g.date||'')===date&&(!team||g.home===team||g.away===team)));if(sg&&String(sg.status||'pre_game')!=='pre_game')continue;if(best===null||pts>best)best=pts}return best}
  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
  function paint(){
    try{
      if(typeof currentData==='undefined'||!currentData||selectedIsOwned())return;
      const state=exactState();if(!state?.exact)return;
      const m=(currentData.matchups||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));if(!m)return;
      const locked=lockedIds(state,m),starters=(m.starters||[]).map(String).filter(x=>x&&x!=='0');
      let lockedTotal=0;for(const pid of locked)lockedTotal+=actualFor(m,pid);
      let projected=lockedTotal,remaining=0;for(const pid of starters){if(locked.has(pid))continue;const v=futureProjection(pid);if(v!==null){projected+=v;remaining++}}
      const box=document.querySelector('#teamView .rb-lock-totals');if(!box)return;
      watch(box);
      const lockedBox=box.querySelector('.rb-lock-total.locked'),projBox=box.querySelector('.rb-lock-total.projected');
      setText(lockedBox?.querySelector('b'),lockedTotal.toFixed(1));
      setText(lockedBox?.querySelector('small'),`${locked.size} verified locks`);
      setText(projBox?.querySelector('b'),projected.toFixed(1));
      setText(projBox?.querySelector('small'),remaining?`best remaining game / ${remaining} player${remaining===1?'':'s'}`:'all starters locked');
    }catch{}
  }
  function watch(box){
    if(!box||box===observedBox)return;
    totalsObserver?.disconnect();observedBox=box;
    totalsObserver=new MutationObserver(()=>queueMicrotask(paint));
    totalsObserver.observe(box,{childList:true});
  }
  function run(){queueMicrotask(()=>{const box=document.querySelector('#teamView .rb-lock-totals');if(box)watch(box);paint()})}
  try{if(typeof renderTeam==='function'&&!renderTeam.__rbLockSummaryExact){const base=renderTeam;const wrapped=function(...args){const out=base.apply(this,args);run();return out};wrapped.__rbLockSummaryExact=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}}}catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab,#teamPicker'))run()},true);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')run()},true);
  window.addEventListener('focus',run);
  window.addEventListener('rb:opponent-locks-exact',run);
  run();
})();