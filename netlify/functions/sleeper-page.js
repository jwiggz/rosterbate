exports.handler=async function(){
  const ref='feature/sleeper-basketball-dashboard';
  const url=`https://raw.githubusercontent.com/jwiggz/rosterbate/${encodeURIComponent(ref)}/sleeper-basketball.html`;
  try{
    const r=await fetch(url,{headers:{Accept:'text/html','User-Agent':'RosterBate/1.0'},cache:'no-store'});
    if(!r.ok) throw new Error(`GitHub ${r.status}`);
    let html=await r.text();
    const scripts=[];
    if(!html.includes('sleeper-stability.js')) scripts.push('<script src="/sleeper-stability.js"></script>');
    if(!html.includes('sleeper-team-stats.js')) scripts.push('<script src="/sleeper-team-stats.js"></script>');
    if(!html.includes('sleeper-roster-order.js')) scripts.push('<script src="/sleeper-roster-order.js"></script>');
    if(!html.includes('sleeper-lock-sync.js')) scripts.push('<script src="/sleeper-lock-sync.js"></script>');
    if(!html.includes('sleeper-headshots-safe.js')) scripts.push('<script src="/sleeper-headshots-safe.js"></script>');
    if(!html.includes('sleeper-ui-polish.js')) scripts.push('<script src="/sleeper-ui-polish.js"></script>');
    if(!html.includes('sleeper-connect-refresh.js')) scripts.push('<script src="/sleeper-connect-refresh.js"></script>');
    if(!html.includes('sleeper-activity.js')) scripts.push('<script src="/sleeper-activity.js"></script>');
    if(scripts.length) html=html.replace('</body>',`${scripts.join('\n')}\n</body>`);
    return{statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate'},body:html};
  }catch(e){return{statusCode:502,headers:{'Content-Type':'text/plain; charset=utf-8'},body:`Unable to load basketball dashboard: ${String(e?.message||e)}`}}
};