const {resolveSleeperToken,sleeperUserId}=require('./sleeper-vault-lib');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'},body:JSON.stringify(body)}}
async function fetchJson(url){const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});if(!r.ok)return null;return r.json().catch(()=>null)}
async function gqlFields(token,leagueId,round,rosterId,fields,mode){const query=`query matchup_legs { matchup_legs(league_id: \"${leagueId}\", round: ${round}) { ${fields.join(' ')} } }`;const response=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'X-Sleeper-GraphQL-Op':'matchup_legs','User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName:'matchup_legs',variables:{},query})});const text=await response.text();let data;try{data=JSON.parse(text)}catch{data={raw:text.slice(0,1000)}}if(!response.ok)return{round,mode,error:`HTTP ${response.status}`,data};if(Array.isArray(data?.errors)&&data.errors.length)return{round,mode,error:data.errors.map(x=>x?.message||'GraphQL error').join('; '),data};const rows=Array.isArray(data?.data?.matchup_legs)?data.data.matchup_legs:[],row=rows.find(x=>Number(x.roster_id)===rosterId)||null;return{round,mode,row}}
async function readRound(token,leagueId,round,rosterId){const baseFields=['roster_id','matchup_id','starters','starters_games','points'];const base=await gqlFields(token,leagueId,round,rosterId,baseFields,'base');if(!base.row)return{round,mode:'failed',error:base.error||'No matchup row',row:null,probes:[]};const row={...base.row},probes=[];for(const field of ['starters_points','player_map','custom_points','proj_points','subs']){const probe=await gqlFields(token,leagueId,round,rosterId,['roster_id',field],`probe:${field}`);probes.push({field,ok:!!probe.row,error:probe.error||null});if(probe.row&&Object.prototype.hasOwnProperty.call(probe.row,field))row[field]=probe.row[field]}return{round,mode:'merged',row,probes}}
function normStarters(v){return Array.isArray(v)?v.map(String):[]}
function sameStarters(a,b){a=normStarters(a);b=normStarters(b);return a.length===b.length&&a.every((x,i)=>x===b[i])}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function summary(v){if(Array.isArray(v))return{type:'array',length:v.length};if(v&&typeof v==='object')return{type:'object',keys:Object.keys(v).slice(0,30),count:Object.keys(v).length};return{type:typeof v,value:v==null?null:String(v).slice(0,120)}}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{const {connectLambda}=await import('@netlify/blobs');connectLambda(event)}catch(e){return json(500,{error:e?.message||'Unable to initialize encrypted vault storage.',code:'BLOBS_INIT_FAILED'})}
  let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON body'})}
  const leagueId=String(body.leagueId||'').trim(),rosterId=Number(body.rosterId),leg=Number(body.leg??body.round),round=Number(body.round??body.leg);
  if(!/^\d{10,25}$/.test(leagueId)||!Number.isInteger(rosterId)||rosterId<1||!Number.isInteger(round)||round<1||round>40||!Number.isInteger(leg)||leg<1||leg>40)return json(400,{error:'Invalid Sleeper target.'});
  try{
    const credential=await resolveSleeperToken(body,{allowRaw:true}),token=credential.token,userId=sleeperUserId(token);
    if(!/^\d+$/.test(userId))return json(401,{error:'Unable to identify the Sleeper account from this connection.'});
    const [rosters,publicMatchups]=await Promise.all([fetchJson(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),fetchJson(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${leg}`)]);
    const targetRoster=Array.isArray(rosters)?rosters.find(x=>Number(x.roster_id)===rosterId):null;
    if(!targetRoster)return json(404,{error:'Roster not found.'});
    if(String(targetRoster.owner_id||'')!==userId)return json(403,{error:'You can only load private lock state for the Sleeper roster owned by the connected account.'});
    const publicRow=Array.isArray(publicMatchups)?publicMatchups.find(x=>Number(x.roster_id)===rosterId):null,publicStarters=normStarters(publicRow?.starters);
    const requestedRead=await readRound(token,leagueId,round,rosterId);
    if(!requestedRead.row)return json(404,{error:'Roster lock state not found for the requested matchup week.',queriedRounds:[round],reads:[{round:requestedRead.round,mode:requestedRead.mode,error:requestedRead.error||null,probes:requestedRead.probes||[]}]});
    const chosen=requestedRead.row,startersGames=obj(chosen.starters_games);
    const neighborRounds=[...new Set([Math.max(1,round-1),Math.min(40,round+1)])].filter(r=>r!==round),neighborReads=[];
    for(const r of neighborRounds)neighborReads.push(await readRound(token,leagueId,r,rosterId));
    const reads=[requestedRead,...neighborReads];
    return json(200,{ok:true,credentialSource:credential.source,starters:normStarters(chosen.starters),startersGames,startersPoints:Array.isArray(chosen.starters_points)?chosen.starters_points:[],playerMap:obj(chosen.player_map),customPoints:obj(chosen.custom_points),projPoints:obj(chosen.proj_points),subs:obj(chosen.subs),points:chosen.points,matchupId:chosen.matchup_id,queriedRounds:[round,...neighborRounds],chosenRound:round,chosenMode:requestedRead.mode,matchedPublicStarters:sameStarters(chosen.starters,publicStarters),lockCount:Object.keys(startersGames).length,reads:reads.map(x=>({round:x.round,mode:x.mode,error:x.error||null,probes:x.probes||[]})),diagnostic:{startersGames:summary(chosen.starters_games),playerMap:summary(chosen.player_map),customPoints:summary(chosen.custom_points),projPoints:summary(chosen.proj_points),subs:summary(chosen.subs),startersPoints:summary(chosen.starters_points)}})});
  }catch(error){return json(Number(error?.status)||502,{error:error?.message||'Unable to reach Sleeper.',code:error?.code||null})}
};
