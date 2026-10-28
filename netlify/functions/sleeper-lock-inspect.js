function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'},body:JSON.stringify(body)}}
function normalizeToken(value){let token=String(value||'').trim();token=token.replace(/^authorization\s*:\s*/i,'').trim();token=token.replace(/^bearer\s+/i,'').trim();if((token.startsWith('"')&&token.endsWith('"'))||(token.startsWith("'")&&token.endsWith("'")))token=token.slice(1,-1).trim();return token}
function validToken(value){return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value||''))}
function tokenUserId(token){try{const part=String(token||'').split('.')[1]||'';const b64=part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4);const raw=Buffer.from(b64,'base64').toString('utf8');const m=raw.match(/"user_id"\s*:\s*(?:"(\d+)"|(\d+))/);return String(m?.[1]||m?.[2]||'')}catch{return''}}
async function gql(token,query,operationName='LockInspect'){
  const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'X-Sleeper-GraphQL-Op':operationName,'User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName,variables:{},query})});
  const text=await r.text();let body;try{body=JSON.parse(text)}catch{body={raw:text.slice(0,2000)}}
  if(!r.ok)throw Object.assign(new Error(`Sleeper HTTP ${r.status}`),{status:r.status,body});
  if(Array.isArray(body?.errors)&&body.errors.length)throw Object.assign(new Error(body.errors.map(x=>x?.message||'GraphQL error').join('; ')),{status:400,body});
  return body?.data||{};
}
function unwrap(t){let cur=t,depth=0;while(cur&&cur.ofType&&depth++<8)cur=cur.ofType;return cur||{}}
function renderType(t){if(!t)return'';if(t.kind==='NON_NULL')return `${renderType(t.ofType)}!`;if(t.kind==='LIST')return `[${renderType(t.ofType)}]`;return t.name||t.kind||''}
function typeSelection(){return 'kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } }'}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON body'})}
  const token=normalizeToken(body.token),leagueId=String(body.leagueId||'').trim(),rosterId=Number(body.rosterId),round=Number(body.round??body.leg);
  if(!validToken(token))return json(400,{error:'A valid Sleeper session token is required.'});
  if(!/^\d{10,25}$/.test(leagueId)||!Number.isInteger(rosterId)||rosterId<1||!Number.isInteger(round)||round<1||round>40)return json(400,{error:'Invalid Sleeper target.'});
  const uid=tokenUserId(token);if(!uid)return json(401,{error:'Unable to identify Sleeper user.'});
  try{
    const rr=await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});const rosters=rr.ok?await rr.json():[];const target=Array.isArray(rosters)?rosters.find(x=>Number(x.roster_id)===rosterId):null;if(!target)return json(404,{error:'Roster not found.'});if(String(target.owner_id||'')!==uid)return json(403,{error:'You can only inspect private lock state for your connected Sleeper roster.'});
    const q1=`query LockInspect { __schema { queryType { fields { name type { ${typeSelection()} } } } } }`;
    const d1=await gql(token,q1);const mf=(d1?.__schema?.queryType?.fields||[]).find(f=>f.name==='matchup_legs');if(!mf)return json(404,{error:'matchup_legs was not found in Sleeper schema.'});const base=unwrap(mf.type);if(!base.name)return json(500,{error:'Unable to resolve matchup_legs return type.',type:mf.type});
    const q2=`query LockInspect { __type(name: \"${base.name}\") { name fields { name type { ${typeSelection()} } } } }`;
    const d2=await gql(token,q2);const fields=d2?.__type?.fields||[];
    const interesting=/lock|starter|game|player|sub|point|score|eligible|matchup|roster|round|leg|custom|map/i;
    const candidates=fields.filter(f=>interesting.test(f.name)).map(f=>({name:f.name,type:renderType(f.type),base:unwrap(f.type)}));
    const leaf=candidates.filter(f=>['SCALAR','ENUM'].includes(f.base?.kind)).map(f=>f.name);
    for(const required of ['roster_id','matchup_id','starters','starters_games'])if(fields.some(f=>f.name===required)&&!leaf.includes(required))leaf.push(required);
    let row=null,queryError=null;
    if(leaf.length){
      const q3=`query LockInspect { matchup_legs(league_id: \"${leagueId}\", round: ${round}) { ${leaf.join(' ')} } }`;
      try{const d3=await gql(token,q3);row=(Array.isArray(d3?.matchup_legs)?d3.matchup_legs:[]).find(x=>Number(x.roster_id)===rosterId)||null}catch(e){queryError={message:e.message,body:e.body||null}}
    }
    return json(200,{ok:true,matchupLegType:base.name,allFields:fields.map(f=>({name:f.name,type:renderType(f.type),baseKind:unwrap(f.type)?.kind||null,baseName:unwrap(f.type)?.name||null})),candidateFields:candidates.map(f=>({name:f.name,type:f.type,baseKind:f.base?.kind||null,baseName:f.base?.name||null})),queriedFields:leaf,row,queryError});
  }catch(error){return json(Number(error?.status)||502,{error:error?.message||'Unable to inspect Sleeper.',sleeper:error?.body||null})}
};
