(()=>{
const pending=new Map();
const loaded=new Map();

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

function playerMap(){
  const map=new Map();
  const players=(typeof currentData!=='undefined'&&currentData?.players)||{};
  for(const [id,p] of Object.entries(players)){
    const name=String(p?.full_name||'').trim().toLowerCase();
    if(name&&!map.has(name)) map.set(name,String(id));
  }
  return map;
}

function rowPlayerId(row,map){
  if(row.dataset.rbPlayerId) return String(row.dataset.rbPlayerId);
  const name=String(row.querySelector('.pname')?.textContent||'')
    .replace(/\s*\(locked\)\s*$/i,'')
    .trim().toLowerCase();
  const id=map.get(name)||'';
  if(id) row.dataset.rbPlayerId=id;
  return id;
}

function proxyUrl(id){
  return `/.netlify/functions/sleeper-player-headshot?player=${encodeURIComponent(String(id))}`;
}

function loadHeadshot(id){
  id=String(id);
  if(loaded.has(id)) return Promise.resolve(loaded.get(id));
  if(pending.has(id)) return pending.get(id);
  const promise=new Promise(resolve=>{
    const img=new Image();
    const url=proxyUrl(id);
    img.onload=()=>{
      // The proxy always returns an image. Keep the URL cached and let the browser cache bytes.
      loaded.set(id,url);
      pending.delete(id);
      resolve(url);
    };
    img.onerror=()=>{
      pending.delete(id);
      resolve('');
    };
    img.src=url;
  });
  pending.set(id,promise);
  return promise;
}

async function paintRow(row,id){
  const head=row.querySelector('.player-head');
  if(!head||!id) return;
  if(head.dataset.rbPhotoPlayer===String(id)&&head.classList.contains('rb-photo-ready')) return;
  head.dataset.rbPhotoPlayer=String(id);
  const url=await loadHeadshot(id);
  if(!url||!head.isConnected||head.dataset.rbPhotoPlayer!==String(id)) return;
  head.style.backgroundImage=`url("${url}")`;
  head.classList.add('rb-photo-ready');
}

function apply(){
  const root=document.getElementById('teamView');
  if(!root) return;
  const map=playerMap();
  root.querySelectorAll('.player-row').forEach(row=>{
    const id=rowPlayerId(row,map);
    if(id) paintRow(row,id);
  });
}

addStyle();
let timer=null;
function schedule(){
  clearTimeout(timer);
  timer=setTimeout(apply,60);
}

const root=document.getElementById('teamView');
if(root){
  // Observe only structural changes from the base lineup renderer. This script itself
  // changes only attributes/styles, so it cannot recursively trigger this observer.
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
}
setTimeout(apply,120);
window.addEventListener('focus',apply);
})();