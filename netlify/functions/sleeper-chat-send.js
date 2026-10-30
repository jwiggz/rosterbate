const crypto=require('crypto');

function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'},body:JSON.stringify(body)}}
function normalizeToken(value){let token=String(value||'').trim();token=token.replace(/^authorization\s*:\s*/i,'').trim();token=token.replace(/^bearer\s+/i,'').trim();if((token.startsWith('"')&&token.endsWith('"'))||(token.startsWith("'")&&token.endsWith("'")))token=token.slice(1,-1).trim();return token}
function validToken(value){return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value||''))}

async function sleeperTokenFrom(body,event){
  // Vault-backed when the browser sent a Firebase ID token; otherwise a raw token (legacy).
  if(body&&body.firebaseIdToken){
    try{const {connectLambda}=await import('@netlify/blobs');connectLambda(event)}catch{}
    const {resolveSleeperToken}=require('./sleeper-vault-lib');
    return (await resolveSleeperToken(body,{allowRaw:false})).token;
  }
  return normalizeToken(body&&body.token);
}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON body'})}
  let token='';try{token=await sleeperTokenFrom(body,event)}catch(e){return json(Number(e?.status)||401,{error:e?.message||'Connect Sleeper to chat.'})}const leagueId=String(body.leagueId||'').trim(),text=String(body.text||'').trim();
  if(!validToken(token))return json(401,{error:'A valid Sleeper session token is required.'});
  if(!/^\d{10,25}$/.test(leagueId))return json(400,{error:'A valid Sleeper league id is required.'});
  if(!text||text.length>2000)return json(400,{error:'Chat message must be between 1 and 2000 characters.'});

  const clientId=crypto.randomUUID();
  const fields='attachment author_display_name author_id created message_id parent_id parent_type pinned text text_map';
  const query=`mutation create_message($text: String) { create_message(parent_id: ${JSON.stringify(leagueId)}, client_id: ${JSON.stringify(clientId)}, parent_type: "league", text: $text) { ${fields} } }`;
  try{
    const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'X-Sleeper-GraphQL-Op':'create_message','User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName:'create_message',variables:{text},query})});
    let d={};try{d=await r.json()}catch{}
    if(r.status===401)return json(401,{error:'Sleeper connection expired. Reconnect Sleeper and try again.'});
    if(r.status===403)return json(403,{error:'Sleeper denied permission to post this chat message.'});
    if(!r.ok)return json(r.status,{error:`Sleeper chat request failed (HTTP ${r.status}).`});
    if(Array.isArray(d?.errors)&&d.errors.length)return json(400,{error:d.errors[0]?.message||'Sleeper rejected the chat message.'});
    const message=d?.data?.create_message;
    if(!message?.message_id)return json(502,{error:'Sleeper did not confirm the chat message.'});
    return json(200,{ok:true,message,clientId});
  }catch(error){return json(502,{error:'Unable to reach Sleeper chat.',detail:String(error?.message||error)})}
};
