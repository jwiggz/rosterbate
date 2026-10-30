// Read-only: asks Sleeper's GraphQL API to describe its reaction and trade operations
// (names, arguments and types) so RosterBate can call them with the exact shapes Sleeper
// expects. Uses GraphQL introspection only; nothing is written to Sleeper.
const {resolveSleeperToken}=require('./sleeper-vault-lib');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'},body:JSON.stringify(body)}}
// Sleeper's GraphQL uses snake_case introspection fields (query_type, of_type, ...).
const TYPE='kind name of_type{kind name of_type{kind name of_type{kind name of_type{kind name}}}}';
const inner=t=>t?.of_type||t?.ofType;
function typeStr(t){if(!t)return'';if(t.kind==='NON_NULL')return`${typeStr(inner(t))}!`;if(t.kind==='LIST')return`[${typeStr(inner(t))}]`;return t.name||''}
function baseName(t){while(t&&inner(t))t=inner(t);return t?.name||''}
async function gql(token,query,variables={}){
  const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:token,'User-Agent':'RosterBate/1.0'},body:JSON.stringify({query,variables})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Sleeper HTTP ${r.status}`);if(d?.errors?.length)throw new Error(d.errors.map(e=>e.message).join('; '));return d.data;
}
exports.handler=async function(event){
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  try{const {connectLambda}=await import('@netlify/blobs');connectLambda(event)}catch{}
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid JSON'})}
  try{
    const {token}=await resolveSleeperToken(body,{allowRaw:false});
    const root=await gql(token,`query{__schema{mutation_type{name fields{name args{name type{${TYPE}}} type{${TYPE}}}} query_type{name fields{name args{name type{${TYPE}}} type{${TYPE}}}}}}`);
    const pick=(fields,re)=>(fields||[]).filter(f=>re.test(f.name)).map(f=>({name:f.name,returns:typeStr(f.type),args:(f.args||[]).map(a=>`${a.name}: ${typeStr(a.type)}`)}));
    const mutations=pick(root?.__schema?.mutation_type?.fields,/react|emoji|trade|propose|offer|counter/i);
    const queries=pick(root?.__schema?.query_type?.fields,/react|trade|transaction|message/i);
    // Describe the object/input types those operations use (Message, reaction and trade shapes).
    const wanted=new Set(['Message']);
    for(const f of [...(root?.__schema?.mutation_type?.fields||[]),...(root?.__schema?.query_type?.fields||[])]){
      if(!/react|emoji|trade|propose|offer|counter/i.test(f.name))continue;
      wanted.add(baseName(f.type));for(const a of f.args||[])wanted.add(baseName(a.type));
    }
    const scalars=new Set(['String','Int','Float','Boolean','ID','Snowflake','Json','Map','Date']);
    const types={};
    for(const name of [...wanted].filter(n=>n&&!scalars.has(n)).slice(0,25)){
      const q=n=>JSON.stringify(n);let t=null;
      for(const sel of [`name kind fields{name type{${TYPE}}}`,`name kind input_fields{name type{${TYPE}}}`,`name kind enum_values{name}`]){
        try{const d=await gql(token,`query{__type(name:${q(name)}){${sel}}}`);const x=d?.__type;if(!x)continue;t=t||{kind:x.kind,fields:[],enum:[]};
          for(const f of [...(x.fields||[]),...(x.input_fields||[])])t.fields.push(`${f.name}: ${typeStr(f.type)}`);for(const e of x.enum_values||[])t.enum.push(e.name);
        }catch{}
      }
      if(t)types[name]=t;
    }
    return json(200,{ok:true,generated:new Date().toISOString(),mutations,queries,types});
  }catch(e){return json(Number(e?.status)||502,{error:e?.message||String(e)})}
};
