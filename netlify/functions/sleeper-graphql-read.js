const {resolveSleeperToken}=require('./sleeper-vault-lib');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'},body:JSON.stringify(body)}}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{const {connectLambda}=await import('@netlify/blobs');connectLambda(event)}catch(e){return json(500,{error:e?.message||'Unable to initialize encrypted vault storage.',code:'BLOBS_INIT_FAILED'})}
  let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON body'})}
  const operationName=String(body.operationName||'').trim();
  const query=String(body.query||'');
  if(operationName!=='matchup_legs'||!/\bmatchup_legs\s*\(/.test(query)||/\bmutation\b/i.test(query))return json(403,{error:'Only read-only matchup_legs queries are allowed through this endpoint.'});
  try{
    const credential=await resolveSleeperToken({firebaseIdToken:body.firebaseIdToken},{allowRaw:false});
    const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:credential.token,'X-Sleeper-GraphQL-Op':'matchup_legs','User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName:'matchup_legs',variables:body.variables&&typeof body.variables==='object'?body.variables:{},query})});
    const text=await r.text();
    return{statusCode:r.status,headers:{'Content-Type':r.headers.get('content-type')||'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'},body:text};
  }catch(e){return json(Number(e?.status)||502,{error:e?.message||'Unable to read Sleeper private state.',code:e?.code||null})}
};
