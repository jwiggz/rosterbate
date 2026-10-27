(()=>{
const state={busy:false,lastKey:'',data:null,timer:null,status:'idle',message:''};
const css=`
.rb-lock-debug{margin-top:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.05);color:#8fa0b8;font-size:9px;line-height:1.45}.rb-lock-debug strong{color:#e8eef7}.rb-lock-debug code{color:#f3c75b;font-family:inherit}.rb-lock-debug.error code{color:#ff9aa9}.rb-lock-debug.ok code{color:#78efd3}
#teamView .lock-btn{margin-left:8px!important;min-height:32px!important;padding:8px 13px!important;border-radius:8px!important;font-size:10px!important;line-height:1!important;letter-spacing:.04em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;box-shadow:0 3px 10px rgba(0,0,0,.22)!important}
#teamView .lock-btn::before{content:'🔒';font-size:12px;line-height:1}
#teamView .lock-chip{margin-left:8px!important;min-height:32px!important;padding:8px 13px!important;border:1px solid #2f9d79!important;border-radius:999px!important;background:#123d34!important;color:#9ff6d7!important;font-size:10px!important;line-height:1!important;font-weight:900!important;letter-spacing:.05em!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;box-shadow:0 0 0 1px rgba(48,216,160,.1),0 3px 10px rgba(0,0,0,.22)!important;animation:none!important;transform:none!important}
#teamView .lock-chip::before{content:'🔒';font-size:12px;line-height:1}
#teamView .player-row.locked-in{position:relative!important;opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.14),rgba(48,216,160,.035) 55%,transparent)!important;box-shadow:inset 3px 0 0 rgba(48,216,160,.72)!important;animation:none!important;transform:none!important}
#teamView .player-row.locked-in .pname{color:#aaffdf!important;font-weight:900!important}
#teamView .player-row.locked-in .player-copy{position:relative!important}
#teamView .player-row.locked-in .matchup-meta{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important}
#teamView .player-row.locked-in .matchup-meta::after{content:none!important;display:none!important;animation:none!important}
`;
function addStyle(){if(document.getElementById('rbLockSyncStyle'))return;const s=document.createElement('style');s.id='rbLockSyncStyle';s.textContent=css;document.head.appendChild(s)}
function auth(){try{return sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||''}catch{return''}}
function scalar(v){return v==null?'':String(v)}
function ownObj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function deepPair(node,pid,gid,depth=0){if(depth>5||node==null)return false;if(Array.isArray(node))return node.some(v=>deepPair(v,pid,gid,depth+1));if(typeof node!=='object')return false;const p=scalar(node.player_id??node.playerId??node.player??node.pid),g=scalar(node.game_id??node.gameId??node.game??node.gid);if(p===pid&&g===gid)return true;for(const [k,v] of Object.entries(node)){if(k===pid&&scalar(v)===gid)return true;if(k===gid&&scalar(v)===pid)return true;if(typeof v==='object'&&deepPair(v,pid,gid,depth+1))return true}return false}
function mapMatch(map,pid,gid){map=ownObj(map);if(scalar(map[pid])===gid)return true;if(scalar(map[gid])===pid)return true;const direct=map[pid];if(direct&&typeof direct==='object'&&deepPair(direct,pid,gid))return true;const reverse=map[gid];if(reverse&&typeof reverse==='object'&&deepPair(reverse,pid,gid))return true;return deepPair(map,pid,gid)}
function starterIndexMatch(map,pid,gid){map=ownObj(map);const starters=(state.data?.starters||[]).map(String);const idx=starters.indexOf(pid);if(idx<0)return false;for(const key of [String(idx),String(idx+1)]){const v=map[key];if(scalar(v)===gid)return true;if(v&&typeof v==='object'&&deepPair(v,pid,gid))return true}return false}
function isLocked(pid,gid){pid=scalar(pid);gid=scalar(gid);if(!pid||!gid||!state.data)return false;const sources=[state.data.startersGames,state.data.playerMap,state.data.subs];for(const src of sources){if(mapMatch(src,pid,gid)||starterIndexMatch(src,pid,gid))return true}return false}
function weekLockedPlayers(){
  const out=new Set();
  const starters=(state.data?.starters||[]).map(String);
  const sg=ownObj(state.data?.startersGames);
  for(const [k,v] of Object.entries(sg)){
    if(starters.includes(String(k))) out.add(String(k));
    if(v&&typeof v==='object'){
      const pid=scalar(v.player_id??v.playerId??v.player??v.pid);
      if(pid&&starters.includes(pid)) out.add(pid);
    }
  }
  return out;
}
function ensureLockedChip(row){
  if(!row)return;
  row.classList.remove('lockable','editable');
  row.classList.add('locked-in');
  row.setAttribute('aria-disabled','true');
  const copy=row.querySelector('.player-copy');
  if(!copy)return;
  const chips=[...row.querySelectorAll('.lock-chip')];
  let chip=chips[0]||null;
  if(!chip){chip=document.createElement('span');chip.className='lock-chip'}
  chip.textContent='LOCKED IN';
  chip.setAttribute('aria-label','Locked in on Sleeper');
  chips.slice(1).forEach(x=>x.remove());
  row.querySelectorAll('.lock-btn').forEach(x=>x.remove());
  const meta=copy.querySelector('.matchup-meta');
  if(meta){if(chip.parentElement!==meta)meta.appendChild(chip)}else if(chip.parentElement!==copy){copy.appendChild(chip)}
}
function reconcile(){
  document.querySelectorAll('#teamView [data-lock-player][data-lock-game]').forEach(btn=>{const pid=btn.dataset.lockPlayer,gid=btn.dataset.lockGame;if(!isLocked(pid,gid))return;const row=btn.closest('.player-row');btn.remove();ensureLockedChip(row)});
  const lockedPlayers=weekLockedPlayers();
  if(lockedPlayers.size){
    document.querySelectorAll('#teamView .player-row').forEach(row=>{
      const pid=String(row.dataset.rbPlayerId||'');
      if(pid&&lockedPlayers.has(pid)) ensureLockedChip(row);
    });
  }
}
function count(v){return v&&typeof v==='object'?Object.keys(v).length:0}
function diagnosticText(){if(state.status==='missing-token')return'No Sleeper session token found in this tab.';if(state.status==='error')return state.message||'Unknown lock sync error.';const d=state.data;if(!d)return state.message||'Waiting for private Sleeper lock state…';const mode=d.queryMode?` · ${d.queryMode}`:'';return `round ${d.chosenRound??selectedWeek}${mode} · starters_games ${count(d.startersGames)} · player_map ${count(d.playerMap)} · custom_points ${count(d.customPoints)} · subs ${count(d.subs)}`}
function showDiagnostic(){const host=document.getElementById('activityBody');if(!host)return;let el=document.getElementById('rbLockDebug');if(!el){el=document.createElement('div');el.id='rbLockDebug';el.className='rb-lock-debug';host.appendChild(el)}el.classList.toggle('error',state.status==='error'||state.status==='missing-token');el.classList.toggle('ok',state.status==='ok');el.innerHTML=`<strong>Lock sync${state.status==='ok'?' OK':state.status==='error'?' ERROR':''}</strong><br><code>${diagnosticText()}</code>`}
async function sync(force=false){const token=auth();if(!token){state.status='missing-token';state.message='No Sleeper session token found in this tab.';showDiagnostic();return}if(state.busy||typeof leagueId==='undefined'||typeof selectedRoster==='undefined'||typeof selectedWeek==='undefined')return;const key=`${leagueId}:${selectedRoster}:${selectedWeek}`;if(!force&&state.lastKey===key&&state.data){reconcile();showDiagnostic();return}state.busy=true;state.status='loading';state.message='Loading private Sleeper lock state…';showDiagnostic();try{const r=await fetch('/.netlify/functions/sleeper-lock-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,leagueId,rosterId:selectedRoster,leg:selectedWeek,round:selectedWeek})});let d={};try{d=await r.json()}catch{d={error:'Non-JSON response from lock-state endpoint.'}}if(r.ok&&d.ok){state.data=d;state.lastKey=key;state.status='ok';state.message='';if(typeof lockedGames!=='undefined'&&d.startersGames&&typeof d.startersGames==='object')lockedGames=d.startersGames;reconcile();showDiagnostic()}else{state.status='error';state.message=`HTTP ${r.status}: ${d.error||d.detail||d?.sleeper?.errors?.[0]?.message||'Sleeper lock-state request failed.'}`;showDiagnostic()}}catch(e){state.status='error';state.message=`Request failed: ${String(e?.message||e)}`;showDiagnostic()}finally{state.busy=false}}
function schedule(){clearTimeout(state.timer);state.timer=setTimeout(()=>{reconcile();sync(false)},120)}
addStyle();
const tv=document.getElementById('teamView');if(tv)new MutationObserver(schedule).observe(tv,{childList:true,subtree:true});
const activity=document.getElementById('activityBody');if(activity)new MutationObserver(()=>showDiagnostic()).observe(activity,{childList:true});
setTimeout(()=>sync(true),250);
window.addEventListener('focus',()=>sync(true));
})();