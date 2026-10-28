(()=>{
  const root=document.getElementById('matchupView');
  if(!root)return;
  let applying=false,pending=false;
  function numbers(text){return String(text||'').match(/-?\d+(?:\.\d+)?/g)||[]}
  function apply(){
    if(applying)return;applying=true;
    try{
      const top=root.querySelector('.match-top.rb-match-browser');
      if(!top)return;
      const blocks=top.querySelectorAll('.rb-match-team-block');
      const center=top.querySelector('.rb-match-center');
      if(blocks.length<2||!center)return;
      const leftScore=blocks[0].querySelector('.rb-team-locked-score');
      const rightScore=blocks[1].querySelector('.rb-team-locked-score');
      const projEl=center.querySelector('.score-proj');
      const label=center.querySelector('.vs');
      if(!leftScore||!rightScore||!projEl||!label)return;

      const leftLocked=(leftScore.dataset.rbLockedValue||numbers(leftScore.textContent)[0]||'—');
      const rightLocked=(rightScore.dataset.rbLockedValue||numbers(rightScore.textContent)[0]||'—');
      leftScore.dataset.rbLockedValue=leftLocked;
      rightScore.dataset.rbLockedValue=rightLocked;

      const projNums=numbers(projEl.dataset.rbOriginalProjection||projEl.textContent);
      if(!projEl.dataset.rbOriginalProjection)projEl.dataset.rbOriginalProjection=projEl.textContent||'';
      const leftProj=projNums[0]||'—',rightProj=projNums[1]||'—';

      const leftWanted=`${leftProj} projected`;
      const rightWanted=`${rightProj} projected`;
      if(leftScore.textContent.trim().toLowerCase()!==leftWanted.toLowerCase())leftScore.innerHTML=`${leftProj} <span>projected</span>`;
      if(rightScore.textContent.trim().toLowerCase()!==rightWanted.toLowerCase())rightScore.innerHTML=`${rightProj} <span>projected</span>`;
      leftScore.classList.add('rb-team-projected-score');
      rightScore.classList.add('rb-team-projected-score');

      if(label.textContent!=='LOCKED POINTS')label.textContent='LOCKED POINTS';
      const centerWanted=`${leftLocked} — ${rightLocked}`;
      if(projEl.textContent!==centerWanted)projEl.textContent=centerWanted;
      projEl.classList.add('rb-center-locked-score');
    }finally{applying=false}
  }
  function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;apply()})}
  const style=document.createElement('style');
  style.id='rbMatchupScoreLayoutStyle';
  style.textContent=`
    #matchupView .rb-team-locked-score.rb-team-projected-score{color:#f3c75b!important;font-size:18px!important;font-weight:950!important}
    #matchupView .rb-team-locked-score.rb-team-projected-score span{color:#c7a84b!important}
    #matchupView .rb-match-center .rb-center-locked-score{display:inline-block!important;min-width:150px;padding:7px 12px;border:1px solid rgba(48,216,160,.45);border-radius:8px;background:rgba(48,216,160,.08);color:#43e3b0!important;font-size:18px!important;font-weight:950!important;letter-spacing:.02em;line-height:1!important}
    #matchupView .rb-match-center .vs{margin-bottom:6px!important;color:#9db0c5!important}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);
  const observer=new MutationObserver(schedule);
  observer.observe(root,{childList:true,subtree:true});
  document.addEventListener('change',e=>{if(e.target?.id==='rbMatchSelect')setTimeout(apply,0)},true);
  document.addEventListener('click',e=>{if(e.target?.id==='rbPrevMatch'||e.target?.id==='rbNextMatch')setTimeout(apply,0)},true);
  apply();
})();