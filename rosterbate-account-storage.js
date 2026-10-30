(()=>{
  const ACTIVE='rbActiveIdentityUser';
  const OWNER='rbLegacyOwnerId';
  const PREFIX='rbAcct:';
  const native={
    lGet:Storage.prototype.getItem,
    lSet:Storage.prototype.setItem,
    lRemove:Storage.prototype.removeItem,
    lKey:Storage.prototype.key
  };
  function active(){try{return native.lGet.call(localStorage,ACTIVE)||''}catch{return''}}
  function account(){return active()||'anonymous'}
  function shouldScope(storage,key){
    key=String(key||'');
    if(key===ACTIVE||key===OWNER||key.startsWith(PREFIX)||key.startsWith('rbAuth'))return false;
    if(storage===localStorage){
      return key==='rbSleeperTokenPersistent'||key.startsWith('rbDailyPlan:');
    }
    if(storage===sessionStorage){
      return key==='rbSleeperToken'||key==='rbSleeperAuth'||key.startsWith('rbPlanDismiss:')||key.startsWith('rbLockedSlots:');
    }
    return false;
  }
  function scoped(key){return `${PREFIX}${account()}:${String(key)}`}
  function patch(storage){
    storage.getItem=function(key){return native.lGet.call(storage,shouldScope(storage,key)?scoped(key):key)};
    storage.setItem=function(key,value){return native.lSet.call(storage,shouldScope(storage,key)?scoped(key):key,value)};
    storage.removeItem=function(key){return native.lRemove.call(storage,shouldScope(storage,key)?scoped(key):key)};
  }
  function migrateLegacy(){
    const id=active();if(!id)return;
    let owner='';try{owner=native.lGet.call(localStorage,OWNER)||''}catch{}
    if(owner&&owner!==id)return;
    if(!owner){try{native.lSet.call(localStorage,OWNER,id)}catch{}}
    try{
      const old=native.lGet.call(localStorage,'rbSleeperTokenPersistent');
      const dest=`${PREFIX}${id}:rbSleeperTokenPersistent`;
      if(old&&!native.lGet.call(localStorage,dest))native.lSet.call(localStorage,dest,old);
      if(old)native.lRemove.call(localStorage,'rbSleeperTokenPersistent');
    }catch{}
    try{
      const keys=[];
      for(let i=0;i<localStorage.length;i++){
        const k=native.lKey.call(localStorage,i);
        if(k&&k.startsWith('rbDailyPlan:'))keys.push(k);
      }
      keys.forEach(k=>{
        const dest=`${PREFIX}${id}:${k}`;
        const v=native.lGet.call(localStorage,k);
        if(v!=null&&!native.lGet.call(localStorage,dest))native.lSet.call(localStorage,dest,v);
        native.lRemove.call(localStorage,k);
      });
    }catch{}
  }
  function clearAccount(id=active()){
    if(!id)return;
    const p=`${PREFIX}${id}:`;
    for(const storage of [localStorage,sessionStorage]){
      try{
        const keys=[];
        for(let i=0;i<storage.length;i++){
          const k=native.lKey.call(storage,i);
          if(k&&k.startsWith(p))keys.push(k);
        }
        keys.forEach(k=>native.lRemove.call(storage,k));
      }catch{}
    }
    try{
      native.lRemove.call(sessionStorage,'rbSleeperToken');
      native.lRemove.call(sessionStorage,'rbSleeperAuth');
    }catch{}
  }
  migrateLegacy();
  patch(localStorage);patch(sessionStorage);
  window.rbAccountStorage={activeUserId:active,clearAccount,migrateLegacy};
})();
