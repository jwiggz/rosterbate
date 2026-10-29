(()=>{
  const doneDates=new Set(),pending=new Map();
  const norm=v=>{const t=String(v||'').trim().toUpperCase(),a={BRK:'BKN',BRO:'BKN',BK:'BKN',CHO:'CHA',CHH:'CHA',GS:'GSW',NO:'NOP',NOK:'NOP',NOH:'NOP',NY:'NYK',PHO:'PHX',SA:'SAS'};return a[t]||t};
  const ymd=s=>String(s||'').replace(/-/g,'');
  function eventTeams(e){
    const c=e?.competitions?.[0],rows=Array.isArray(c?.competitors)?c.competitors:[];
    const home=rows.find(x=>String(x?.homeAway||'').toLowerCase()==='home'),away=rows.find(x=>String(x?.homeAway||'').toLowerCase()==='away');
    return{home:norm(home?.team?.abbreviation||home?.team?.shortDisplayName),away:norm(away?.team?.abbreviation||away?.team?.shortDisplayName)};
  }
  async function fetchDate(date){
    if(doneDates.has(date))return[];
    if(pending.has(date))return pending.get(date);
    const p=(async()=>{try{
      const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(ymd(date))}`,{headers:{Accept:'application/json'},cache:'no-store'});
      if(!r.ok)return[];const d=await r.json();return Array.isArray(d?.events)?d.events:[];
    }catch{return[]}finally{doneDates.add(date);pending.delete(date)}})();
    pending.set(date,p);return p;
  }
  async function backfill(){
    try{
      const games=(currentData?.schedule||[]).filter(g=>!g?.calendar_only&&g?.date&&!String(g?.start_time||'').trim());
      if(!games.length)return false;
      const byDate={};for(const g of games)(byDate[g.date]||(byDate[g.date]=[])).push(g);
      let changed=false;
      for(const [date,rows] of Object.entries(byDate)){
        const events=await fetchDate(date);
        for(const g of rows){
          const gh=norm(g.home),ga=norm(g.away);
          const e=events.find(ev=>{const t=eventTeams(ev);return t.home===gh&&t.away===ga});
          const iso=String(e?.date||'').trim();
          if(iso&&Number.isFinite(Date.parse(iso))){g.start_time=iso;g.rb_time_source='espn-scoreboard';changed=true}
        }
      }
      if(changed){
        try{renderTeam()}catch{}
        try{renderActivity()}catch{}
        document.dispatchEvent(new CustomEvent('rb:schedule-times-updated'));
      }
      return changed;
    }catch{return false}
  }
  function run(){backfill()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);
  window.addEventListener('focus',run);
  document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))setTimeout(run,0)},true);
  let n=0;const timer=setInterval(()=>{run();if(++n>=20)clearInterval(timer)},750);
})();
