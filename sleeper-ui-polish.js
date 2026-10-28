(()=>{
  const nativeRAF=window.requestAnimationFrame.bind(window);
  const today=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dd}`};
  const savedDay=()=>{try{const lid=String(typeof leagueId!=='undefined'?leagueId:new URLSearchParams(location.search).get('league')||'league');const wk=String(typeof selectedWeek!=='undefined'?selectedWeek:new URLSearchParams(location.search).get('week')||'current');const v=sessionStorage.getItem(`rbSleeperDayV2:${lid}:${wk}`);return v&&v!=='all'?v:''}catch{return''}};
  try{selectedDay=savedDay()||today()}catch{}
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
  s.src='sleeper-ui-polish-core.js?v=20261028a';
  const done=()=>{window.requestAnimationFrame=nativeRAF;document.documentElement.classList.remove('rb-day-init-pending')};
  s.onload=done;s.onerror=done;
  document.head.appendChild(s);
})();