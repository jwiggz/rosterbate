(()=>{
  const id='rbWaiverOwnershipColors';
  if(document.getElementById(id)) return;
  const s=document.createElement('style');
  s.id=id;
  s.textContent=`
    #playersView .waiver-owned.available{color:#30d8a0!important}
    #playersView .waiver-owned.other{color:#ff5b82!important}
    #playersView .waiver-owned.mine{color:#66c7ff!important}
  `;
  document.head.appendChild(s);
})();
