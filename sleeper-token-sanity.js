(()=>{
  const keys=[
    ['sessionStorage','rbSleeperToken'],
    ['sessionStorage','rbSleeperAuth'],
    ['localStorage','rbSleeperTokenPersistent']
  ];
  const valid=v=>/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(v||'').trim());
  let cleared=false;
  for(const [storeName,key] of keys){
    try{
      const store=window[storeName],v=store?.getItem(key)||'';
      if(v&&!valid(v)){store.removeItem(key);cleared=true;}
    }catch{}
  }
  if(cleared){
    try{sessionStorage.setItem('rbSleeperTokenRejected','1')}catch{}
  }
})();
