exports.handler=async function(){
  // Deploy Preview branch names (for example "deploy-preview-6") are Netlify-only
  // and are not valid GitHub refs. Always read the dashboard from the feature branch
  // that backs this preview so companion scripts can be injected reliably.
  const ref='feature/sleeper-basketball-dashboard';
  const url=`https://raw.githubusercontent.com/jwiggz/rosterbate/${encodeURIComponent(ref)}/sleeper-basketball.html`;
  try{
    const r=await fetch(url,{headers:{Accept:'text/html','User-Agent':'RosterBate/1.0'},cache:'no-store'});
    if(!r.ok) throw new Error(`GitHub ${r.status}`);
    let html=await r.text();
    const scripts=[];
    // Stability guard must load first so optional decorators cannot reset lineup state.
    if(!html.includes('sleeper-stability.js')) scripts.push('<script src="/sleeper-stability.js"></script>');
    if(!html.includes('sleeper-team-stats.js')) scripts.push('<script src="/sleeper-team-stats.js"></script>');
    // Enforce Sleeper roster-slot order and remove stat sorting; retain only Per Game/Totals.
    if(!html.includes('sleeper-roster-order.js')) scripts.push('<script src="/sleeper-roster-order.js"></script>');
    if(!html.includes('sleeper-lock-sync.js')) scripts.push('<script src="/sleeper-lock-sync.js"></script>');
    // Safe avatar painter only changes styles/attributes on existing avatar circles.
    // It never inserts/removes roster child nodes, so lineup selection stays intact.
    if(!html.includes('sleeper-headshots-safe.js')) scripts.push('<script src="/sleeper-headshots-safe.js"></script>');
    if(!html.includes('sleeper-ui-polish.js')) scripts.push('<script src="/sleeper-ui-polish.js"></script>');
    if(scripts.length) html=html.replace('</body>',`${scripts.join('\n')}\n</body>`);
    return{statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate'},body:html};
  }catch(e){return{statusCode:502,headers:{'Content-Type':'text/plain; charset=utf-8'},body:`Unable to load basketball dashboard: ${String(e?.message||e)}`}}
};