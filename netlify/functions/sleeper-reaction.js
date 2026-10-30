// Add or remove an emoji reaction on a Sleeper league chat message (vault-backed).
const {resolveSleeperToken}=require('./sleeper-vault-lib');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'},body:JSON.stringify(body)}}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{const {connectLambda}=await import('@netlify/blobs');connectLambda(event)}catch{}
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON'})}
  const leagueId=String(body.leagueId||'').trim(),messageId=String(body.messageId||'').trim(),reaction=String(body.reaction||'').trim(),remove=body.action==='remove';
  if(!/^\d{10,25}$/.test(leagueId)||!/^\d{5,25}$/.test(messageId))return json(400,{error:'Invalid league or message.'});
  // Sleeper reactions are short names ("eyes", "skull", "meme_..."), never free text.
  if(!/^[a-z0-9_]{1,48}$/.test(reaction))return json(400,{error:'Invalid reaction.'});
  try{
    const {token}=await resolveSleeperToken(body,{allowRaw:false});
    const op=remove?'delete_reaction':'create_reaction';
    const query=`mutation ${op}($m:Snowflake!,$p:Snowflake!,$r:String!){${op}(message_id:$m,parent_id:$p,reaction:$r){message_id reaction reactor_id}}`;
    const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'X-Sleeper-GraphQL-Op':op,'User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName:op,variables:{m:messageId,p:leagueId,r:reaction},query})});
    const d=await r.json().catch(()=>({}));
    if(r.status===401)return json(401,{error:'Sleeper connection expired. Reconnect Lock Sync.'});
    if(!r.ok)return json(r.status,{error:`Sleeper reaction failed (HTTP ${r.status}).`});
    if(d?.errors?.length)return json(400,{error:d.errors[0]?.message||'Sleeper rejected the reaction.'});
    return json(200,{ok:true,result:d?.data?.[op]||null});
  }catch(e){return json(Number(e?.status)||502,{error:e?.message||String(e)})}
};
