(()=>{
  function mount(){
    const host=document.querySelector('.head-actions');
    if(!host||document.getElementById('rbChangeLeague'))return;
    const a=document.createElement('a');
    a.id='rbChangeLeague';
    a.href='/sleeper-leagues.html';
    a.textContent='Change League';
    a.style.cssText='height:30px;display:inline-flex;align-items:center;padding:0 10px;border:1px solid #40516b;background:#27354a;color:#cfd8e6;border-radius:7px;font-size:9px;font-weight:800;text-decoration:none;white-space:nowrap';
    host.insertBefore(a,host.firstChild);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();