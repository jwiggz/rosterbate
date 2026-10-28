(()=>{
  const PREFIX='rbLockStatePersistent:';
  const key=()=>{try{return `${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`}catch{return''}};
  const ssKey=()=>{const k=key();return k?`rbLockState:${k}`:''};
  const lsKey=()=>{const k=key();return k?`${PREFIX}${k}`:''};
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  function cached(){
    try{
      const s=ssKey(),l=lsKey();
      const raw=(s&&sessionStorage.getItem(s))||(l&&localStorage.getItem(l));
      if(!raw)return null;
      const x=JSON.parse(raw),d=x?.data||x;
      return d&&typeof d==='object'?d:null;
    }catch{return null}
  }
  function publicGames(){
    try{
      const m=(currentData?.matchups||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));
      return obj(m?.starters_games||m?.startersGames);
    }catch{return{}}
  }
  function applyGames(games){
    if(!games||typeof games!=='object'||Array.isArray(games))return false;
    try{lockedGames={...games};return Object.keys(games).length>0}catch{return false}
  }
  function prime(){
    const c=cached(),cg=obj(c?.startersGames);
    if(Object.keys(cg).length)applyGames(cg);
    else applyGames(publicGames());
  }
  function persistSessionCache(){
    try{
      const s=ssKey(),l=lsKey();if(!s||!l)return;
      const raw=sessionStorage.getItem(s);if(raw)localStorage.setItem(l,raw);
    }catch{}
  }
  // The base dashboard awaits loadLockState() before its first render. Replace that
  // blocking call with an immediate cache/public hydration. sleeper-lock-sync.js
  // remains responsible for the authoritative private refresh after first paint.
  try{
    const fast=async()=>{prime();return null};
    window.loadLockState=fast;
    try{loadLockState=fast}catch{}
  }catch{}
  // Keep a cross-reload copy of the most recently verified private state. This does
  // not contain the Sleeper auth token, only the week/roster lock map returned by Sleeper.
  let n=0;const mirror=setInterval(()=>{persistSessionCache();if(++n>=20)clearInterval(mirror)},500);
  window.addEventListener('focus',()=>{prime();persistSessionCache()});
})();
