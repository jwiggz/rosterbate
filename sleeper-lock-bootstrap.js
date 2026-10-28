(()=>{
  const PREFIX='rbLockStatePersistent:';
  const key=()=>{try{return `${String(leagueId)}:${String(selectedRoster)}:${String(selectedWeek)}`}catch{return''}};
  const ssKey=()=>{const k=key();return k?`rbLockState:${k}`:''};
  const lsKey=()=>{const k=key();return k?`${PREFIX}${k}`:''};
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  function tokenUserId(){
    try{
      const raw=sessionStorage.getItem('rbSleeperToken')||localStorage.getItem('rbSleeperTokenPersistent')||sessionStorage.getItem('rbSleeperAuth')||'';
      const part=String(raw).replace(/^Bearer\s+/i,'').split('.')[1]||'';
      if(!part)return'';
      const b64=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
      const text=decodeURIComponent(Array.from(atob(b64),c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
      const m=text.match(/"user_id"\s*:\s*(?:"(\d+)"|(\d+))/);
      return String(m?.[1]||m?.[2]||'');
    }catch{return''}
  }
  function selectedIsOwned(){
    try{
      const uid=tokenUserId();
      if(!uid)return false;
      const t=(currentData?.teams||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));
      return String(t?.owner_id||'')===uid;
    }catch{return false}
  }
  function cached(){
    try{
      if(!selectedIsOwned())return null;
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
    const safe=obj(games);
    try{
      // Always assign, including an empty object. Otherwise the previous roster's
      // lock map can leak into the newly selected roster.
      lockedGames={...safe};
      return true;
    }catch{return false}
  }
  function prime(){
    if(selectedIsOwned()){
      const c=cached(),cg=obj(c?.startersGames);
      if(Object.keys(cg).length){applyGames(cg);return}
    }
    // Opponents never hydrate from private/persistent cache. Their display starts
    // strictly from that roster's public lock fields, which may legitimately be empty.
    applyGames(publicGames());
  }
  function persistSessionCache(){
    try{
      if(!selectedIsOwned())return;
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
  // Keep a cross-reload copy only for the connected user's own roster.
  let n=0;const mirror=setInterval(()=>{persistSessionCache();if(++n>=20)clearInterval(mirror)},500);
  window.addEventListener('focus',()=>{prime();persistSessionCache()});
})();
