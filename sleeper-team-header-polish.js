(()=>{
  function avatarUrl(t){
    const raw=t?.avatar_url??t?.avatar??t?.metadata?.avatar_url??t?.metadata?.avatar??'';
    if(!raw)return'';
    const s=String(raw);
    return /^https?:\/\//i.test(s)?s:`https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(s)}`;
  }
  function selectedTeam(){
    try{return typeof team==='function'?team(selectedRoster):(currentData?.teams||[]).find(t=>Number(t?.roster_id)===Number(selectedRoster))||null}catch{return null}
  }
  function decorate(){
    const top=document.querySelector('#teamView .team-top');
    if(!top)return;
    const t=selectedTeam();
    const a=top.querySelector('.avatar');
    if(a){
      const key=String(t?.roster_id??selectedRoster??'');
      if(a.dataset.rbAvatarRoster!==key){
        a.dataset.rbAvatarRoster=key;
        const url=avatarUrl(t);
        const initial=String(t?.team_name||t?.display_name||'T').trim().charAt(0).toUpperCase()||'T';
        a.innerHTML=url?`<img class="rb-team-top-avatar-img" src="${url.replace(/"/g,'&quot;')}" alt="" onerror="this.remove();this.parentElement.textContent='${initial.replace(/'/g,"&#39;")}'">`:initial;
      }
      a.classList.add('rb-team-top-avatar');
    }
  }
  const css=`
    #teamView .team-top{min-height:88px;padding:11px 12px!important;align-items:center!important}
    #teamView .rb-team-top-avatar{width:48px!important;height:48px!important;flex:0 0 48px!important;border-radius:12px!important;overflow:hidden!important;background:#192332!important;border:1px solid #42516a!important;color:#e8eef7!important;font-size:16px!important;position:relative!important}
    #teamView .rb-team-top-avatar-img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
    #teamView .rb-lock-totals{align-self:stretch!important;align-items:stretch!important;gap:10px!important;margin-top:0!important;margin-bottom:0!important}
    #teamView .rb-lock-total{min-width:126px!important;min-height:64px!important;padding:9px 12px!important;align-items:center!important;text-align:center!important;border-radius:10px!important}
    #teamView .rb-lock-total span{font-size:8px!important;letter-spacing:.075em!important}
    #teamView .rb-lock-total b{font-size:20px!important;margin-top:5px!important;line-height:1!important}
    #teamView .rb-lock-total small{font-size:7px!important;margin-top:5px!important}
    @media(max-width:1050px){#teamView .rb-lock-totals{display:flex!important}#teamView .rb-lock-total{min-width:108px!important}}
    @media(max-width:780px){#teamView .team-top{min-height:76px}#teamView .rb-team-top-avatar{width:40px!important;height:40px!important;flex-basis:40px!important}#teamView .rb-lock-total{min-width:92px!important;min-height:56px!important}#teamView .rb-lock-total b{font-size:17px!important}}
  `;
  if(!document.getElementById('rbTeamHeaderPolishStyle')){const s=document.createElement('style');s.id='rbTeamHeaderPolishStyle';s.textContent=css;document.head.appendChild(s)}
  const root=document.getElementById('teamView');
  if(root)new MutationObserver(muts=>{if(muts.some(m=>m.addedNodes.length))queueMicrotask(decorate)}).observe(root,{childList:true,subtree:false});
  setTimeout(decorate,0);setTimeout(decorate,150);
})();