(function initRosterbateGlobalNav(){
  function profileLabel(){
    const raw=String(localStorage.getItem('rbPlayerName') || '').trim();
    if(!raw) return 'Profile';
    const clean=raw.replace(/\s+/g,' ').trim();
    return clean.length > 12 ? clean.slice(0,12) : clean;
  }

  function applyLabel(){
    const btn=document.getElementById('rbGlobalProfileBtn');
    if(btn) btn.textContent=profileLabel().toUpperCase();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyLabel, { once:true });
  } else {
    applyLabel();
  }
})();
