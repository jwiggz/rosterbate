const API='https://api.sleeper.app/v1';
let playerCache=null,playerCacheAt=0;

function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'},body:JSON.stringify(body)}}
function normalizeToken(value){let token=String(value||'').trim();token=token.replace(/^authorization\s*:\s*/i,'').trim();token=token.replace(/^bearer\s+/i,'').trim();if((token.startsWith('"')&&token.endsWith('"'))||(token.startsWith("'")&&token.endsWith("'")))token=token.slice(1,-1).trim();return token}
function validToken(value){return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value||''))}
async function fetchJson(url){const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
async function nbaPlayers(){if(playerCache&&Date.now()-playerCacheAt<30*60*1000)return playerCache;playerCache=await fetchJson(`${API}/players/nba`);playerCacheAt=Date.now();return playerCache||{}}
function playerInfo(P,id){const p=P?.[String(id)]||{};return{id:String(id),name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||`Player ${id}`,position:p.position||'',team:String(p.team||'').toUpperCase()}}
async function readChat(token,leagueId){if(!validToken(token))return{items:[],auth:false};const query='query($lg:Snowflake!){messages(parent_id:$lg){message_id created author_display_name text pinned}}';const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'X-Sleeper-GraphQL-Op':'messages','User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName:'messages',variables:{lg:leagueId},query})});let d={};try{d=await r.json()}catch{}if(!r.ok||Array.isArray(d?.errors))return{items:[],auth:false,error:d?.errors?.[0]?.message||`HTTP ${r.status}`};const rows=Array.isArray(d?.data?.messages)?d.data.messages:[];return{auth:true,items:rows.map(m=>({kind:'chat',id:String(m.message_id||''),created:Number(m.created)||0,author:String(m.author_display_name||'Sleeper user'),text:String(m.text||''),pinned:!!m.pinned})).filter(x=>x.created&&x.text)}}

exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON body'})}
  const leagueId=String(body.leagueId||'').trim(),week=Math.max(1,Math.min(40,Number(body.week)||1)),token=normalizeToken(body.token);
  if(!/^\d{10,25}$/.test(leagueId))return json(400,{error:'A valid Sleeper league id is required.'});
  try{
    const rounds=[...new Set([week,Math.max(1,week-1)])];
    const [users,rosters,chat,...txLists]=await Promise.all([
      fetchJson(`${API}/league/${leagueId}/users`).catch(()=>[]),
      fetchJson(`${API}/league/${leagueId}/rosters`).catch(()=>[]),
      readChat(token,leagueId).catch(()=>({items:[],auth:false})),
      ...rounds.map(r=>fetchJson(`${API}/league/${leagueId}/transactions/${r}`).catch(()=>[]))
    ]);
    const userById=new Map((users||[]).map(u=>[String(u.user_id),u]));
    const rosterName=new Map((rosters||[]).map(r=>{const u=userById.get(String(r.owner_id))||{},md=u.metadata||{};return[Number(r.roster_id),String(md.team_name||u.display_name||`Roster ${r.roster_id}`)]}));
    const tx=[...new Map(txLists.flat().map(t=>[String(t.transaction_id||`${t.created}-${t.type}`),t])).values()].filter(t=>String(t.status||'').toLowerCase()==='complete');
    const ids=new Set();for(const t of tx){for(const id of Object.keys(t.adds||{}))ids.add(String(id));for(const id of Object.keys(t.drops||{}))ids.add(String(id))}
    const P=ids.size?await nbaPlayers().catch(()=>({})):{};
    const txItems=tx.map(t=>{
      const adds=Object.entries(t.adds||{}).map(([id,rid])=>({...playerInfo(P,id),roster_id:Number(rid)}));
      const drops=Object.entries(t.drops||{}).map(([id,rid])=>({...playerInfo(P,id),roster_id:Number(rid)}));
      const rosterIds=(t.roster_ids||[]).map(Number).filter(Number.isFinite);
      const names=rosterIds.map(r=>rosterName.get(r)||`Roster ${r}`);
      const bid=Number((t.settings||{}).waiver_bid);
      return{kind:'transaction',id:String(t.transaction_id||''),created:Number(t.status_updated||t.created)||0,type:String(t.type||'transaction'),status:String(t.status||''),roster_ids:rosterIds,roster_names:names,adds,drops,bid:Number.isFinite(bid)?bid:null};
    }).filter(x=>x.created);
    const items=[...chat.items,...txItems].sort((a,b)=>b.created-a.created).slice(0,60);
    return json(200,{ok:true,leagueId,week,chat_authenticated:!!chat.auth,chat_error:chat.error||null,items});
  }catch(error){return json(502,{error:'Unable to load Sleeper activity.',detail:String(error?.message||error)})}
};
