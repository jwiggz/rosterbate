// Sleeper trades (vault-backed): list pending, propose (verified read-back), accept, reject/withdraw.
// propose_trade takes paired arrays: k_adds = player ids, v_adds = receiving roster ids;
// k_drops/v_drops = player ids and the roster losing each; waiver_budget = "sender:receiver:amount".
const {resolveSleeperToken,sleeperUserId}=require('./sleeper-vault-lib');
const API='https://api.sleeper.app/v1';
const TX='transaction_id status type leg created creator roster_ids consenter_ids adds drops waiver_budget draft_picks settings metadata';
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'},body:JSON.stringify(body)}}
async function gql(token,op,query,variables){
  const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'X-Sleeper-GraphQL-Op':op,'User-Agent':'RosterBate/1.0'},body:JSON.stringify({operationName:op,variables,query})});
  const d=await r.json().catch(()=>({}));
  if(r.status===401)throw Object.assign(new Error('Sleeper connection expired. Reconnect Lock Sync.'),{status:401});
  if(!r.ok)throw Object.assign(new Error(`Sleeper HTTP ${r.status}`),{status:r.status});
  if(d?.errors?.length)throw Object.assign(new Error(d.errors[0]?.message||'Sleeper rejected the request.'),{status:400});
  return d.data||{};
}
const int=v=>{const n=Number(v);return Number.isInteger(n)?n:NaN};
function wbList(v){return(Array.isArray(v)?v:[]).map(x=>{if(typeof x==='string'){const [s,r,a]=x.split(':').map(Number);return{sender:s,receiver:r,amount:a}}return{sender:Number(x?.sender),receiver:Number(x?.receiver),amount:Number(x?.amount)}}).filter(x=>x.amount>0)}
function sameMap(a,b){a=a||{};b=b||{};const ka=Object.keys(a),kb=Object.keys(b);return ka.length===kb.length&&ka.every(k=>Number(a[k])===Number(b[k]))}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{const {connectLambda}=await import('@netlify/blobs');connectLambda(event)}catch{}
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON'})}
  const leagueId=String(body.leagueId||'').trim(),leg=int(body.leg),action=String(body.action||'');
  if(!/^\d{10,25}$/.test(leagueId)||!(leg>=1&&leg<=40))return json(400,{error:'Invalid league or week.'});
  try{
    const {token}=await resolveSleeperToken(body,{allowRaw:false});
    const uid=String(sleeperUserId(token)||'');
    const rosters=await fetch(`${API}/league/${leagueId}/rosters`).then(r=>r.ok?r.json():[]).catch(()=>[]);
    const mine=Number((rosters||[]).find(r=>String(r.owner_id||'')===uid||(r.co_owners||[]).map(String).includes(uid))?.roster_id||0);
    if(!mine)return json(403,{error:'The connected Sleeper account has no roster in this league.'});
    const owner=new Map((rosters||[]).map(r=>[Number(r.roster_id),new Set((r.players||[]).map(String))]));

    if(action==='pending'){
      const d=await gql(token,'league_transactions_by_status',`query league_transactions_by_status($s:String!,$l:Int!,$lg:Snowflake!){league_transactions_by_status(status:$s,leg:$l,league_id:$lg){${TX}}}`,{s:'proposed',l:leg,lg:leagueId});
      const list=(d.league_transactions_by_status||[]).filter(t=>String(t.type)==='trade');
      return json(200,{ok:true,myRosterId:mine,trades:list});
    }
    if(action==='accept'||action==='reject'){
      const id=String(body.transactionId||'');if(!/^\d{5,25}$/.test(id))return json(400,{error:'Invalid trade.'});
      const op=action==='accept'?'accept_trade':'reject_trade';
      const d=await gql(token,op,`mutation ${op}($l:Int!,$lg:Snowflake!,$t:Snowflake!){${op}(leg:$l,league_id:$lg,transaction_id:$t){${TX}}}`,{l:leg,lg:leagueId,t:id});
      return json(200,{ok:true,trade:d[op]||null});
    }
    if(action!=='propose')return json(400,{error:'Unknown action.'});

    // ---- validate the proposal against live rosters ----
    const adds=body.adds&&typeof body.adds==='object'?body.adds:{},drops=body.drops&&typeof body.drops==='object'?body.drops:{};
    const faab=(Array.isArray(body.faab)?body.faab:[]).map(f=>({sender:int(f.from),receiver:int(f.to),amount:int(f.amount)})).filter(f=>f.amount>0);
    const rosterIds=new Set();
    for(const [pid,rid] of Object.entries(adds)){if(!/^\d+$/.test(pid)||!owner.has(int(rid)))return json(400,{error:'Invalid player or team in the trade.'});const from=int(drops[pid]);if(!owner.get(from)?.has(pid))return json(409,{error:`A player in this trade is no longer on that roster. Refresh and rebuild the trade.`});if(from===int(rid))return json(400,{error:'A player cannot be traded to his own team.'});rosterIds.add(int(rid));rosterIds.add(from)}
    for(const [pid,rid] of Object.entries(drops)){if(!owner.get(int(rid))?.has(pid))return json(409,{error:'A player in this trade is no longer on that roster. Refresh and rebuild the trade.'});if(!(pid in adds)&&int(rid)!==mine)return json(400,{error:'You can only choose drops for your own roster.'})}
    for(const f of faab){if(!owner.has(f.sender)||!owner.has(f.receiver)||f.sender===f.receiver||f.amount<0)return json(400,{error:'Invalid FAAB transfer.'});rosterIds.add(f.sender);rosterIds.add(f.receiver)}
    if(!rosterIds.has(mine))return json(400,{error:'Your team must be part of the trade.'});
    if(rosterIds.size<2)return json(400,{error:'A trade needs at least two teams.'});
    const k_adds=Object.keys(adds),v_adds=k_adds.map(p=>int(adds[p])),k_drops=Object.keys(drops),v_drops=k_drops.map(p=>int(drops[p]));
    const waiver_budget=faab.length?faab.map(f=>`${f.sender}:${f.receiver}:${f.amount}`):null;
    const d=await gql(token,'propose_trade',`mutation propose_trade($lg:Snowflake!,$ka:[String],$va:[Int],$kd:[String],$vd:[Int],$wb:[String]){propose_trade(league_id:$lg,k_adds:$ka,v_adds:$va,k_drops:$kd,v_drops:$vd,waiver_budget:$wb){${TX}}}`,{lg:leagueId,ka:k_adds,va:v_adds,kd:k_drops,vd:v_drops,wb:waiver_budget});
    const t=d.propose_trade;
    if(!t?.transaction_id)return json(502,{error:'Sleeper did not return the new trade.'});
    // ---- verify what Sleeper stored; withdraw anything that doesn't match ----
    const want=wbList(waiver_budget),got=wbList(t.waiver_budget);
    const wbOk=want.length===got.length&&want.every(w=>got.some(g=>g.sender===w.sender&&g.receiver===w.receiver&&g.amount===w.amount));
    const ok=sameMap(t.adds,adds)&&sameMap(t.drops,drops)&&wbOk;
    if(!ok){
      let withdrawn=false;try{await gql(token,'reject_trade',`mutation reject_trade($l:Int!,$lg:Snowflake!,$t:Snowflake!){reject_trade(leg:$l,league_id:$lg,transaction_id:$t){transaction_id status}}`,{l:int(t.leg)||leg,lg:leagueId,t:String(t.transaction_id)});withdrawn=true}catch{}
      return json(502,{error:withdrawn?'Sleeper stored the trade differently than RosterBate built it, so it was withdrawn immediately. Nothing was sent to your leaguemates for review.':'Sleeper stored the trade differently than RosterBate built it, and the automatic withdraw failed. Cancel it in the Sleeper app.',sent:{adds,drops,waiver_budget},stored:{adds:t.adds,drops:t.drops,waiver_budget:t.waiver_budget},withdrawn});
    }
    return json(200,{ok:true,trade:t});
  }catch(e){return json(Number(e?.status)||502,{error:e?.message||String(e)})}
};
