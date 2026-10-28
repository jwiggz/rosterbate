(()=>{
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
      const team=(currentData?.teams||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));
      return !!uid&&String(team?.owner_id||'')===uid;
    }catch{return true}
  }
  function explicitLocks(m){
    const out=new Set(),starters=(m?.starters||[]).map(String),sg=m?.starters_games||m?.startersGames;
    if(!sg||typeof sg!=='object'||Array.isArray(sg))return out;
    for(const [k,v] of Object.entries(sg)){
      const key=String(k);
      if(starters.includes(key))out.add(key);
      if(v&&typeof v==='object'){
        const pid=String(v.player_id??v.playerId??v.player??v.pid??'');
        if(pid&&starters.includes(pid))out.add(pid);
      }
    }
    return out;
  }
  function countedLocks(m){
    const explicit=explicitLocks(m);
    if(explicit.size)return{locked:explicit,source:'starters_games'};
    const starters=(m?.starters||[]).map(String),sp=Array.isArray(m?.starters_points)?m.starters_points:[];
    if(!starters.length||sp.length!==starters.length)return{locked:new Set(),source:'unavailable'};
    const vals=sp.map(v=>Number(v));
    if(vals.some(v=>!Number.isFinite(v)))return{locked:new Set(),source:'unavailable'};
    const total=Number(m?.points),sum=vals.reduce((a,b)=>a+b,0);
    if(!Number.isFinite(total)||Math.abs(sum-total)>.11)return{locked:new Set(),source:'unavailable'};
    const locked=new Set();
    starters.forEach((pid,i)=>{if(pid&&pid!=='0'&&Math.abs(vals[i])>.0001)locked.add(pid)});
    return{locked,source:'starters_points'};
  }
  function playerNameMap(){
    const map=new Map();
    try{for(const [id,p] of Object.entries(currentData?.players||{})){const n=String(p?.full_name||'').trim().toLowerCase();if(n&&!map.has(n))map.set(n,String(id))}}catch{}
    return map;
  }
  function rowPlayerId(row,names){
    const existing=String(row?.dataset?.rbPlayerId||'');if(existing)return existing;
    const name=String(row?.querySelector('.pname')?.textContent||'').replace(/\s*\(locked\)\s*$/i,'').trim().toLowerCase();
    const id=names.get(name)||'';if(id)row.dataset.rbPlayerId=id;return id;
  }
  function clearOpponentState(row){
    row.classList.remove('locked-in','lockable','editable');
    row.removeAttribute('aria-disabled');
    row.querySelectorAll('.lock-chip,.lock-btn').forEach(x=>x.remove());
    const pts=row.querySelector(':scope > .pts');
    if(pts){
      pts.classList.remove('rb-lock-ready-pts');
      pts.removeAttribute('title');
      pts.removeAttribute('aria-label');
      pts.removeAttribute('role');
      pts.removeAttribute('tabindex');
      delete pts.dataset.rbLockBound;
    }
  }
  function markLock(row){
    row.classList.remove('lockable','editable');
    row.classList.add('locked-in');
    row.setAttribute('aria-disabled','true');
    row.querySelectorAll('.lock-chip,.lock-btn').forEach(x=>x.remove());
  }
  function apply(){
    try{
      if(typeof currentData==='undefined'||!currentData||selectedIsOwned())return;
      const m=(currentData.matchups||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));if(!m)return;
      const state=countedLocks(m),locked=state.locked,starters=new Set((m.starters||[]).map(String)),names=playerNameMap();
      const card=document.querySelector('#teamView .team-card');if(!card)return;
      const bench=card.querySelector('.bench');
      card.querySelectorAll('.player-row').forEach(row=>{
        if(bench?.contains(row)||row.closest('.ir-list'))return;
        const pid=rowPlayerId(row,names);if(!pid||!starters.has(pid))return;
        clearOpponentState(row);
        if(locked.has(pid))markLock(row);
      });
      const totalBox=card.querySelector('.rb-lock-total.locked');
      if(totalBox){
        const total=Number(m.points),b=totalBox.querySelector('b'),small=totalBox.querySelector('small');
        if(b&&Number.isFinite(total))b.textContent=total.toFixed(1);
        if(small){
          if(state.source==='starters_games')small.textContent=`${locked.size} confirmed locks`;
          else if(state.source==='starters_points')small.textContent=`${locked.size} counted starters`;
          else small.textContent=Number.isFinite(total)&&total>0?'individual locks unavailable':'0 confirmed locks';
        }
      }
    }catch{}
  }
  function schedule(){
    if(schedule.pending)return;
    schedule.pending=true;
    queueMicrotask(()=>{schedule.pending=false;apply()});
  }
  try{
    if(typeof renderTeam==='function'&&!renderTeam.__rbOpponentExplicit){
      const base=renderTeam;
      const wrapped=function(...args){const out=base.apply(this,args);schedule();return out};
      wrapped.__rbOpponentExplicit=true;
      renderTeam=wrapped;
      try{window.renderTeam=wrapped}catch{}
    }
  }catch{}
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab,#teamPicker'))schedule()},true);
  document.addEventListener('change',e=>{if(e.target?.id==='teamPicker'||e.target?.id==='weekSel')schedule()},true);
  window.addEventListener('focus',schedule);
  schedule();
})();
