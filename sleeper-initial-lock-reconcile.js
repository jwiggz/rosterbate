(()=>{
  const PLACEHOLDER='__RB_SLEEPER_VAULT__';
  let running=null,lastKey='';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function target(){
    try{return{leagueId:String(leagueId||''),rosterId:Number(selectedRoster||0),week:Number(selectedWeek||0)}}catch{return{leagueId:'',rosterId:0,week:0}}
  }
  function readyTarget(t){
    try{return /^\d{10,25}$/.test(t.leagueId)&&t.rosterId>0&&t.week>0&&currentData&&Array.isArray(currentData.matchups)}catch{return false}
  }
  function cache(t,data){
    try{sessionStorage.setItem(`rbLockState:${t.leagueId}:${t.rosterId}:${t.week}`,JSON.stringify({ts:Date.now(),data}))}catch{}
  }
  function setTestingStatus(text,isError=false){
    try{
      const s=document.getElementById('status');
      if(!s)return;
      if(isError){s.className='status error';s.textContent=`Testing Lock Sync: ${text}`}
    }catch{}
  }
  async function reconcile(force=false){
    if(running)return running;
    running=(async()=>{
      try{
        try{if(window.rbAuthReady)await window.rbAuthReady}catch{}
        for(let i=0;i<200&&!window.rbSleeperVault;i++)await sleep(20);
        if(!window.rbSleeperVault)throw new Error('vault client did not initialize');
        for(let i=0;i<200;i++){
          const t=target();
          if(readyTarget(t))break;
          await sleep(20);
        }
        const t=target();
        if(!readyTarget(t))throw new Error('league/roster data did not initialize');
        const key=`${t.leagueId}:${t.rosterId}:${t.week}`;
        if(!force&&lastKey===key&&Object.keys((typeof lockedGames==='object'&&lockedGames)||{}).length)return;
        const res=await fetch('/.netlify/functions/sleeper-lock-state',{
          method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
          body:JSON.stringify({token:PLACEHOLDER,leagueId:t.leagueId,rosterId:t.rosterId,leg:t.week,round:t.week})
        });
        const data=await res.json().catch(()=>({}));
        if(!res.ok||!data?.ok)throw new Error(data?.error||`lock-state HTTP ${res.status}`);
        lockedGames=data.startersGames||{};
        cache(t,data);
        lastKey=key;
        try{window.dispatchEvent(new CustomEvent('rb:sleeper-lock-state',{detail:{ok:true,source:'initial-reconcile',data}}))}catch{}
        try{if(typeof renderTeam==='function')renderTeam()}catch{}
        try{window.rbLockWindowRefresh?.()}catch{}
        try{window.dispatchEvent(new CustomEvent('rb:initial-lock-reconciled',{detail:{lockCount:Object.keys(lockedGames||{}).length}}))}catch{}
      }catch(e){setTestingStatus(e?.message||String(e),true)}
      finally{running=null}
    })();
    return running;
  }
  async function start(){
    await reconcile(true);
    [250,750,1500].forEach(ms=>setTimeout(()=>reconcile(false),ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('rb:sleeper-vault',()=>reconcile(true));
  document.addEventListener('change',e=>{if(['weekSel','teamPicker'].includes(e.target?.id))setTimeout(()=>reconcile(true),0)},true);
  window.rbInitialLockReconcile=reconcile;
})();
