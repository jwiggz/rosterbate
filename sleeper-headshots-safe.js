(()=>{
const loaded=new Map();
const failedUntil=new Map();
const RETRY_AFTER=5*60*1000;

const css=`
#teamView .player-head.rb-photo-ready{background-size:cover!important;background-position:center top!important;background-repeat:no-repeat!important;background-color:#1f2c3d!important}
#teamView .player-head.rb-photo-ready .player-fallback{opacity:0!important;visibility:hidden!important}
`;

function addStyle(){
  if(document.getElementById('rbSafeHeadshotStyle')) return;
  const s=document.createElement('style');
  s.id='rbSafeHeadshotStyle';
  s.textContent=css;
  document.head.appendChild(s);
}

function players(){return (typeof currentData!=='undefined'&&currentData?.players)||{}}
function playerMap(){
  const map=new Map();
  for(const [id,p] of Object.entries(players())){
    const name=String(p?.full_name||'').trim().toLowerCase();
    if(name&&!map.has(name)) map.set(name,String(id));
  }
  return map;
}
function playerObj(id){return players()?.[String(id)]||{}}
function rowPlayerId(row,map){
  if(row.dataset.rbPlayerId) return String(row.dataset.rbPlayerId);
  const name=String(row.querySelector('.pname')?.textContent||'').replace(/\s*\(locked\)\s*$/i,'').trim().toLowerCase();
  const id=map.get(name)||'';
  if(id) row.dataset.rbPlayerId=id;
  return id;
}

function sourceUrls(id){
  const p=playerObj(id);
  const espn=String(p?.espn_id||'').trim();
  const urls=[];
  if(/^\d{1,12}$/.test(espn)){
    const remote=`https://a.espncdn.com/i/headshots/nba/players/full/${encodeURIComponent(espn)}.png`;
    urls.push(remote);
    urls.push(`/.netlify/functions/sleeper-player-headshot?player=${encodeURIComponent(String(id))}&espn=${encodeURIComponent(espn)}`);
    urls.push(`https://statdunk.com/_vercel/image?url=${encodeURIComponent(remote)}&w=96&q=80`);
  }else{
    urls.push(`/.netlify/functions/sleeper-player-headshot?player=${encodeURIComponent(String(id))}`);
  }
  return urls;
}

function trySource(head,id,urls,index=0){
  if(!head?.isConnected||head.dataset.rbPhotoPlayer!==String(id)) return;
  if(index>=urls.length){
    failedUntil.set(String(id),Date.now()+RETRY_AFTER);
    return;
  }

  const url=urls[index];
  const img=new Image();
  img.decoding='async';
  img.fetchPriority='high';

  let settled=false;
  const cleanup=()=>{img.onload=null;img.onerror=null};
  const fail=()=>{
    if(settled)return;
    settled=true;
    cleanup();
    trySource(head,id,urls,index+1);
  };

  head.style.backgroundImage=`url("${url}")`;
  img.onload=()=>{
    if(settled)return;
    settled=true;
    cleanup();
    if(!head.isConnected||head.dataset.rbPhotoPlayer!==String(id)) return;
    loaded.set(String(id),url);
    failedUntil.delete(String(id));
    head.style.backgroundImage=`url("${url}")`;
    head.classList.add('rb-photo-ready');
  };
  img.onerror=fail;
  img.src=url;
}

function paintRow(row,id){
  const head=row.querySelector('.player-head');
  if(!head||!id) return;
  id=String(id);
  if(head.dataset.rbPhotoPlayer===id&&head.classList.contains('rb-photo-ready')) return;
  head.dataset.rbPhotoPlayer=id;

  const cached=loaded.get(id);
  if(cached){
    head.style.backgroundImage=`url("${cached}")`;
    head.classList.add('rb-photo-ready');
    return;
  }
  if((failedUntil.get(id)||0)>Date.now()) return;

  trySource(head,id,sourceUrls(id));
}

function apply(){
  const root=document.getElementById('teamView');
  if(!root) return 0;
  const map=playerMap();
  let painted=0;
  for(const row of root.querySelectorAll('.player-row')){
    const id=rowPlayerId(row,map);
    if(id){paintRow(row,id);painted++}
  }
  return painted;
}

let burstToken=0;
function paintBurst(){
  const token=++burstToken;
  let pass=0;
  const tick=()=>{
    if(token!==burstToken)return;
    apply();
    pass++;
    if(pass<10) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function hookRenderTeam(){
  try{
    if(typeof renderTeam!=='function'||renderTeam.__rbAvatarHook)return false;
    const base=renderTeam;
    const hooked=function(...args){
      const out=base.apply(this,args);
      paintBurst();
      return out;
    };
    hooked.__rbAvatarHook=true;
    if(base.__rbStable) hooked.__rbStable=true;
    renderTeam=hooked;
    try{window.renderTeam=hooked}catch{}
    return true;
  }catch{return false}
}

// Starter-first swaps can lose selection when later decorators rerender the Team DOM.
// Capture the intended starter slot one event earlier than click so the existing
// symmetric swap layer sees the correct selectedStarterIndex when bench is clicked.
document.addEventListener('pointerdown',e=>{
  try{
    const row=e.target.closest?.('#teamView [data-starter-index]');
    if(!row)return;
    if(row.classList.contains('rb-slot-pinned')||row.classList.contains('locked-in')||row.classList.contains('locked'))return;
    if(!row.classList.contains('editable'))return;
    const idx=Number(row.dataset.starterIndex);
    if(!Number.isInteger(idx))return;
    selectedStarterIndex=idx;
    document.querySelectorAll('#teamView [data-starter-index].selected').forEach(r=>r.classList.remove('selected'));
    row.classList.add('selected');
  }catch{}
},true);

addStyle();
hookRenderTeam();
paintBurst();

let hookAttempts=0;
const hookTimer=setInterval(()=>{
  hookAttempts++;
  if(hookRenderTeam()||hookAttempts>=20) clearInterval(hookTimer);
},50);

let timer=null;
function schedule(){clearTimeout(timer);timer=setTimeout(paintBurst,0)}
const root=document.getElementById('teamView');
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
window.addEventListener('focus',paintBurst);
})();