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
    urls.push(`https://statdunk.com/_vercel/image?url=${encodeURIComponent(remote)}&w=96&q=85`);
    urls.push(`/.netlify/functions/sleeper-player-headshot?player=${encodeURIComponent(String(id))}&espn=${encodeURIComponent(espn)}`);
  }else{
    urls.push(`/.netlify/functions/sleeper-player-headshot?player=${encodeURIComponent(String(id))}`);
  }
  return urls;
}

function probe(url){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(url);
    img.onerror=()=>resolve('');
    img.decoding='async';
    img.src=url;
  });
}

async function loadHeadshot(id){
  id=String(id);
  if(loaded.has(id)) return loaded.get(id);
  if(pending.has(id)) return pending.get(id);
  const promise=(async()=>{
    for(const url of sourceUrls(id)){
      const ok=await probe(url);
      if(ok){loaded.set(id,ok);pending.delete(id);return ok}
    }
    pending.delete(id);return'';
  })();
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
  const rows=[...root.querySelectorAll('.player-row')];
  for(const row of rows){const id=rowPlayerId(row,map);if(id) paintRow(row,id)}
}

addStyle();
let timer=null;
function schedule(){clearTimeout(timer);timer=setTimeout(apply,25)}
const root=document.getElementById('teamView');
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
setTimeout(apply,40);window.addEventListener('focus',apply);
})();