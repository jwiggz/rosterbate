exports.handler=async function(event){
  const league=String(event?.queryStringParameters?.league||'').trim();
  if(!/^\d{10,}$/.test(league)){
    return{statusCode:302,headers:{Location:'/sleeper-leagues.html','Cache-Control':'no-store'},body:''};
  }
  const ref='main';
  const url=`https://raw.githubusercontent.com/jwiggz/rosterbate/${encodeURIComponent(ref)}/sleeper-basketball.html`;
  try{
    const r=await fetch(url,{headers:{Accept:'text/html','User-Agent':'RosterBate/1.0'},cache:'no-store'});
    if(!r.ok) throw new Error(`GitHub ${r.status}`);
    let html=await r.text();
    if(!html.includes('sleeper-ready-gate.css')) html=html.replace('</head>','<link rel="stylesheet" href="/sleeper-ready-gate.css?v=20261030a">\n</head>');
    html=html.replace('<body>','<body class="rb-initializing">');

    // The base dashboard's inline script normally calls load() immediately, before
    // the injected Firebase/vault scripts at the end of <body> have executed.
    // Hold only the very first load until auth + vault bootstrap are available so
    // initial lock-state rendering matches a manual refresh. Always resolve vault
    // status after auth because branch-preview storage can start without the local
    // connected marker even when an encrypted server-side vault already exists.
    const eagerBoot='updateConnect();load();';
    if(html.includes(eagerBoot)){
      const gatedBoot=`updateConnect();(async function rbInitialDashboardBoot(){
        for(let i=0;i<150&&!window.rbSleeperVault;i++)await new Promise(r=>setTimeout(r,20));
        try{if(window.rbAuthReady)await window.rbAuthReady}catch{}
        try{if(window.rbSleeperVault?.status)await window.rbSleeperVault.status()}catch{}
        await load();
      })();`;
      html=html.replace(eagerBoot,gatedBoot);
    }

    const scripts=[];
    if(!html.includes('firebase-app-compat.js')) scripts.push('<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>');
    if(!html.includes('firebase-auth-compat.js')) scripts.push('<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script>');
    if(!html.includes('firebase-database-compat.js')) scripts.push('<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js"></script>');
    if(!html.includes('rosterbate-account-storage.js')) scripts.push('<script src="/rosterbate-account-storage.js?v=20261030a"></script>');
    if(!html.includes('sleeper-token-sanity.js')) scripts.push('<script src="/sleeper-token-sanity.js?v=20261030a"></script>');
    if(!html.includes('rosterbate-firebase-session.js')) scripts.push('<script src="/rosterbate-firebase-session.js?v=20261029a"></script>');
    if(!html.includes('sleeper-vault-client.js')) scripts.push('<script src="/sleeper-vault-client.js?v=20261030f"></script>');
    if(!html.includes('sleeper-ready-gate.js')) scripts.push('<script src="/sleeper-ready-gate.js?v=20261030d"></script>');
    if(!html.includes('sleeper-lock-bootstrap.js')) scripts.push('<script src="/sleeper-lock-bootstrap.js?v=20261028b"></script>');
    if(!html.includes('sleeper-stability.js')) scripts.push('<script src="/sleeper-stability.js?v=20261028c"></script>');
    if(!html.includes('sleeper-team-stats.js')) scripts.push('<script src="/sleeper-team-stats.js?v=20261028b"></script>');
    if(!html.includes('sleeper-stats-toolbar-label.js')) scripts.push('<script src="/sleeper-stats-toolbar-label.js?v=20261030b"></script>');
    if(!html.includes('sleeper-roster-order.js')) scripts.push('<script src="/sleeper-roster-order.js?v=20261030a"></script>');
    if(!html.includes('sleeper-lock-state-cache-v3.js')) scripts.push('<script src="/sleeper-lock-state-cache-v3.js?v=20261028a"></script>');
    if(!html.includes('sleeper-lock-sync.js')) scripts.push('<script src="/sleeper-lock-sync.js?v=20261030b"></script>');
    if(!html.includes('sleeper-opponent-lock-fix.js')) scripts.push('<script src="/sleeper-opponent-lock-fix.js?v=20261028f"></script>');
    if(!html.includes('sleeper-lock-summary-fix.js')) scripts.push('<script src="/sleeper-lock-summary-fix.js?v=20261030a"></script>');
    if(!html.includes('sleeper-headshots-safe.js')) scripts.push('<script src="/sleeper-headshots-safe.js?v=20261030b"></script>');
    if(!html.includes('sleeper-schedule-time-backfill.js')) scripts.push('<script src="/sleeper-schedule-time-backfill.js?v=20261029a"></script>');
    if(!html.includes('sleeper-starter-history.js')) scripts.push('<script src="/sleeper-starter-history.js?v=20261030a"></script>');
    if(!html.includes('sleeper-lock-window-vault.js')) scripts.push('<script src="/sleeper-lock-window-vault.js?v=20261030d"></script>');
    if(!html.includes('sleeper-lock-eligibility-guard.js')) scripts.push('<script src="/sleeper-lock-eligibility-guard.js?v=20261029b"></script>');
    if(!html.includes('sleeper-lock-authoritative-only.js')) scripts.push('<script src="/sleeper-lock-authoritative-only.js?v=20261029a"></script>');
    if(!html.includes('sleeper-ui-polish.js')) scripts.push('<script src="/sleeper-ui-polish.js?v=20261028b"></script>');
    if(!html.includes('sleeper-connect-refresh.js')) scripts.push('<script src="/sleeper-connect-refresh.js?v=20261030f"></script>');
    if(!html.includes('sleeper-guided-link.js')) scripts.push('<script src="/sleeper-guided-link.js?v=20261030c"></script>');
    if(!html.includes('sleeper-lock-sync-guidance.js')) scripts.push('<script src="/sleeper-lock-sync-guidance.js?v=20261030b"></script>');
    if(!html.includes('sleeper-activity.js')) scripts.push('<script src="/sleeper-activity.js?v=20261030b"></script>');
    if(!html.includes('sleeper-player-card.js')) scripts.push('<script src="/sleeper-player-card.js?v=20261030a"></script>');
    if(!html.includes('sleeper-player-result-colors.js')) scripts.push('<script src="/sleeper-player-result-colors.js?v=20261029a"></script>');
    if(!html.includes('sleeper-player-summary-fix.js')) scripts.push('<script src="/sleeper-player-summary-fix.js?v=20261029c"></script>');
    if(!html.includes('sleeper-player-summary-v2.js')) scripts.push('<script src="/sleeper-player-summary-v2.js?v=20261029d"></script>');
    if(!html.includes('sleeper-matchup-lockin.js')) scripts.push('<script src="/sleeper-matchup-lockin.js?v=20261030a"></script>');
    if(!html.includes('sleeper-matchup-header-polish.js')) scripts.push('<script src="/sleeper-matchup-header-polish.js?v=20261028a"></script>');
    if(!html.includes('sleeper-matchup-score-layout.js')) scripts.push('<script src="/sleeper-matchup-score-layout.js?v=20261028a"></script>');
    if(!html.includes('sleeper-team-header-polish.js')) scripts.push('<script src="/sleeper-team-header-polish.js?v=20261028a"></script>');
    if(!html.includes('sleeper-players-waiver.js')) scripts.push('<script src="/sleeper-players-waiver.js?v=20261028d"></script>');
    if(!html.includes('sleeper-waiver-ownership-colors.js')) scripts.push('<script src="/sleeper-waiver-ownership-colors.js?v=20261028a"></script>');
    if(!html.includes('sleeper-lock-pulse-scroll-fix.js')) scripts.push('<script src="/sleeper-lock-pulse-scroll-fix.js?v=20261029a"></script>');
    if(!html.includes('sleeper-future-day-points.js')) scripts.push('<script src="/sleeper-future-day-points.js?v=20261029b"></script>');
    if(!html.includes('sleeper-plan-ux.js')) scripts.push('<script src="/sleeper-plan-ux.js?v=20261029a"></script>');
    if(!html.includes('sleeper-production-polish.js')) scripts.push('<script src="/sleeper-production-polish.js?v=20261030f"></script>');
    if(!html.includes('sleeper-league-standings.js')) scripts.push('<script src="/sleeper-league-standings.js?v=20261030b"></script>');
    if(!html.includes('sleeper-scores-tab.js')) scripts.push('<script src="/sleeper-scores-tab.js?v=20261030b"></script>');
    if(!html.includes('sleeper-selection-ux.js')) scripts.push('<script src="/sleeper-selection-ux.js?v=20261030a"></script>');
    if(!html.includes('sleeper-header-status.js')) scripts.push('<script src="/sleeper-header-status.js?v=20261030a"></script>');
    if(!html.includes('sleeper-trades-tab.js')) scripts.push('<script src="/sleeper-trades-tab.js?v=20261030b"></script>');
    if(!html.includes('sleeper-past-lineup.js')) scripts.push('<script src="/sleeper-past-lineup.js?v=20261030a"></script>');
    if(scripts.length) html=html.replace('</body>',`${scripts.join('\n')}\n</body>`);
    return{statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate'},body:html};
  }catch(e){return{statusCode:502,headers:{'Content-Type':'text/plain; charset=utf-8'},body:`Unable to load basketball dashboard: ${String(e?.message||e)}`}}
};