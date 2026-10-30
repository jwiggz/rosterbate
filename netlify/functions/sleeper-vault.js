const {normalizeSleeperToken,validSleeperToken,sleeperUserId,verifyFirebaseIdToken,saveEncrypted,loadRecord,deleteRecord}=require('./sleeper-vault-lib');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'},body:JSON.stringify(body)}}
async function fetchJson(url){const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});if(!r.ok)return null;return r.json().catch(()=>null)}
async function verifySleeper(token,leagueId,rosterId,round){
  const sid=sleeperUserId(token);
  if(!/^\d+$/.test(sid))throw Object.assign(new Error('Unable to identify the Sleeper account from this session token.'),{status:401});
  const rosters=await fetchJson(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
  const roster=Array.isArray(rosters)?rosters.find(x=>Number(x.roster_id)===Number(rosterId)):null;
  if(!roster)throw Object.assign(new Error('Roster not found.'),{status:404});
  const ownerId=String(roster.owner_id||'');
  if(ownerId!==sid){
    const err=Object.assign(new Error('This Sleeper session does not own the linked roster.'),{status:403});
    err.safeDetails={sessionUserId:sid,rosterOwnerId:ownerId,rosterId:Number(rosterId)};
    throw err;
  }
  const query=`query matchup_legs { matchup_legs(league_id: \"${leagueId}\", round: ${round}) { roster_id starters_games } }`;
  const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'X-Sleeper-GraphQL-Op':'matchup_legs','User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName:'matchup_legs',variables:{},query})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(`Sleeper rejected this session (${r.status}).`),{status:r.status===401?401:400});
  if(Array.isArray(data?.errors)&&data.errors.length)throw Object.assign(new Error(data.errors[0]?.message||'Sleeper rejected this session.'),{status:400});
  const row=(Array.isArray(data?.data?.matchup_legs)?data.data.matchup_legs:[]).find(x=>Number(x.roster_id)===Number(rosterId));
  if(!row)throw Object.assign(new Error('Unable to verify private matchup state for this roster.'),{status:404});
  return{sleeperUserId:sid,lockCount:Object.keys((row.starters_games&&typeof row.starters_games==='object')?row.starters_games:{}).length};
}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{const {connectLambda}=await import('@netlify/blobs');connectLambda(event)}catch(e){return json(500,{error:e?.message||'Unable to initialize encrypted vault storage.',code:'BLOBS_INIT_FAILED'})}
  let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON body'})}
  const action=String(body.action||'status');
  try{
    const auth=await verifyFirebaseIdToken(body.firebaseIdToken);
    if(action==='status'){
      const record=await loadRecord(auth.uid);
      return json(200,{ok:true,connected:!!record,sleeperUserId:String(record?.sleeperUserId||''),verifiedAt:record?.verifiedAt||null,leagueId:record?.leagueId||'',rosterId:Number(record?.rosterId||0)});
    }
    if(action==='delete'){
      await deleteRecord(auth.uid);
      return json(200,{ok:true,connected:false});
    }
    if(action!=='save')return json(400,{error:'Unknown vault action.'});
    const token=normalizeSleeperToken(body.sleeperToken);
    const leagueId=String(body.leagueId||'').trim(),rosterId=Number(body.rosterId),round=Number(body.round??body.leg);
    if(!validSleeperToken(token))return json(400,{error:'That is not a valid Sleeper session token.'});
    if(!/^\d{10,25}$/.test(leagueId)||!Number.isInteger(rosterId)||rosterId<1||!Number.isInteger(round)||round<1||round>40)return json(400,{error:'Invalid Sleeper target.'});
    const verified=await verifySleeper(token,leagueId,rosterId,round);
    const linked=String(body.linkedSleeperUserId||'').trim();
    if(linked&&linked!==verified.sleeperUserId)return json(403,{error:'The Sleeper session belongs to a different Sleeper account than the one linked to RosterBate.',details:{sessionUserId:verified.sleeperUserId,linkedSleeperUserId:linked,rosterId}});
    const existing=await loadRecord(auth.uid).catch(()=>null);
    await saveEncrypted(auth.uid,token,{sleeperUserId:verified.sleeperUserId,leagueId,rosterId,createdAt:existing?.createdAt});
    return json(200,{ok:true,connected:true,sleeperUserId:verified.sleeperUserId,lockCount:verified.lockCount});
  }catch(e){return json(Number(e?.status)||500,{error:e?.message||'Unable to update Lock Sync vault.',code:e?.code||null,details:e?.safeDetails||null})}
};
