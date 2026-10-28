(()=>{
  function apply(){
    const bar=document.querySelector('#teamView .rb-inline-toolbar');
    if(!bar)return;
    const title=bar.querySelector('strong');
    const old=bar.querySelector('.rb-mode-label');
    if(title)title.style.display='none';
    if(old)old.style.display='none';
    let label=bar.querySelector('.rb-mode-label-right');
    const mode=bar.querySelector('[data-rb-mode].active')?.dataset?.rbMode||'avg';
    if(!label){
      label=document.createElement('span');
      label.className='rb-mode-label-right';
      label.style.cssText='font-size:9px;font-weight:900;color:#dce5f1;white-space:nowrap;';
      const modeWrap=bar.querySelector('.rb-inline-mode');
      if(modeWrap)bar.insertBefore(label,modeWrap);else bar.appendChild(label);
    }
    label.textContent=mode==='total'?'Season Stats':'Per Game Averages';
  }
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#teamView [data-rb-mode]'))queueMicrotask(apply);
  },true);
  const root=document.getElementById('teamView');
  if(root)new MutationObserver(muts=>{
    if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.rb-inline-toolbar')||n.querySelector?.('.rb-inline-toolbar')))))queueMicrotask(apply);
  }).observe(root,{childList:true,subtree:true});
  setTimeout(apply,0);
  setTimeout(apply,150);
})();