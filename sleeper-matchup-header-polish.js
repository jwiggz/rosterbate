(()=>{
  const s=document.createElement('style');
  s.id='rbMatchupHeaderPolish';
  s.textContent=`
    #matchupView .match-top.rb-match-browser{
      grid-template-columns:minmax(0,1fr) 220px minmax(0,1fr)!important;
      align-items:center!important;
    }
    #matchupView .rb-match-team-block{
      width:100%!important;
      justify-self:stretch!important;
    }
    #matchupView .rb-match-team-block--right{
      width:100%!important;
      justify-content:flex-start!important;
      flex-direction:row-reverse!important;
      text-align:right!important;
    }
    #matchupView .rb-match-team-block--right .rb-match-team-copy{
      margin-left:auto!important;
      text-align:right!important;
    }
    #matchupView .rb-match-team-block--right .rb-match-team-avatar{
      order:-1!important;
      margin-left:10px!important;
      margin-right:0!important;
    }
    #matchupView .rb-match-center{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
    }
    #matchupView .rb-match-center .vs{
      margin:0!important;
      font-size:8px!important;
      font-weight:950!important;
      letter-spacing:.12em!important;
      color:#a9b5c7!important;
    }
    #matchupView .rb-match-center .score-proj{
      margin:0!important;
      min-width:172px!important;
      padding:7px 12px!important;
      border:1px solid rgba(243,199,91,.42)!important;
      border-radius:8px!important;
      background:linear-gradient(180deg,rgba(243,199,91,.12),rgba(243,199,91,.055))!important;
      color:#ffd86b!important;
      font-size:11px!important;
      line-height:1.15!important;
      font-weight:950!important;
      letter-spacing:.01em!important;
      box-shadow:inset 0 0 0 1px rgba(255,216,107,.035)!important;
      text-align:center!important;
    }
    @media(max-width:760px){
      #matchupView .match-top.rb-match-browser{grid-template-columns:1fr 1fr!important}
      #matchupView .rb-match-center{grid-column:1/-1!important;grid-row:2!important}
      #matchupView .rb-match-center .score-proj{min-width:155px!important}
    }
  `;
  document.head.appendChild(s);
  function relabel(){
    document.querySelectorAll('#matchupView .rb-match-center .score-proj').forEach(el=>{
      const t=String(el.textContent||'').trim();
      if(/^Proj\s+/i.test(t)) el.innerHTML=`<span style="display:block;font-size:6px;letter-spacing:.12em;color:#c6aa61;margin-bottom:3px">PROJECTED</span>${t.replace(/^Proj\s+/i,'')}`;
    });
  }
  const root=document.getElementById('matchupView');
  if(root)new MutationObserver(relabel).observe(root,{childList:true,subtree:true});
  relabel();
})();