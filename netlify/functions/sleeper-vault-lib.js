const crypto=require('crypto');

const FIREBASE_API_KEY='AIzaSyAs8NPmI_BF9ggyWHZz-lUojGQPJ6gdazQ';
const STORE_NAME='sleeper-credentials-v1';

function normalizeSleeperToken(value){
  let token=String(value||'').trim();
  token=token.replace(/^authorization\s*:\s*/i,'').trim();
  token=token.replace(/^bearer\s+/i,'').trim();
  if((token.startsWith('"')&&token.endsWith('"'))||(token.startsWith("'")&&token.endsWith("'")))token=token.slice(1,-1).trim();
  return token;
}
function validSleeperToken(value){return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value||''))}
function sleeperUserId(token){
  try{
    const part=String(token||'').split('.')[1]||'';
    const b64=part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4);
    const json=Buffer.from(b64,'base64').toString('utf8');
    const quoted=json.match(/"user_id"\s*:\s*"(\d+)"/);
    if(quoted)return quoted[1];
    const numeric=json.match(/"user_id"\s*:\s*(\d+)/);
    if(numeric)return numeric[1];
    const payload=JSON.parse(json);
    return String(payload?.user_id||'');
  }catch{return''}
}
function vaultKey(){
  const raw=String(process.env.SLEEPER_VAULT_KEY||'').trim();
  if(/^[A-Fa-f0-9]{64}$/.test(raw))return Buffer.from(raw,'hex');
  try{const b=Buffer.from(raw,'base64');if(b.length===32)return b}catch{}
  throw Object.assign(new Error('SLEEPER_VAULT_KEY must be a 32-byte base64 value or 64-character hex value.'),{status:503,code:'VAULT_KEY_MISSING'});
}
function encryptToken(token,uid){
  const iv=crypto.randomBytes(12),key=vaultKey();
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(`rosterbate:sleeper:v1:${uid}`));
  const ciphertext=Buffer.concat([cipher.update(String(token),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return{v:1,alg:'A256GCM',iv:iv.toString('base64'),tag:tag.toString('base64'),ciphertext:ciphertext.toString('base64')};
}
function decryptToken(record,uid){
  if(!record||Number(record.v)!==1||record.alg!=='A256GCM')throw Object.assign(new Error('Stored Sleeper credential format is not supported.'),{status:500});
  const decipher=crypto.createDecipheriv('aes-256-gcm',vaultKey(),Buffer.from(record.iv,'base64'));
  decipher.setAAD(Buffer.from(`rosterbate:sleeper:v1:${uid}`));
  decipher.setAuthTag(Buffer.from(record.tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(record.ciphertext,'base64')),decipher.final()]).toString('utf8');
}
async function verifyFirebaseIdToken(idToken){
  idToken=String(idToken||'').trim();
  if(!idToken)throw Object.assign(new Error('RosterBate sign-in is required.'),{status:401});
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})
  });
  const data=await r.json().catch(()=>({}));
  const user=Array.isArray(data?.users)?data.users[0]:null;
  if(!r.ok||!user?.localId)throw Object.assign(new Error('Your RosterBate sign-in expired. Sign in again and retry.'),{status:401});
  return{uid:String(user.localId),email:String(user.email||''),idToken};
}
async function store(){
  const {getStore}=await import('@netlify/blobs');
  return getStore(STORE_NAME);
}
async function saveEncrypted(uid,token,meta={}){
  const s=await store();
  const encrypted=encryptToken(token,uid);
  const now=new Date().toISOString();
  const record={...encrypted,sleeperUserId:String(meta.sleeperUserId||sleeperUserId(token)||''),createdAt:String(meta.createdAt||now),verifiedAt:now,leagueId:String(meta.leagueId||''),rosterId:Number(meta.rosterId||0)};
  await s.setJSON(String(uid),record,{metadata:{uid:String(uid),sleeperUserId:record.sleeperUserId,verifiedAt:record.verifiedAt}});
  return record;
}
async function loadRecord(uid){
  const s=await store();
  return await s.get(String(uid),{type:'json',consistency:'strong'});
}
async function deleteRecord(uid){const s=await store();await s.delete(String(uid))}
async function resolveSleeperToken(body,{allowRaw=true}={}){
  const firebaseIdToken=String(body?.firebaseIdToken||'').trim();
  if(firebaseIdToken){
    const auth=await verifyFirebaseIdToken(firebaseIdToken);
    const record=await loadRecord(auth.uid);
    if(!record)throw Object.assign(new Error('Lock Sync is not connected for this RosterBate account.'),{status:401,code:'VAULT_EMPTY'});
    let token;
    try{token=decryptToken(record,auth.uid)}catch(e){throw Object.assign(new Error('Stored Lock Sync credential could not be decrypted. Reconnect Lock Sync.'),{status:401,code:'VAULT_DECRYPT_FAILED'});}
    if(!validSleeperToken(token))throw Object.assign(new Error('Stored Lock Sync credential is invalid. Reconnect Lock Sync.'),{status:401});
    return{token,uid:auth.uid,record,firebase:auth,source:'vault'};
  }
  if(allowRaw){
    const token=normalizeSleeperToken(body?.token);
    if(validSleeperToken(token))return{token,uid:'',record:null,firebase:null,source:'raw'};
  }
  throw Object.assign(new Error('A verified Lock Sync connection is required.'),{status:401});
}
module.exports={normalizeSleeperToken,validSleeperToken,sleeperUserId,verifyFirebaseIdToken,saveEncrypted,loadRecord,deleteRecord,resolveSleeperToken,decryptToken};
