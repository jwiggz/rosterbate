(()=>{
  function apply(root=document){
    root.querySelectorAll?.('#rbPlayerCard table.log tbody tr').forEach(row=>{
      const cell=row.children?.[2];
      if(!cell||cell.dataset.rbResultColored==='1')return;
      const raw=String(cell.textContent||'').trim();
      const m=raw.match(/^([WL])(?:\s+|$)(.*)$/i);
      if(!m)return;
      const outcome=m[1].toUpperCase();
      const rest=m[2]||'';
      cell.innerHTML=`<span class="rb-result-${outcome.toLowerCase()}">${outcome}</span>${rest?` ${rest}`:''}`;
      cell.dataset.rbResultColored='1';
    });
  }
  if(!document.getElementById('rbResultColorStyle')){
    const style=document.createElement('style');
    style.id='rbResultColorStyle';
    style.textContent='.rb-result-w{color:#30d8a0;font-weight:900}.rb-result-l{color:#ff5b82;font-weight:900}';
    document.head.appendChild(style);
  }
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes||[]){
        if(node.nodeType===1)apply(node);
      }
    }
    apply(document);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  apply(document);
})();
