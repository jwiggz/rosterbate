(()=>{
// Keep optional enhancement scripts from disrupting the base lineup editor.
// The stats layer can call renderTeam() after a private lock refresh. That background
// render can erase the starter slot the user just selected. Suppress only calls
// originating from syncPrivateLocks; all normal/base renderTeam calls still run.
try{
  if(typeof renderTeam==='function' && !renderTeam.__rbStable){
    const baseRenderTeam=renderTeam;
    const stableRenderTeam=function(...args){
      const stack=String(new Error().stack||'');
      if(stack.includes('syncPrivateLocks')) return;
      return baseRenderTeam.apply(this,args);
    };
    stableRenderTeam.__rbStable=true;
    renderTeam=stableRenderTeam;
    try{window.renderTeam=stableRenderTeam}catch{}
  }
}catch{}

// Disable the experimental live Sleeper-CDN headshot replacement. Firefox/browser
// failures were causing repeated white flashes. The safe avatar painter owns the
// visible player image instead.
try{
  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(descriptor?.set && descriptor?.get && !HTMLImageElement.prototype.__rbAvatarGuard){
    Object.defineProperty(HTMLImageElement.prototype,'src',{
      configurable:true,
      enumerable:descriptor.enumerable,
      get:descriptor.get,
      set:function(value){
        const url=String(value||'');
        if(url.includes('sleepercdn.com/content/nba/players/thumb/')){
          this.dataset.rbAvatarSuppressed='1';
          return descriptor.set.call(this,'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==');
        }
        return descriptor.set.call(this,value);
      }
    });
    HTMLImageElement.prototype.__rbAvatarGuard=true;
  }
}catch{}

if(!document.getElementById('rbStabilityStyle')){
  const style=document.createElement('style');
  style.id='rbStabilityStyle';
  style.textContent=`#teamView img.rb-sleeper-headshot[data-rb-avatar-suppressed="1"]{background:transparent!important;opacity:0!important;pointer-events:none!important}`;
  document.head.appendChild(style);
}
})();
