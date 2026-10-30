(()=>{
  const nativeRAF=window.requestAnimationFrame.bind(window);
  const fantasyDay=()=>{
    const d=new Date();
    if(d.getHours()<6)d.setDate(d.getDate()-1);
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  const savedDay=()=>{try{const lid=String(typeof leagueId!=='undefined'?leagueId:new URLSearchParams(location.search).get('league')||'league');const wk=String(typeof selectedWeek!=='undefined'?selectedWeek:new URLSearchParams(location.search).get('week')||'current');const v=sessionStorage.getItem(`rbSleeperDayV2:${lid}:${wk}`);return v&&v!=='all'?v:''}catch{return''}};
  try{selectedDay=savedDay()||fantasyDay()}catch{}
  try{
    dayStrip=function(){
      const ds=days();
      if(!ds.length)return '<div class="day-empty">Daily NBA schedule is unavailable for this week; weekly editing still works.</div>';
      const daily=ds.map(date=>{const l=dayLabel(date);return `<button class="day-btn ${selectedDay===date?'active':''}" data-day="${date}">${l.dow}<small>${l.md}</small></button>`}).join('');
      return `<div class="day-strip">${daily}<button class="day-btn ${selectedDay==='all'?'active':''}" data-day="all">ALL<small>Week</small></button></div>`;
    };
  }catch{}
  window.requestAnimationFrame=function(cb){if(cb&&cb.name==='startup')return 0;return nativeRAF(cb)};
  const s=document.createElement('script');
  s.src='sleeper-ui-polish-core.js?v=20261030b';
  const done=()=>{
    window.requestAnimationFrame=nativeRAF;
    document.documentElement.classList.remove('rb-day-init-pending');

    if(!document.getElementById('rbPtsLockStyle')){
      const style=document.createElement('style');
      style.id='rbPtsLockStyle';
      style.textContent=`
@keyframes rbPtsLockReady{0%{box-shadow:0 0 0 1px rgba(255,163,54,.28),0 0 7px rgba(255,147,42,.2)}50%{box-shadow:0 0 0 2px rgba(255,210,132,.78),0 0 17px rgba(255,150,38,.62)}100%{box-shadow:0 0 0 1px rgba(255,163,54,.28),0 0 7px rgba(255,147,42,.2)}}
@keyframes rbPtsLockHover{0%{box-shadow:0 0 0 1px rgba(48,216,160,.45),0 0 10px rgba(48,216,160,.32)}50%{box-shadow:0 0 0 2px rgba(143,242,207,.9),0 0 22px rgba(48,216,160,.78)}100%{box-shadow:0 0 0 1px rgba(48,216,160,.45),0 0 10px rgba(48,216,160,.32)}}
#teamView .player-row.lockable .lock-btn{display:none!important}
#teamView .player-row.rb-stats-row.lockable > .pts.rb-lock-ready-pts{width:68px!important;min-width:68px!important;height:42px!important;min-height:42px!important;padding:14px 7px 3px!important;border:2px solid #e69a24!important;background:linear-gradient(180deg,rgba(104,65,14,.78),rgba(59,39,10,.68))!important;color:#ffd67e!important;box-shadow:0 0 0 1px rgba(255,166,56,.18),0 0 14px rgba(255,151,35,.34),inset 0 0 12px rgba(255,170,55,.08)!important;animation:rbPtsLockReady .85s linear infinite!important;cursor:pointer!important;position:relative!important}
#teamView .player-row.rb-stats-row.lockable > .pts.rb-lock-ready-pts::before{content:'LOCK IN';position:absolute;top:4px;left:0;right:0;text-align:center;color:#ffe5ae;font-size:6px;font-weight:950;letter-spacing:.08em;line-height:1;text-shadow:0 0 5px rgba(255,179,69,.45)}
#teamView .player-row.rb-stats-row.lockable > .pts.rb-lock-ready-pts:hover{border-color:#30d8a0!important;background:linear-gradient(180deg,rgba(20,95,73,.76),rgba(9,48,38,.66))!important;color:#7ff0ca!important;animation:rbPtsLockHover .55s linear infinite!important}
#teamView .player-row.rb-stats-row.lockable > .pts.rb-lock-ready-pts:hover::before{color:#b9ffe9!important;text-shadow:0 0 5px rgba(48,216,160,.5)!important}
#teamView .player-row.rb-stats-row > .pts.rb-unlocked-pts{border:1px solid rgba(234,179,54,.44)!important;background:linear-gradient(180deg,rgba(88,67,16,.48),rgba(56,43,11,.4))!important;color:#ffd45f!important;box-shadow:inset 0 0 10px rgba(234,179,54,.06),0 0 8px rgba(234,179,54,.08)!important}
`;
      document.head.appendChild(style);
    }

    const decorateLockablePts=()=>{
      document.querySelectorAll('#teamView .player-row.lockable').forEach(row=>{
        const btn=row.querySelector('.lock-btn');
        const pts=row.querySelector(':scope > .pts');
        if(!btn||!pts)return;
        pts.classList.add('rb-lock-ready-pts');
        pts.classList.remove('rb-unlocked-pts');
        if(pts.dataset.rbLockBound==='1')return;
        pts.dataset.rbLockBound='1';
        pts.setAttribute('role','button');
        pts.setAttribute('tabindex','0');
        pts.setAttribute('aria-label',`Lock in ${pts.textContent.trim()} fantasy points`);
        const activate=e=>{e.preventDefault();e.stopPropagation();btn.click()};
        pts.addEventListener('click',activate);
        pts.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){activate(e)}});
      });
    };

    decorateLockablePts();
    const root=document.getElementById('teamView');
    if(root)new MutationObserver(()=>decorateLockablePts()).observe(root,{childList:true,subtree:true});

    if(!document.querySelector('script[data-rb-game-state]')){
      const gs=document.createElement('script');
      gs.src='sleeper-game-state.js?v=20261028b';
      gs.dataset.rbGameState='1';
      document.head.appendChild(gs);
    }
  };
  s.onload=done;s.onerror=done;
  document.head.appendChild(s);
})();