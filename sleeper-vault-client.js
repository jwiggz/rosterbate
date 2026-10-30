(()=>{
  const MARK='rbSleeperVaultConnected';
  const VERIFIED='rbSleeperLockSyncVerified';
  const PLACEHOLDER='__RB_SLEEPER_VAULT__';
  const LEGACY_KEYS=[['sessionStorage','rbSleeperToken'],['sessionStorage','rbSleeperAuth'],['localStorage','rbSleeperTokenPersistent']];
  const PRIVATE_ENDPOINTS=['sleeper-lock-state','sleeper-lineup-preserve','sleeper-lineup-write','sleeper-lock-in','sleeper-lock-inspect'];
  const validJwt=v=>/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(v||'').trim());
  const originalFetch=window.fetch.bind(window);
  let connected=false,statusPromise=null,statusStarted=false;
  function rawLegacyToken(){for(const [storeName,key] of LEGACY_KEYS){try{const v=window[storeName]?.getItem(key)||'';if(validJwt(v))return v}catch{}}return''}
  function clearRaw(){for(const [storeName,key] of LEGACY_KEYS){try{window[storeName]?.removeItem(key)}catch{}}}
  function hasMarker(){try{return localStorage.getItem(MARK)==='1'}catch{return false}}
  function setConnected(v){connected=!!v;try{if(v)localStorage.setItem(MARK,'1');else localStorage.removeItem(MARK)}catch{}try{if(v){sessionStorage.setItem(VERIFIED,'1');sessionStorage.setItem('rbSleeperToken',PLACEHOLDER);sessionStorage.setItem('rbSleeperAuth',PLACEHOLDER)}else{sessionStorage.removeItem(VERIFIED);if(!rawLegacyToken()){sessionStorage.removeItem('rbSleeperToken');sessionStorage.removeItem('rbSleeperAuth')}}}catch{}try{window.dispatchEvent(new CustomEvent('rb:sleeper-vault',{detail:{connected}}))}catch{}}
  async function firebaseToken(force=false){try{await window.rbAuthReady}catch{}const user=window.firebase?.auth?.()?.currentUser;if(!user)throw new Error('Sign in to RosterBate first.');return user.getIdToken(!!force)}
  async function request(action,extra={}){const firebaseIdToken=await firebaseToken();const r=await originalFetch('/.netlify/functions/sleeper-vault',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({action,firebaseIdToken,...extra})});const d=await r.json().catch(()=>({}));if(!r.ok||!d?.ok){const e=new Error(d?.error||`Lock Sync vault request failed (${r.status}).`);e.status=r.status;e.data=d;throw e}return d}
  async function status(){if(statusPromise)return statusPromise;statusPromise=request('status').then(d=>{setConnected(!!d.connected);if(d.connected)clearRaw();return d}).catch(e=>{connected=hasMarker();if(connected){try{sessionStorage.setItem(VERIFIED,'1');sessionStorage.setItem('rbSleeperToken',PLACEHOLDER);sessionStorage.setItem('rbSleeperAuth',PLACEHOLDER)}catch{}}throw e}).finally(()=>{statusPromise=null});return statusPromise}
  async function save(sleeperToken,target={}){sleeperToken=String(sleeperToken||'').trim();if(!validJwt(sleeperToken))throw new Error('That is not a valid Sleeper session token.');const linkedSleeperUserId=String(target.linkedSleeperUserId||localStorage.getItem('rbSleeperLinkedUserId')||'');const d=await request('save',{sleeperToken,linkedSleeperUserId,leagueId:String(target.leagueId||window.leagueId||''),rosterId:Number(target.rosterId||window.selectedRoster||0),round:Number(target.round||window.selectedWeek||0)});clearRaw();setConnected(true);return d}
  async function forget(){const d=await request('delete');clearRaw();setConnected(false);return d}
  function isConnected(){return connected||hasMarker()}
  function headerValue(headers,name){try{if(headers instanceof Headers)return headers.get(name)||'';if(Array.isArray(headers)){const hit=headers.find(([k])=>String(k).toLowerCase()===String(name).toLowerCase());return hit?String(hit[1]||''):''}for(const [k,v] of Object.entries(headers||{}))if(String(k).toLowerCase()===String(name).toLowerCase())return String(v||'')}catch{}return''}
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:String(input?.url||'');
    init={...(init||{})};
    const headers=init.headers||input?.headers||{};
    const authHeader=headerValue(headers,'Authorization');
    if(url.includes('sleeper.com/graphql')&&authHeader===PLACEHOLDER){
      let gqlBody={};if(typeof init.body==='string'){try{gqlBody=JSON.parse(init.body)}catch{}}
      if(String(gqlBody?.operationName||'')==='matchup_legs'){
        const firebaseIdToken=await firebaseToken();
        return originalFetch('/.netlify/functions/sleeper-graphql-read',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({firebaseIdToken,operationName:'matchup_legs',variables:gqlBody.variables||{},query:String(gqlBody.query||'')})});
      }
      return new Response(JSON.stringify({errors:[{message:'This private Sleeper request must use a vault-backed RosterBate endpoint.'}]}),{status:403,headers:{'Content-Type':'application/json'}});
    }
    if(!PRIVATE_ENDPOINTS.some(name=>url.includes('/.netlify/functions/'+name)))return originalFetch(input,init);
    let body={};if(typeof init.body==='string'){try{body=JSON.parse(init.body)}catch{return originalFetch(input,init)}}
    if(!isConnected()&&validJwt(body.token))return originalFetch(input,init);
    const firebaseIdToken=await firebaseToken();delete body.token;body.firebaseIdToken=firebaseIdToken;init.headers={...(init.headers||{}),'Content-Type':'application/json'};init.body=JSON.stringify(body);return originalFetch(input,init);
  };
  function installMarker(){if(hasMarker())setConnected(true)}
  function startStatusOnce(){if(statusStarted)return;statusStarted=true;status().catch(()=>{})}
  window.addEventListener('rb:auth-ready',startStatusOnce,{once:true});
  window.rbAuthReady?.then(startStatusOnce);
  setTimeout(installMarker,0);
  async function migrateLegacy(){const raw=rawLegacyToken();if(!raw)return;for(let i=0;i<80;i++){let lg='',rid=0,wk=0;try{lg=String(window.leagueId||leagueId||'');rid=Number(window.selectedRoster||selectedRoster);wk=Number(window.selectedWeek||selectedWeek)}catch{}if(lg&&rid&&wk){try{await save(raw,{leagueId:lg,rosterId:rid,round:wk});return}catch{return}}await new Promise(r=>setTimeout(r,100))}}
  window.rbAuthReady?.then(()=>migrateLegacy().catch(()=>{}));window.rbSleeperVault={status,save,forget,isConnected,firebaseToken,clearRaw};
})();
