(()=>{
const state={busy:false,lastKey:'',data:null,status:'idle',message:''};
const css=`
.rb-lock-debug{margin-top:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.05);color:#8fa0b8;font-size:9px;line-height:1.45}.rb-lock-debug strong{color:#e8eef7}.rb-lock-debug code{color:#f3c75b;font-family:inherit}.rb-lock-debug.error code{color:#ff9aa9}.rb-lock-debug.ok code{color:#78efd3}
#teamView .lock-btn{margin-left:8px!important;min-height:32px!important;padding:8px 13px!important;border-radius:8px!important;font-size:10px!important;line-height:1!important;letter-spacing:.04em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;box-shadow:0 3px 10px rgba(0,0,0,.22)!important}
#teamView .lock-btn::before{content:'🔒';font-size:12px;line-height:1}
#teamView .lock-chip,#matchupView .lock-chip{margin-left:8px!important;min-height:32px!important;padding:8px 13px!important;border:1px solid #2f9d79!important;border-radius:999px!important;background:#123d34!important;color:#9ff6d7!important;font-size:10px!important;line-height:1!important;font-weight:900!important;letter-spacing:.05em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;box-shadow:0 0 0 1px rgba(48,216,160,.1),0 3px 10px rgba(0,0,0,.22)!important;animation:none!important;transform:none!important}
#teamView .lock-chip::before,#matchupView .lock-chip::before{content:'🔒';font-size:12px;line-height:1}
#teamView .player-row.locked-in,#matchupView .player-row.locked-in{position:relative!important;opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.14),rgba(48,216,160,.035) 55%,transparent)!important;box-shadow:inset 3px 0 0 rgba(48,216,160,.72)!important;animation:none!important;transform:none!important}
#teamView .player-row.locked-in .pname,#matchupView .player-row.locked-in .pname{color:#aaffdf!important;font-weight:900!important}
#teamView .player-row.locked-in .matchup-meta,#matchupView .player-row.locked-in .matchup-meta{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important}
#teamView .player-row.locked-in .matchup-meta::after,#matchupView .player-row.locked-in .matchup-meta::after{content:none!important;display:none!important}
`;
function addStyle(){if(document.getElementById('rbLockSyncStyle'))return;const s=document.createElement('style');s.id='rbLockSyncStyle';s.textContent=css;document.head.appendChild(s)}
function auth(){try{return sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||''}catch{return''}}
function scalar(v){return v==null?'':String(v)}
function ownObj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function currentKey(){try{return `${leagueId}:${selectedRoster}:${selectedWeek}`}catch{return''}}
function cacheKey(){const k=currentKey();return k?`rbLockState:${k}`:''}
function readCache(){try{const raw=sessionStorage.getItem(cacheKey());if(!raw)return null;const x=JSON.parse(raw);return x&&x.data?x:null}catch{return null}}
function writeCache(data){try{const k=cacheKey();if(k)sessionStorage.setItem(k,JSON.stringify({ts:Date.now(),data}))}catch{}}
function playerNameMap(){const map=new Map();try{for(const [id,p] of Object.entries(currentData?.players||{})){const n=String(p?.full_name||'').trim().toLowerCase();if(n&&!map.has(n))map.set(n,String(id))}}catch{}return map}
function rowPlayerId(row,names){const existing=String(row?.dataset?.rbPlayerId||'');if(existing)return existing;const name=String(row?.querySelector('.pname')?.textContent||'').replace(/\s*\(locked\)\s*$/i,'').trim().toLowerCase();const id=names.get(name)||'';if(id&&row?.dataset)row.dataset.rbPlayerId=id;return id}
function deepPair(node,pid,gid,depth=0){if(depth>5||node==null)return false;if(Array.isArray(node))return node.some(v=>deepPair(v,pid,gid,depth+1));if(typeof node!=='object')return false;const p=scalar(node.player_id??node.playerId??node.player??node.pid),g=scalar(node.game_id??node.gameId??node.game??node.gid);if(p===pid&&g===gid)return true;for(const [k,v] of Object.entries(node)){if(k===pid&&scalar(v)===gid)return true;if(k===gid&&scalar(v)===pid)return true;if(typeof v==='object'&&deepPair(v,pid,gid,depth+1))return true}return false}
function mapMatch(map,pid,gid){map=ownObj(map);if(scalar(map[pid])===gid||scalar(map[gid])===pid)return true;return deepPair(map,pid,gid)}
function starterIndexMatch(map,pid,gid){map=ownObj(map);const starters=(state.data?.starters||[]).map(String);const idx=starters.indexOf(pid);if(idx<0)return false;for(const key of [String(idx),String(idx+1)]){const v=map[key];if(scalar(v)===gid)return true;if(v&&typeof v==='object'&&deepPair(v,pid,gid))return true}return false}
function isLocked(pid,gid){if(!state.data)return false;pid=scalar(pid);gid=scalar(gid);for(const src of [state.data.startersGames,state.data.playerMap,state.data.subs])if(mapMatch(src,pid,gid)||starterIndexMatch(src,pid,gid))return true;return false}
function weekLockedPlayers(){const out=new Set(),starters=(state.data?.starters||[]).map(String),sg=ownObj(state.data?.startersGames);for(const [k,v] of Object.entries(sg)){if(starters.includes(String(k)))out.add(String(k));if(v&&typeof v==='object'){const pid=scalar(v.player_id??v.playerId??v.player??v.pid);if(pid&&starters.includes(pid))out.add(pid)}}return out}
function publicMatchupForRoster(rid){try{return (currentData?.matchups||[]).find(m=>Number(m.roster_id)===Number(rid))||null}catch{return null}}
function publicLockedPlayersForRoster(rid){
  const out=new Set(),m=publicMatchupForRoster(rid);if(!m)return out;
  const starters=(m.starters||[]).map(String),sg=ownObj(m.starters_games||m.startersGames);
  for(const [k,v] of Object.entries(sg)){
    if(starters.includes(String(k)))out.add(String(k));
    if(v&&typeof v==='object'){
      const pid=scalar(v.player_id??v.playerId??v.player??v.pid);
      if(pid&&starters.includes(pid))out.add(pid);
    }
  }
  return out;
}
function ensureLockedChip(row){if(!row)return;row.classList.remove('lockable','editable');row.classList.add('locked-in');row.setAttribute('aria-disabled','true');const copy=row.querySelector('.player-copy')||row.querySelector('.player-info')||row;const chips=[...row.querySelectorAll('.lock-chip')];let chip=chips[0];if(!chip){chip=document.createElement('span');chip.className='lock-chip'}chip.textContent='LOCKED IN';chip.setAttribute('aria-label','Locked in on Sleeper');chips.slice(1).forEach(x=>x.remove());row.querySelectorAll('.lock-btn').forEach(x=>x.remove());const meta=row.querySelector('.matchup-meta');if(meta&&chip.parentElement!==meta)meta.appendChild(chip);else if(!meta&&chip.parentElement!==copy)copy.appendChild(chip)}
function reconcileTeam(){
  document.querySelectorAll('#teamView [data-lock-player][data-lock-game]').forEach(btn=>{if(!isLocked(btn.dataset.lockPlayer,btn.dataset.lockGame))return;const row=btn.closest('.player-row');btn.remove();ensureLockedChip(row)});
  const locked=new Set([...publicLockedPlayersForRoster(selectedRoster),...weekLockedPlayers()]);if(!locked.size)return;
  const names=playerNameMap();document.querySelectorAll('#teamView .player-row').forEach(row=>{const pid=rowPlayerId(row,names);if(pid&&locked.has(pid))ensureLockedChip(row)});
}
function reconcileMatchup(){
  const root=document.getElementById('matchupView');if(!root)return;
  const rosters=[...root.querySelectorAll('.match-roster')];if(!rosters.length)return;
  let me=null,opp=null;try{me=publicMatchupForRoster(selectedRoster);opp=(currentData?.matchups||[]).find(x=>me&&x.matchup_id===me.matchup_id&&Number(x.roster_id)!==Number(selectedRoster))||null}catch{}
  const matchupRows=[me,opp];const names=playerNameMap();
  rosters.forEach((container,index)=>{
    const m=matchupRows[index];if(!m)return;const locked=publicLockedPlayersForRoster(m.roster_id);if(!locked.size)return;
    container.querySelectorAll('.player-row').forEach(row=>{const pid=rowPlayerId(row,names);if(pid&&locked.has(pid))ensureLockedChip(row)});
  });
}
function reconcile(){reconcileTeam();reconcileMatchup()}
function count(v){return v&&typeof v==='object'?Object.keys(v).length:0}
function diagnosticText(){if(state.status==='missing-token')return'No Sleeper session token found in this tab.';if(state.status==='error')return state.message||'Unknown lock sync error.';const d=state.data;if(!d)return state.message||'Waiting for private Sleeper lock state…';return `round ${d.chosenRound??selectedWeek} · starters_games ${count(d.startersGames)} · player_map ${count(d.playerMap)} · custom_points ${count(d.customPoints)} · subs ${count(d.subs)}`}
function showDiagnostic(){const host=document.getElementById('activityBody');if(!host)return;let el=document.getElementById('rbLockDebug');if(!el){el=document.createElement('div');el.id='rbLockDebug';el.className='rb-lock-debug';host.appendChild(el)}el.classList.toggle('error',state.status==='error'||state.status==='missing-token');el.classList.toggle('ok',state.status==='ok'||state.status==='cached');const html=`<strong>Lock sync${state.status==='ok'?' OK':state.status==='cached'?' CACHED':state.status==='error'?' ERROR':''}</strong><br><code>${diagnosticText()}</code>`;if(el.innerHTML!==html)el.innerHTML=html}
function hydrateCache(){const cached=readCache();if(!cached?.data)return false;state.data=cached.data;state.lastKey=currentKey();state.status='cached';if(typeof lockedGames!=='undefined'&&state.data.startersGames&&typeof state.data.startersGames==='object')lockedGames=state.data.startersGames;reconcile();showDiagnostic();return true}
async function sync(force=false){const token=auth();if(!token){state.status='missing-token';reconcile();showDiagnostic();return}const key=currentKey();if(!key||state.busy)return;if(!force&&state.lastKey===key&&state.data){reconcile();return}state.busy=true;try{const r=await fetch('/.netlify/functions/sleeper-lock-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,leagueId,rosterId:selectedRoster,leg:selectedWeek,round:selectedWeek})});let d={};try{d=await r.json()}catch{}if(r.ok&&d.ok){state.data=d;state.lastKey=key;state.status='ok';state.message='';writeCache(d);if(typeof lockedGames!=='undefined'&&d.startersGames&&typeof d.startersGames==='object')lockedGames=d.startersGames;reconcile()}else{state.status='error';state.message=`HTTP ${r.status}: ${d.error||d.detail||'Sleeper lock-state request failed.'}`;reconcile()}}catch(e){state.status='error';state.message=`Request failed: ${String(e?.message||e)}`;reconcile()}finally{state.busy=false;showDiagnostic()}}
function applyBurst(){reconcile();requestAnimationFrame(reconcile);setTimeout(reconcile,60);setTimeout(reconcile,180)}
function boot(){hydrateCache();applyBurst();sync(true)}
addStyle();
document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab')){setTimeout(applyBurst,0);setTimeout(applyBurst,120)}},true);
window.addEventListener('focus',()=>{hydrateCache();applyBurst();sync(true)});
let tries=0;const starter=setInterval(()=>{tries++;if(document.querySelector('#teamView .player-row')||document.querySelector('#matchupView .player-row')){clearInterval(starter);boot()}else if(tries>=30){clearInterval(starter);sync(true)}},100);
})();