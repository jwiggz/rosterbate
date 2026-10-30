(()=>{
  const ACTIVE='rbActiveFirebaseUid';
  const OWNER='rbLegacyOwnerId';
  const PREFIX='rbAcct:';
  const native={get:Storage.prototype.getItem,set:Storage.prototype.setItem,remove:Storage.prototype.removeItem,key:Storage.prototype.key};
  function active(){try{return native.get.call(localStorage,ACTIVE)||String(window.firebase?.auth?.().currentUser?.uid||'')}catch{return''}}
  function account(){return active()||'anonymous'}
  function shouldScope(storage,key){
    key=String(key||'');
    if(key===ACTIVE||key===OWNER||key.startsWith(PREFIX)||key.startsWith('rbActiveFirebase'))return false;
    if(storage===localStorage)return key==='rbSleeperTokenPersistent'||key==='rbSleeperRecentLeagues'||key==='rbSleeperRoster'||key==='rbSleeperLinkedUsername'||key==='rbSleeperLinkedUserId'||key.startsWith('rbDailyPlan:');
    if(storage===sessionStorage)return key==='rbSleeperToken'||key==='rbSleeperAuth'||key.startsWith('rbPlanDismiss:')||key.startsWith('rbLockedSlots:');
    return false;
  }
  function scoped(key){return`${PREFIX}${account()}:${String(key)}`}
  function migrateKey(id,key){
    try{
      const old=native.get.call(localStorage,key),dest=`${PREFIX}${id}:${key}`;
      if(old!=null&&!native.get.call(localStorage,dest))native.set.call(localStorage,dest,old);
      if(old!=null)native.remove.call(localStorage,key);
    }catch{}
  }
  function migrateLegacy(id=active()){
    if(!id)return;
    let owner='';try{owner=native.get.call(localStorage,OWNER)||''}catch{}
    if(owner&&owner!==id)return;
    if(!owner){try{native.set.call(localStorage,OWNER,id)}catch{}}
    ['rbSleeperTokenPersistent','rbSleeperRecentLeagues','rbSleeperRoster','rbSleeperLinkedUsername','rbSleeperLinkedUserId'].forEach(key=>migrateKey(id,key));
    try{
      const keys=[];
      for(let i=0;i<localStorage.length;i++){const k=native.key.call(localStorage,i);if(k&&k.startsWith('rbDailyPlan:'))keys.push(k)}
      keys.forEach(k=>{const dest=`${PREFIX}${id}:${k}`,v=native.get.call(localStorage,k);if(v!=null&&!native.get.call(localStorage,dest))native.set.call(localStorage,dest,v);native.remove.call(localStorage,k)});
    }catch{}
  }
  function clearSecrets(id=active()){
    if(!id)return;
    try{native.remove.call(localStorage,`${PREFIX}${id}:rbSleeperTokenPersistent`)}catch{}
    try{native.remove.call(sessionStorage,`${PREFIX}${id}:rbSleeperToken`);native.remove.call(sessionStorage,`${PREFIX}${id}:rbSleeperAuth`);native.remove.call(sessionStorage,'rbSleeperToken');native.remove.call(sessionStorage,'rbSleeperAuth')}catch{}
  }
  function setActiveUser(id){
    id=String(id||'');if(!id)return;
    try{native.set.call(localStorage,ACTIVE,id)}catch{}
    migrateLegacy(id);
    window.dispatchEvent(new CustomEvent('rb:account-storage-ready',{detail:{uid:id}}));
  }
  Storage.prototype.getItem=function(key){return native.get.call(this,shouldScope(this,key)?scoped(key):key)};
  Storage.prototype.setItem=function(key,value){return native.set.call(this,shouldScope(this,key)?scoped(key):key,value)};
  Storage.prototype.removeItem=function(key){return native.remove.call(this,shouldScope(this,key)?scoped(key):key)};
  window.rbAccountStorage={activeUserId:active,setActiveUser,clearSecrets,migrateLegacy};
  if(active())migrateLegacy();
})();
