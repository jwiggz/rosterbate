(()=>{
  function ensureLabel(){
    const bar=document.querySelector('#teamView .rb-inline-toolbar');
    if(!bar)return null;
    const title=bar.querySelector('strong');
    const old=bar.querySelector('.rb-mode-label');
    if(title)title.style.display='none';
    if(old)old.style.display='none';
    let label=bar.querySelector('.rb-mode-label-right');
    if(!label){
      label=document.createElement('span');
      label.className='rb-mode-label-right';
      label.style.cssText='font-size:9px;font-weight:900;color:#dce5f1;white-space:nowrap;';
      const modeWrap=bar.querySelector('.rb-inline-mode');
      if(modeWrap)bar.insertBefore(label,modeWrap);else bar.appendChild(label);
    }
    return label;
  }
  function apply(mode){
    const label=ensureLabel();
    if(!label)return;
    const resolved=mode||document.querySelector('#teamView [data-rb-mode].active')?.dataset?.rbMode||'avg';
    label.textContent=resolved==='total'?'Season Totals':'Per Game Averages';
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#teamView [data-rb-mode]');
    if(!btn)return;
    apply(btn.dataset.rbMode);
  });
  const root=document.getElementById('teamView');
  if(root)new MutationObserver(muts=>{
    if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.rb-inline-toolbar')||n.querySelector?.('.rb-inline-toolbar')))))queueMicrotask(()=>apply());
  }).observe(root,{childList:true,subtree:true});
  setTimeout(()=>apply(),0);
  setTimeout(()=>apply(),150);
})();