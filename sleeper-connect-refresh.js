(()=>{
  // Keep Sleeper auth session-scoped, but refresh once immediately after a
  // successful connection so ownership, locks, stats, and avatars initialize
  // from a clean render. sessionStorage survives the reload.
  function readToken(){
    try{
      return sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||'';
    }catch{return''}
  }
  const initial=readToken();
  if(initial) return;

  let done=false;
  const started=Date.now();
  const timer=setInterval(()=>{
    if(done){clearInterval(timer);return}
    const token=readToken();
    if(token){
      done=true;
      clearInterval(timer);
      try{
        // Normalize the legacy key while keeping the credential session-only.
        if(!sessionStorage.getItem('rbSleeperToken')) sessionStorage.setItem('rbSleeperToken',token);
        sessionStorage.setItem('rbSleeperConnectedReload','1');
      }catch{}
      // Give the Connect modal a moment to finish its own success UI, then reload.
      setTimeout(()=>location.reload(),120);
      return;
    }
    if(Date.now()-started>120000) clearInterval(timer);
  },100);
})();
