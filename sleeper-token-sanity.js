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

  // Load the safe, username-based Sleeper connection wizard. It relies only
  // on public account/roster lookup and does not collect Sleeper passwords or
  // private browser-session credentials from normal users.
  try{
    if(!document.querySelector('script[data-rb-guided-link]')){
      const s=document.createElement('script');
      s.src='/sleeper-guided-link.js?v=20261030a';
      s.async=false;
      s.dataset.rbGuidedLink='1';
      document.head.appendChild(s);
    }
  }catch{}
})();
