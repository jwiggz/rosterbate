(()=>{
const fin=v=>Number.isFinite(Number(v))?Number(v):null;
const cache=()=>{try{return JSON.parse(sessionStorage.getItem(`rbLockState:${leagueId}:${selectedRoster}:${selectedWeek}`)||'null')?.data||null}catch{return null}};
const locked=(sg,p)=>Object.prototype.hasOwnProperty.call(sg||{},p)||Object.values(sg||{}).some(v=>v&&typeof v==='object'&&String(v.player_id??v.playerId??v.player??v.pid??'')===p);
const gid=(sg,p)=>{const v=sg?.[p];if(typeof v==='string'||typeof v==='number')return String(v);if(v&&typeof v==='object')return String(v.game_id??v.gameId??v.game??v.gid??'');for(const [k,x] of Object.entries(sg||{}))if(x&&typeof x==='object'&&String(x.player_id??x.playerId??x.player??x.pid??'')===p)return String(x.game_id??x.gameId??x.game??x.gid??k);return''};
function score(n,p,g,d=0){if(d>5||n==null)return null;if(Array.isArray(n)){for(const x of n){const q=score(x,p,g,d+1);if(q!==null)return q}return null}if(typeof n!=='object')return null;for(const k of [p,g].filter(Boolean)){if(k in n){const x=n[k],q=fin(x);if(q!==null)return q;if(x&&typeof x==='object')for(const a of ['points','pts','fantasy_points','fantasyPoints','score','value']){const z=fin(x[a]);if(z!==null)return z}}}for(const x of Object.values(n)){if(x&&typeof x==='object'){const xp=String(x.player_id??x.playerId??x.player??x.pid??''),xg=String(x.game_id??x.gameId??x.game??x.gid??'');if((!xp||xp===p)&&(!xg||!g||xg===g))for(const a of ['points','pts','fantasy_points','fantasyPoints','score','value']){const z=fin(x[a]);if(z!==null)return z}const q=score(x,p,g,d+1);if(q!==null)return q}}return null}
// Frozen Lock-In score = the player's fantasy points in the exact game he is locked to
// (starters_games), from box scores scored with this league's settings. Sleeper's public
// player points move on to later games, and its private leg can omit points.
const lockedFp={map:{},loaded:new Set(),pending:null};
function gameDate(g){try{const x=(currentData?.schedule||[]).find(s=>String(s.game_id||'')===String(g||''));return x?.date||''}catch{return''}}
function lockedGameScore(p,g){const date=gameDate(g);if(!date)return null;const list=lockedFp.map[String(p)];if(!list)return null;const hit=list.find(x=>x.date===date&&!x.live);return hit?fin(hit.fpts):null}
function requestLockedScores(pids){
  const need=[...new Set(pids.map(String))].filter(p=>/^\d+$/.test(p)&&!lockedFp.loaded.has(`${leagueId}:${selectedWeek}:${p}`));
  if(!need.length)return;
  if(lockedFp.pending){lockedFp.queue=[...new Set([...(lockedFp.queue||[]),...need])];return}
  lockedFp.pending=fetch(`/.netlify/functions/sleeper-scores?league=${encodeURIComponent(leagueId)}&games=${need.join(',')}&days=10`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{
    for(const p of need){lockedFp.loaded.add(`${leagueId}:${selectedWeek}:${p}`);if(d?.games_by_player?.[p])lockedFp.map[p]=d.games_by_player[p]}
  }).catch(()=>{}).finally(()=>{lockedFp.pending=null;const q=lockedFp.queue||[];lockedFp.queue=[];if(q.length)setTimeout(()=>requestLockedScores(q),0);try{apply()}catch{}try{renderLockTotals()}catch{}try{window.dispatchEvent(new CustomEvent('rb:locked-scores'))}catch{}});
}
window.rbRequestLockedScores=pids=>requestLockedScores(pids||[]);
window.rbLockedGameScore=(p,g)=>{const v=lockedGameScore(p,g);if(v===null)requestLockedScores([p]);return v};
function restoreLockedGames(){try{const d=cache();if(d?.startersGames&&typeof d.startersGames==='object')lockedGames=d.startersGames}catch{}}
function apply(){try{const d=cache();if(!d)return;restoreLockedGames();try{requestLockedScores(Object.keys(d.startersGames||{}))}catch{}const sg=d.startersGames||{},cp=d.customPoints||{},st=(d.starters||[]).map(String);let c=0;for(const p of st){if(!locked(sg,p))continue;c++;const name=String(currentData?.players?.[p]?.full_name||'').toLowerCase();const row=[...document.querySelectorAll('#teamView .player-row')].find(r=>String(r.querySelector('.pname')?.textContent||'').toLowerCase().includes(name));let v=score(cp,p,gid(sg,p));if(v===null)v=lockedGameScore(p,gid(sg,p));if(row&&v!==null){const cell=row.querySelector('.pts');if(cell)cell.textContent=v.toFixed(1)}}const at=window.rbAuthoritativeLockedTotal?.();const t=at??fin(d.lockedTotal??d.points),box=document.querySelector('#teamView .rb-lock-total.locked');if(box&&t!==null){const b=box.querySelector('b'),s=box.querySelector('small');if(b)b.textContent=t.toFixed(1);if(s)s.textContent=`${c} verified locks`}}catch{}}
const kick=()=>{apply();setTimeout(apply,0);setTimeout(apply,40)};
window.rbApplyAuthoritativeLockedScores=apply;
window.rbAuthoritativeLockedTotal=function(){try{const d=cache();if(!d)return null;const sg=d.startersGames||{},cp=d.customPoints||{},st=(d.starters||[]).map(String);let total=0,found=0,count=0;for(const p of st){if(!locked(sg,p))continue;count++;let v=score(cp,p,gid(sg,p));if(v===null)v=lockedGameScore(p,gid(sg,p));if(v!==null){total+=v;found++}}if(count&&found===count)return Math.round(total*10)/10;const t=fin(d.lockedTotal??d.points);return t!==null&&t>0?t:null}catch{return null}};
window.rbRestoreAuthoritativeLockedGames=restoreLockedGames;
window.addEventListener('rb:sleeper-lock-state',kick);window.addEventListener('rb:initial-reconcile-complete',kick);document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn'))kick()},true);
try{if(typeof renderTeam==='function'&&!renderTeam.__rbAuthoritativeScoreFix){const b=renderTeam;const w=function(...a){restoreLockedGames();const o=b.apply(this,a);try{window.rbLockWindowRefresh?.()}catch{}apply();return o};w.__rbAuthoritativeScoreFix=true;renderTeam=w;window.renderTeam=w}}catch{}
kick();
})();