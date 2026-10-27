(function initSleeperHomeIntegration(){
  const DEFAULT_LEAGUE='1411477732390400000';

  function currentSport(){
    const active=document.querySelector('.sport-card.active[data-sport]');
    if(active) return String(active.dataset.sport||'').toLowerCase();
    try{return String(localStorage.getItem('rosterbateSelectedSport')||'nba').toLowerCase();}catch(e){return 'nba';}
  }

  function syncVisibility(){
    const root=document.getElementById('sleeperLeagueImportLane');
    if(root) root.hidden=currentSport()!=='nba';
  }

  function openLeague(){
    const input=document.getElementById('sleeperLeagueIdInput');
    const id=String(input?.value||'').trim();
    if(!/^\d{8,24}$/.test(id)){
      if(input){input.focus();input.setCustomValidity('Enter a valid Sleeper league ID.');input.reportValidity();setTimeout(()=>input.setCustomValidity(''),1000)}
      return;
    }
    window.location.href='sleeper-basketball.html?league='+encodeURIComponent(id);
  }

  function build(){
    if(document.getElementById('sleeperLeagueImportLane')) return;
    const historical=document.querySelector('.cta-lane.historical');
    if(!historical || !historical.parentNode) return;

    const lane=document.createElement('div');
    lane.className='sleeper-import-lane';
    lane.id='sleeperLeagueImportLane';
    lane.innerHTML=`
      <div class="sleeper-import-head">
        <div class="sleeper-import-title">Sleeper League</div>
        <div class="sleeper-import-sub">View & analyze your existing basketball league</div>
      </div>
      <div class="sleeper-import-card">
        <div class="sleeper-import-copy">
          <div class="sleeper-import-kicker">Live League Analyzer</div>
          <div class="sleeper-import-card-title">Bring Your Sleeper League Into RosterBate</div>
          <div class="sleeper-import-desc">Matchups, standings, locked starters and player fantasy points — with lock efficiency and deeper manager analytics coming next.</div>
          <div class="sleeper-import-pills"><span>NBA</span><span>Read Only</span><span>Live Data</span></div>
        </div>
        <div class="sleeper-import-form">
          <label for="sleeperLeagueIdInput">Sleeper League ID</label>
          <input id="sleeperLeagueIdInput" inputmode="numeric" autocomplete="off" value="${DEFAULT_LEAGUE}" aria-label="Sleeper League ID">
          <button id="sleeperLeagueOpenBtn" type="button">Load League</button>
          <div class="sleeper-import-note">Paste the numeric ID from your Sleeper league URL.</div>
        </div>
      </div>`;
    historical.parentNode.insertBefore(lane,historical);

    const style=document.createElement('style');
    style.id='sleeperHomeIntegrationStyles';
    style.textContent=`
      .sleeper-import-lane{grid-column:1/-1;margin:2px 0 4px}.sleeper-import-head{text-align:center;margin:0 0 10px}.sleeper-import-title{font-family:var(--fd);font-size:34px;font-weight:900;text-transform:uppercase;line-height:.92;color:#f8fafc}.sleeper-import-sub{font-family:var(--fm);font-size:13px;font-weight:700;color:#8fd7ff;margin-top:6px}.sleeper-import-card{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);gap:20px;align-items:center;padding:20px 22px;border-radius:24px;border:1px solid rgba(96,165,250,.3);background:radial-gradient(90% 120% at 0 0,rgba(90,168,255,.19),transparent 45%),radial-gradient(70% 100% at 100% 100%,rgba(247,164,87,.12),transparent 50%),linear-gradient(180deg,rgba(40,57,84,.9),rgba(14,22,36,.98));box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 22px 42px rgba(0,0,0,.3),0 0 30px rgba(90,168,255,.1)}.sleeper-import-copy{min-width:0}.sleeper-import-kicker{font-family:var(--fd);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.85px;color:#8fd7ff}.sleeper-import-card-title{font-family:var(--fd);font-size:30px;font-weight:900;text-transform:uppercase;line-height:.96;color:#f9fbff;margin-top:5px}.sleeper-import-desc{font-family:var(--fm);font-size:12px;font-weight:600;line-height:1.58;color:#c5d5e9;max-width:58ch;margin-top:8px}.sleeper-import-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}.sleeper-import-pills span{padding:5px 9px;border-radius:999px;border:1px solid rgba(96,165,250,.28);background:rgba(30,64,175,.18);font-family:var(--fd);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#c9e0ff}.sleeper-import-form{padding:14px;border:1px solid rgba(255,255,255,.11);border-radius:17px;background:rgba(8,14,24,.58);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.sleeper-import-form label{display:block;font-family:var(--fd);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#b7c9df;margin-bottom:6px}.sleeper-import-form input{width:100%;height:43px;border-radius:11px;border:1px solid rgba(125,188,255,.28);background:#111b2c;color:#f8fafc;padding:0 11px;font-family:var(--fb);font-size:13px;outline:none}.sleeper-import-form input:focus{border-color:#5aa8ff;box-shadow:0 0 0 3px rgba(90,168,255,.1)}.sleeper-import-form button{width:100%;height:44px;border-radius:999px;margin-top:9px;border:1px solid rgba(191,219,254,.45);background:linear-gradient(180deg,#87c7ff,#5aa8ff 42%,#2d84ea 74%,#1768cb);color:#061a35;font-family:var(--fd);font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.35px;cursor:pointer;box-shadow:inset 0 2px 0 rgba(239,246,255,.3),0 10px 18px rgba(0,0,0,.2),0 5px 12px rgba(59,130,246,.16)}.sleeper-import-note{font-size:10px;color:#7f93ad;text-align:center;margin-top:7px}@media(max-width:720px){.sleeper-import-card{grid-template-columns:1fr}.sleeper-import-card-title{font-size:25px}}`;
    document.head.appendChild(style);

    document.getElementById('sleeperLeagueOpenBtn')?.addEventListener('click',openLeague);
    document.getElementById('sleeperLeagueIdInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')openLeague()});
    document.querySelectorAll('.sport-card[data-sport]').forEach(card=>card.addEventListener('click',()=>setTimeout(syncVisibility,0)));
    syncVisibility();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build,{once:true});
  else build();
})();
