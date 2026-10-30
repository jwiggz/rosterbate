(()=>{
  const ACTIVE='rbActiveIdentityUser';
  const OWNER='rbLegacyOwnerId';
  const PREFIX='rbAcct:';
  const native={
    get:Storage.prototype.getItem,
    set:Storage.prototype.setItem,
    remove:Storage.prototype.removeItem,
    key:Storage.prototype.key
  };
  function active(){try{return native.get.call(localStorage,ACTIVE)||''}catch{return''}}
  function account(){return active()||'anonymous'}
  function shouldScope(storage,key){
    key=String(key||'');
    if(key===ACTIVE||key===OWNER||key.startsWith(PREFIX)||key.startsWith('rbAuth'))return false;
    if(storage===localStorage)return key==='rbSleeperTokenPersistent'||key.startsWith('rbDailyPlan:');
    if(storage===sessionStorage)return key==='rbSleeperToken'||key==='rbSleeperAuth'||key.startsWith('rbPlanDismiss:')||key.startsWith('rbLockedSlots:');
    return false;
  }
  function scoped(key){return `${PREFIX}${account()}:${String(key)}`}
  function migrateLegacy(){
    const id=active();if(!id)return;
    let owner='';try{owner=native.get.call(localStorage,OWNER)||''}catch{}
    if(owner&&owner!==id)return;
    if(!owner){try{native.set.call(localStorage,OWNER,id)}catch{}}
    try{
      const old=native.get.call(localStorage,'rbSleeperTokenPersistent');
      const dest=`${PREFIX}${id}:rbSleeperTokenPersistent`;
      if(old&&!native.get.call(localStorage,dest))native.set.call(localStorage,dest,old);
      if(old)native.remove.call(localStorage,'rbSleeperTokenPersistent');
    }catch{}
    try{
      const keys=[];
      for(let i=0;i<localStorage.length;i++){
        const k=native.key.call(localStorage,i);
        if(k&&k.startsWith('rbDailyPlan:'))keys.push(k);
      }
      keys.forEach(k=>{
        const dest=`${PREFIX}${id}:${k}`;
        const v=native.get.call(localStorage,k);
        if(v!=null&&!native.get.call(localStorage,dest))native.set.call(localStorage,dest,v);
        native.remove.call(localStorage,k);
      });
    }catch{}
  }
  function clearSecrets(id=active()){
    if(!id)return;
    try{native.remove.call(localStorage,`${PREFIX}${id}:rbSleeperTokenPersistent`)}catch{}
    try{
      native.remove.call(sessionStorage,`${PREFIX}${id}:rbSleeperToken`);
      native.remove.call(sessionStorage,`${PREFIX}${id}:rbSleeperAuth`);
      native.remove.call(sessionStorage,'rbSleeperToken');
      native.remove.call(sessionStorage,'rbSleeperAuth');
    }catch{}
  }
  function clearAccount(id=active()){
    if(!id)return;
    const p=`${PREFIX}${id}:`;
    for(const storage of [localStorage,sessionStorage]){
      try{
        const keys=[];
        for(let i=0;i<storage.length;i++){
          const k=native.key.call(storage,i);
          if(k&&k.startsWith(p))keys.push(k);
        }
        keys.forEach(k=>native.remove.call(storage,k));
      }catch{}
    }
    clearSecrets(id);
  }

  migrateLegacy();
  Storage.prototype.getItem=function(key){return native.get.call(this,shouldScope(this,key)?scoped(key):key)};
  Storage.prototype.setItem=function(key,value){return native.set.call(this,shouldScope(this,key)?scoped(key):key,value)};
  Storage.prototype.removeItem=function(key){return native.remove.call(this,shouldScope(this,key)?scoped(key):key)};

  window.rbAccountStorage={activeUserId:active,clearSecrets,clearAccount,migrateLegacy};
})();
