(()=>{
  let running=false;
  async function restore(){
    if(running)return;
    running=true;
    try{
      if(window.rbAuthReady)await window.rbAuthReady;
      if(!window.rbSleeperVault?.status)return;
      const d=await window.rbSleeperVault.status();
      if(!d?.connected||!d?.sleeperUserId)return;
      try{
        localStorage.setItem('rbSleeperLinkedUserId',String(d.sleeperUserId));
        if(Number(d.rosterId)>0)localStorage.setItem('rbSleeperRoster',String(Number(d.rosterId)));
      }catch{}
      for(let i=0;i<80;i++){
        try{
          const teams=currentData?.teams||[];
          const t=teams.find(x=>String(x?.owner_id||'')===String(d.sleeperUserId));
          if(t){
            const name=String(t.display_name||t.team_name||'').trim();
            if(name)try{localStorage.setItem('rbSleeperLinkedUsername',name)}catch{}
            try{selectedRoster=Number(t.roster_id||d.rosterId||selectedRoster)}catch{}
            break;
          }
        }catch{}
        await new Promise(r=>setTimeout(r,50));
      }
      try{sessionStorage.setItem('rbSleeperLockSyncVerified','1')}catch{}
      try{window.dispatchEvent(new CustomEvent('rb:sleeper-vault',{detail:{connected:true,restoredIdentity:true,sleeperUserId:String(d.sleeperUserId),rosterId:Number(d.rosterId||0)}}))}catch{}
    }catch{}
    finally{running=false}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
  window.addEventListener('rb:auth-ready',restore);
})();
