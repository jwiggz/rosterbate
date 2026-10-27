exports.handler=async function(){
  // Deploy Preview branch names (for example "deploy-preview-6") are Netlify-only
  // and are not valid GitHub refs. Always read the dashboard from the feature branch
  // that backs this preview so the stats script can be injected reliably.
  const ref='feature/sleeper-basketball-dashboard';
  const url=`https://raw.githubusercontent.com/jwiggz/rosterbate/${encodeURIComponent(ref)}/sleeper-basketball.html`;
  try{
    const r=await fetch(url,{headers:{Accept:'text/html','User-Agent':'RosterBate/1.0'},cache:'no-store'});
    if(!r.ok) throw new Error(`GitHub ${r.status}`);
    let html=await r.text();
    if(!html.includes('sleeper-team-stats.js')) html=html.replace('</body>','<script src="/sleeper-team-stats.js"></script>\n</body>');
    return{statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate'},body:html};
  }catch(e){return{statusCode:502,headers:{'Content-Type':'text/plain; charset=utf-8'},body:`Unable to load basketball dashboard: ${String(e?.message||e)}`}}
};