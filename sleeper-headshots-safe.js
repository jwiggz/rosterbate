(()=>{
const pending=new Map();
const loaded=new Map();
const failedUntil=new Map();
const PROBE_TIMEOUT=1200;
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
    // ESPN's CDN is normally the fastest path and is browser-cache friendly.
    urls.push(remote);
    // Same-origin fallback avoids a slow/blocked third-party request path.
    urls.push(`/.netlify/functions/sleeper-player-headshot?player=${encodeURIComponent(String(id))}&espn=${encodeURIComponent(espn)}`);
    // Keep StatDunk only as a last resort rather than blocking every avatar on it.
    urls.push(`https://statdunk.com/_vercel/image?url=${encodeURIComponent(remote)}&w=96&q=80`);
  }else{
    urls.push(`/.netlify/functions/sleeper-player-headshot?player=${encodeURIComponent(String(id))}`);
  }
  return urls;
}

function probe(url,timeout=PROBE_TIMEOUT){
  return new Promise(resolve=>{
    const img=new Image();
    let done=false;
    const finish=value=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      img.onload=null;
      img.onerror=null;
      resolve(value);
    };
    const timer=setTimeout(()=>finish(''),timeout);
    img.onload=()=>finish(url);
    img.onerror=()=>finish('');
    img.decoding='async';
    img.fetchPriority='high';
    img.src=url;
  });
}

async function loadHeadshot(id){
  id=String(id);
  if(loaded.has(id)) return loaded.get(id);
  if((failedUntil.get(id)||0)>Date.now()) return'';
  if(pending.has(id)) return pending.get(id);
  const promise=(async()=>{
    try{
      for(const url of sourceUrls(id)){
        const ok=await probe(url);
        if(ok){loaded.set(id,ok);failedUntil.delete(id);return ok}
      }
      failedUntil.set(id,Date.now()+RETRY_AFTER);
      return'';
    }finally{
      pending.delete(id);
    }
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

function visibleIds(){
  const root=document.getElementById('teamView');
  if(!root)return[];
  const map=playerMap(),ids=[];
  for(const row of root.querySelectorAll('.player-row')){
    const id=rowPlayerId(row,map);
    if(id&&!ids.includes(id))ids.push(id);
  }
  return ids;
}

function preloadVisible(){
  // Start requests immediately but don't wait for them before the page is usable.
  for(const id of visibleIds()) loadHeadshot(id);
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
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{preloadVisible();apply()},20)}
const root=document.getElementById('teamView');
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
setTimeout(()=>{preloadVisible();apply()},20);
setTimeout(()=>{preloadVisible();apply()},250);
window.addEventListener('focus',()=>{preloadVisible();apply()});
})();