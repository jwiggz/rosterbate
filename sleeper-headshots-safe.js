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
  const name=String(row.querySelector('.pname')?.textContent||'')
    .replace(/\s*\(locked\)\s*$/i,'')
    .trim().toLowerCase();
  const id=map.get(name)||'';
  if(id) row.dataset.rbPlayerId=id;
  return id;
}

function proxyUrl(id){
  const p=playerObj(id);
  const params=new URLSearchParams({player:String(id)});
  const espn=String(p?.espn_id||'').trim();
  if(/^\d{1,12}$/.test(espn)) params.set('espn',espn);
  return `/.netlify/functions/sleeper-player-headshot?${params.toString()}`;
}

function loadHeadshot(id){
  id=String(id);
  const url=proxyUrl(id);
  const key=`${id}|${url}`;
  if(loaded.has(key)) return Promise.resolve(loaded.get(key));
  if(pending.has(key)) return pending.get(key);
  const promise=new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      loaded.set(key,url);
      pending.delete(key);
      resolve(url);
    };
    img.onerror=()=>{
      pending.delete(key);
      resolve('');
    };
    img.src=url;
  });
  pending.set(key,promise);
  return promise;
}

async function paintRow(row,id){
  const head=row.querySelector('.player-head');
  if(!head||!id) return;
  const signature=proxyUrl(id);
  if(head.dataset.rbPhotoSignature===signature&&head.classList.contains('rb-photo-ready')) return;
  head.dataset.rbPhotoPlayer=String(id);
  head.dataset.rbPhotoSignature=signature;
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
function schedule(){clearTimeout(timer);timer=setTimeout(apply,60)}
const root=document.getElementById('teamView');
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
setTimeout(apply,120);setTimeout(apply,800);window.addEventListener('focus',apply);
})();