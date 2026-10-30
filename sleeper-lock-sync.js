(()=>{
const state={busy:false,lastKey:'',data:null,status:'idle',message:'',privateDenied:new Set(),fallbackStats:new Map(),fallbackLoading:new Set()};
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
#teamView .rb-lock-totals{margin-left:auto;display:flex;align-items:center;gap:8px;margin-right:10px}
#teamView .rb-lock-total{min-width:94px;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:#192434;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;line-height:1.05}
#teamView .rb-lock-total span{font-size:7px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#8190a5}
#teamView .rb-lock-total b{margin-top:4px;font-size:14px;font-weight:950;color:#e9eef7}
#teamView .rb-lock-total.locked{border-color:rgba(48,216,160,.24);background:linear-gradient(180deg,rgba(23,77,64,.55),rgba(16,50,43,.42))}
#teamView .rb-lock-total.locked b{color:#49e7b1;text-shadow:0 0 8px rgba(48,216,160,.24)}
#teamView .rb-lock-total.projected{border-color:rgba(243,199,91,.24);background:linear-gradient(180deg,rgba(87,68,25,.45),rgba(53,43,22,.36))}
#teamView .rb-lock-total.projected b{color:#f3c75b;text-shadow:0 0 8px rgba(243,199,91,.18)}
#teamView .rb-lock-total small{margin-top:3px;font-size:6px;color:#7f8da2;font-weight:800;white-space:nowrap}
#teamView .proj.rb-fallback-proj{color:#e6b95a!important;position:relative}
#teamView .proj.rb-fallback-proj::after{content:'~';font-size:7px;margin-left:2px;color:#9b8a61;vertical-align:top}
#teamView .rb-injury-badge,#matchupView .rb-injury-badge{display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:5px!important;padding:1px 5px!important;border-radius:4px!important;font-size:7px!important;font-weight:950!important;line-height:1.3!important;letter-spacing:.03em!important;vertical-align:middle!important}
#teamView .rb-injury-badge.out,#matchupView .rb-injury-badge.out{background:rgba(239,102,128,.16)!important;color:#ff8fa7!important;border:1px solid rgba(239,102,128,.35)!important}
#teamView .rb-injury-badge.questionable,#matchupView .rb-injury-badge.questionable{background:rgba(243,199,91,.13)!important;color:#ffd86f!important;border:1px solid rgba(243,199,91,.28)!important}
#teamView .rb-injury-badge.ir,#matchupView .rb-injury-badge.ir{background:rgba(169,106,255,.14)!important;color:#c79aff!important;border:1px solid rgba(169,106,255,.3)!important}
@media(max-width:1050px){#teamView .rb-lock-totals{display:none}}
`;
function addStyle(){if(document.getElementById('rbLockSyncStyle'))return;const s=document.createElement('style');s.id='rbLockSyncStyle';s.textContent=css;document.head.appendChild(s)}
function auth(){try{return sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||''}catch{return''}}
function scalar(v){return v==null?'':String(v)}
function ownObj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function num1(v){const n=Number(v);return Number.isFinite(n)?n.toFixed(1):'0.0'}
function currentKey(){try{return `${leagueId}:${selectedRoster}:${selectedWeek}`}catch{return''}}
function cacheKey(){const k=currentKey();return k?`rbLockState:${k}`:''}
function statsKey(rid){return `${String(leagueId)}:${String(rid)}`}
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
function lockedPlayersForRoster(rid){
  const out=publicLockedPlayersForRoster(rid);
  if(Number(rid)===Number(selectedRoster))for(const pid of weekLockedPlayers())out.add(pid);
  return out;
}
function normalizeInjuryStatus(p){
  const raw=String(p?.injury_status||p?.injuryStatus||'').trim().toUpperCase();
  const status=String(p?.status||'').trim().toUpperCase();
  const candidate=raw||(['OUT','DTD','GTD','Q','QUESTIONABLE','DOUBTFUL','IR','INJURED_RESERVE','OFS','SUSPENDED','INACTIVE'].includes(status)?status:'');
  const aliases={QUESTIONABLE:'Q',DOUBTFUL:'DTD',INJURED_RESERVE:'IR',DAY_TO_DAY:'DTD',GAME_TIME_DECISION:'GTD'};
  return aliases[candidate]||candidate;
}
function injuryClass(status){if(['OUT','OFS','SUSPENDED','INACTIVE'].includes(status))return'out';if(['DTD','GTD','Q'].includes(status))return'questionable';if(status==='IR')return'ir';return''}
function isUnavailable(pid){const s=normalizeInjuryStatus(currentData?.players?.[String(pid)]);return ['OUT','IR','OFS','SUSPENDED','INACTIVE'].includes(s)}
function decorateInjuries(root=document){
  const names=playerNameMap();
  root.querySelectorAll?.('.player-row').forEach(row=>{
    const pid=rowPlayerId(row,names);if(!pid)return;
    const p=currentData?.players?.[String(pid)]||{};const status=normalizeInjuryStatus(p);const name=row.querySelector('.pname');if(!name)return;
    let badge=row.querySelector('.rb-injury-badge');
    if(!status){badge?.remove();return}
    if(!badge){badge=document.createElement('span');badge.className='rb-injury-badge';name.insertAdjacentElement('afterend',badge)}
    badge.className=`rb-injury-badge ${injuryClass(status)}`;badge.textContent=status;badge.title=`Sleeper injury status: ${status}`;
  });
}
function projectionGamesFor(pid){const p=currentData?.projections?.[String(pid)];return Array.isArray(p?.games)?p.games:[]}
function scheduleGameForProjection(pg,pid){
  const schedule=currentData?.schedule||[];const gid=String(pg?.game_id||'');const date=String(pg?.date||'');
  if(gid){const byId=schedule.find(g=>String(g.game_id||'')===gid);if(byId)return byId}
  const team=String(currentData?.players?.[String(pid)]?.team||'');
  return schedule.find(g=>String(g.date||'')===date&&(!team||g.home===team||g.away===team))||null;
}
function hasFutureLockableGame(pid){
  if(isUnavailable(pid))return false;
  const team=String(currentData?.players?.[String(pid)]?.team||'');
  return (currentData?.schedule||[]).some(g=>!g.calendar_only&&String(g.status||'pre_game')==='pre_game'&&(!team||g.home===team||g.away===team));
}
function fallbackProjection(pid,rid=selectedRoster){
  if(isUnavailable(pid))return null;
  const d=state.fallbackStats.get(statsKey(rid));const p=d?.players?.[String(pid)];
  const v=Number(p?.fantasy_points_avg);return Number.isFinite(v)&&v>0?v:null;
}
function bestRemainingProjection(pid,rid=selectedRoster){
  if(isUnavailable(pid))return null;
  let best=null;
  for(const pg of projectionGamesFor(pid)){
    const pts=Number(pg?.points);if(!Number.isFinite(pts))continue;
    const sg=scheduleGameForProjection(pg,pid);
    if(sg&&String(sg.status||'pre_game')!=='pre_game')continue;
    if(best===null||pts>best)best=pts;
  }
  if(best!==null)return best;
  return hasFutureLockableGame(pid)?fallbackProjection(pid,rid):null;
}
async function ensureFallbackStats(rid){
  const key=statsKey(rid);if(state.fallbackStats.has(key)||state.fallbackLoading.has(key))return;
  state.fallbackLoading.add(key);
  try{
    const r=await fetch(`/.netlify/functions/sleeper-player-stats?league=${encodeURIComponent(leagueId)}&roster=${encodeURIComponent(rid)}&_=${Date.now()}`,{cache:'no-store'});const d=await r.json();
    if(r.ok&&d?.ok)state.fallbackStats.set(key,d);
  }catch{}finally{state.fallbackLoading.delete(key);decorateFallbackProjections(rid);renderLockTotals()}
}
function decorateFallbackProjections(rid=selectedRoster){
  const names=playerNameMap();
  document.querySelectorAll('#teamView .player-row').forEach(row=>{
    const pid=rowPlayerId(row,names),cell=row.querySelector('.proj');if(!pid||!cell)return;
    if(isUnavailable(pid)){
      if(cell.classList.contains('rb-fallback-proj')){cell.textContent='—';cell.classList.remove('rb-fallback-proj');cell.removeAttribute('title')}
      return;
    }
    const native=String(cell.textContent||'').trim();
    if(native&&native!=='—'&&native!=='-'){cell.classList.remove('rb-fallback-proj');cell.removeAttribute('title');return}
    const v=fallbackProjection(pid,rid);if(v===null)return;
    cell.textContent=num1(v);cell.classList.add('rb-fallback-proj');cell.title='Estimated from season per-game fantasy average because Sleeper has no projection for this player.';
  });
}
function verifiedLockedTotal(rid){
  const m=publicMatchupForRoster(rid);if(!m)return null;
  const locked=lockedPlayersForRoster(rid);if(!locked.size)return null;
  const starters=(m.starters||[]).map(String),pts=Array.isArray(m.starters_points)?m.starters_points:[];
  let total=0,used=0;starters.forEach((pid,i)=>{if(!locked.has(pid))return;const v=Number(pts[i]);if(Number.isFinite(v)){total+=v;used++}});
  return used?total:null;
}
function lockTotalsForRoster(rid){
  const m=publicMatchupForRoster(rid);if(!m)return{locked:null,projected:null,remaining:0,totalStarters:0,knownLocks:0};
  const starters=(m.starters||[]).map(String).filter(id=>id&&id!=='0');
  const lockedPlayers=lockedPlayersForRoster(rid);
  const locked=verifiedLockedTotal(rid);
  let projected=locked===null?0:locked,remaining=0;
  for(const pid of starters){
    if(lockedPlayers.has(pid))continue;
    const best=bestRemainingProjection(pid,rid);
    if(best!==null){projected+=best;remaining++}
  }
  return{locked,projected:projected||null,remaining,totalStarters:starters.length,knownLocks:lockedPlayers.size};
}
function renderLockTotals(){
  const top=document.querySelector('#teamView .team-top');if(!top)return;
  let box=top.querySelector('.rb-lock-totals');if(!box){box=document.createElement('div');box.className='rb-lock-totals';const weekNav=top.querySelector('.week-nav');if(weekNav)top.insertBefore(box,weekNav);else top.appendChild(box)}
  const totals=lockTotalsForRoster(selectedRoster),lockedText=totals.locked===null?'—':num1(totals.locked),projectedText=totals.projected===null?'—':num1(totals.projected);
  box.innerHTML=`<div class="rb-lock-total locked"><span>Locked Points</span><b>${lockedText}</b><small>${totals.knownLocks} verified locks</small></div><div class="rb-lock-total projected"><span>Projected Lock-In</span><b>${projectedText}</b><small>best remaining game / player</small></div>`;
}
function ensureLockedChip(row){if(!row)return;row.classList.remove('lockable','editable');row.classList.add('locked-in');row.setAttribute('aria-disabled','true');const copy=row.querySelector('.player-copy')||row.querySelector('.player-info')||row;const chips=[...row.querySelectorAll('.lock-chip')];let chip=chips[0];if(!chip){chip=document.createElement('span');chip.className='lock-chip'}chip.textContent='LOCKED IN';chip.setAttribute('aria-label','Locked in on Sleeper');chips.slice(1).forEach(x=>x.remove());row.querySelectorAll('.lock-btn').forEach(x=>x.remove());const meta=row.querySelector('.matchup-meta');if(meta&&chip.parentElement!==meta)meta.appendChild(chip);else if(!meta&&chip.parentElement!==copy)copy.appendChild(chip)}
function reconcileTeam(){
  document.querySelectorAll('#teamView [data-lock-player][data-lock-game]').forEach(btn=>{if(!isLocked(btn.dataset.lockPlayer,btn.dataset.lockGame))return;const row=btn.closest('.player-row');btn.remove();ensureLockedChip(row)});
  const locked=lockedPlayersForRoster(selectedRoster);
  if(locked.size){const names=playerNameMap();document.querySelectorAll('#teamView .player-row').forEach(row=>{const pid=rowPlayerId(row,names);if(pid&&locked.has(pid))ensureLockedChip(row)})}
  decorateInjuries(document.getElementById('teamView')||document);decorateFallbackProjections(selectedRoster);renderLockTotals();ensureFallbackStats(selectedRoster);
}
function reconcileMatchup(){
  const root=document.getElementById('matchupView');if(!root)return;
  const rosters=[...root.querySelectorAll('.match-roster')];if(!rosters.length){decorateInjuries(root);return}
  let me=null,opp=null;try{me=publicMatchupForRoster(selectedRoster);opp=(currentData?.matchups||[]).find(x=>me&&x.matchup_id===me.matchup_id&&Number(x.roster_id)!==Number(selectedRoster))||null}catch{}
  const matchupRows=[me,opp],names=playerNameMap();
  rosters.forEach((container,index)=>{
    const m=matchupRows[index];if(!m)return;const locked=lockedPlayersForRoster(m.roster_id);if(!locked.size)return;
    container.querySelectorAll('.player-row').forEach(row=>{const pid=rowPlayerId(row,names);if(pid&&locked.has(pid))ensureLockedChip(row)});
  });
  decorateInjuries(root);
}
function reconcile(){reconcileTeam();reconcileMatchup()}
function count(v){return v&&typeof v==='object'?Object.keys(v).length:0}
function diagnosticText(){if(state.status==='public')return'Viewing public lock fields for this roster; no private opponent lock inference.';if(state.status==='missing-token')return'No Sleeper session token found in this tab.';if(state.status==='error')return state.message||'Unknown lock sync error.';const d=state.data;if(!d)return state.message||'Waiting for private Sleeper lock state…';return `round ${d.chosenRound??selectedWeek} · starters_games ${count(d.startersGames)} · player_map ${count(d.playerMap)} · custom_points ${count(d.customPoints)} · subs ${count(d.subs)}`}
function showDiagnostic(){const host=document.getElementById('activityBody');if(!host)return;let el=document.getElementById('rbLockDebug');if(!el){el=document.createElement('div');el.id='rbLockDebug';el.className='rb-lock-debug';host.appendChild(el)}el.classList.toggle('error',state.status==='error'||state.status==='missing-token');el.classList.toggle('ok',state.status==='ok'||state.status==='cached'||state.status==='public');const html=`<strong>Lock sync${state.status==='ok'?' OK':state.status==='cached'?' CACHED':state.status==='public'?' PUBLIC':state.status==='error'?' ERROR':''}</strong><br><code>${diagnosticText()}</code>`;if(el.innerHTML!==html)el.innerHTML=html}
function hydrateCache(){const cached=readCache();if(!cached?.data)return false;state.data=cached.data;state.lastKey=currentKey();state.status='cached';if(typeof lockedGames!=='undefined'&&state.data.startersGames&&typeof state.data.startersGames==='object')lockedGames=state.data.startersGames;reconcile();showDiagnostic();return true}
async function sync(force=false){
  const token=auth(),key=currentKey();if(!key||state.busy)return;
  if(state.privateDenied.has(key)){
    state.data=null;state.lastKey=key;state.status='public';state.message='';reconcile();showDiagnostic();return;
  }
  if(!token){state.data=null;state.status='missing-token';reconcile();showDiagnostic();return}
  if(!force&&state.lastKey===key&&state.data){reconcile();return}
  state.busy=true;
  try{
    const r=await fetch('/.netlify/functions/sleeper-lock-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,leagueId,rosterId:selectedRoster,leg:selectedWeek,round:selectedWeek})});
    let d={};try{d=await r.json()}catch{}
    if(r.ok&&d.ok){
      state.data=d;state.lastKey=key;state.status='ok';state.message='';writeCache(d);
      if(typeof lockedGames!=='undefined'&&d.startersGames&&typeof d.startersGames==='object')lockedGames=d.startersGames;
      reconcile();
    }else if(r.status===403){
      state.privateDenied.add(key);state.data=null;state.lastKey=key;state.status='public';state.message='';reconcile();
    }else{
      state.status='error';state.message=`HTTP ${r.status}: ${d.error||d.detail||'Sleeper lock-state request failed.'}`;reconcile();
    }
  }catch(e){state.status='error';state.message=`Request failed: ${String(e?.message||e)}`;reconcile()}
  finally{state.busy=false;showDiagnostic()}
}
function applyBurst(){reconcile();requestAnimationFrame(reconcile);setTimeout(reconcile,60);setTimeout(reconcile,180)}
function boot(){hydrateCache();applyBurst();sync(true)}
addStyle();
document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab,#teamPicker')){setTimeout(applyBurst,0);setTimeout(()=>sync(true),80);setTimeout(applyBurst,160)}},true);
window.addEventListener('focus',()=>{hydrateCache();applyBurst();sync(true)});
let tries=0;const starter=setInterval(()=>{tries++;if(document.querySelector('#teamView .player-row')||document.querySelector('#matchupView .player-row')){clearInterval(starter);boot()}else if(tries>=30){clearInterval(starter);sync(true)}},100);
})();