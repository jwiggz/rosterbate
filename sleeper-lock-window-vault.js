(()=>{
  const tx={key:'',ready:false,loading:null,acquired:new Map()};
  const fantasyDay=()=>{const d=new Date();if(d.getHours()<6)d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const starters=()=>{try{return new Set((matchup(selectedRoster)?.starters||[]).map(String).filter(x=>x&&x!=='0'))}catch{return new Set()}};
  const gameTime=g=>{try{const t=window.rbStarterHistory?.parseGameTime?.(g);if(Number.isFinite(t))return t}catch{}const raw=g?.start_time??g?.start??g?.game_time??g?.datetime??'';if(typeof raw==='number'&&Number.isFinite(raw))return raw<1e12?raw*1000:raw;const s=String(raw||'').trim();if(/^\d{10,13}$/.test(s)){const n=Number(s);return s.length<=10?n*1000:n}const t=Date.parse(s);if(Number.isFinite(t))return t;const d=Date.parse(`${String(g?.date||'')}T12:00:00`);return Number.isFinite(d)?d:0};
  function owned(){try{const uid=String(localStorage.getItem('rbSleeperLinkedUserId')||''),team=(currentData?.teams||[]).find(x=>Number(x.roster_id)===Number(selectedRoster));return !!uid&&String(team?.owner_id||'')===uid}catch{return false}}
  function playerId(row){const cached=String(row?.dataset?.rbPlayerId||'');if(cached)return cached;const name=String(row?.querySelector('.pname')?.textContent||'').trim().toLowerCase();for(const [id,p] of Object.entries(currentData?.players||{})){if(String(p?.full_name||'').trim().toLowerCase()===name){row.dataset.rbPlayerId=String(id);return String(id)}}return''}
  function gamesFor(pid){try{const team=String(currentData?.players?.[String(pid)]?.team||'');return (currentData?.schedule||[]).filter(g=>!g?.calendar_only&&(g.home===team||g.away===team)).slice().sort((a,b)=>gameTime(a)-gameTime(b))}catch{return[]}}
  function candidate(pid){const games=gamesFor(pid),now=Date.now();for(let i=games.length-1;i>=0;i--){const g=games[i];if(String(g?.status||'')!=='complete')continue;const gt=gameTime(g);const next=games.find(x=>gameTime(x)>gt&&String(x?.game_id||'')!==String(g?.game_id||''));if(next&&gameTime(next)<=now)continue;return g}return null}
  function historyOkay(pid,g){
    try{
      const ev=window.rbStarterHistory?.evidence?.(String(pid),g);
      if(ev?.eligible===true)return true;
      if(ev?.mode==='fresh-pre-tipoff-bench')return false;
      if(ev?.mode==='pre-tipoff'&&ev?.snapshot){
        const listed=(ev.snapshot.starters||[]).map(String).includes(String(pid));
        const gameStart=Number(ev.gameStart||gameTime(g)||0),snapTs=Number(ev.snapshot.ts||0),age=gameStart&&snapTs?gameStart-snapTs:Infinity;
        if(!listed&&age>=0&&age<=90*60*1000)return false;
      }
      return starters().has(String(pid));
    }catch{return starters().has(String(pid))}
  }
  function txKey(){try{return `${leagueId}:${selectedWeek}:${selectedRoster}`}catch{return''}}
  async function ensureTx(){const k=txKey();if(!k)return;if(tx.key!==k){tx.key=k;tx.ready=false;tx.loading=null;tx.acquired=new Map()}if(tx.ready)return;if(tx.loading)return tx.loading;tx.loading=(async()=>{try{const r=await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}/transactions/${encodeURIComponent(selectedWeek)}`,{cache:'no-store'});const rows=r.ok?await r.json():[];for(const x of Array.isArray(rows)?rows:[]){const created=Number(x?.created||0),adds=x?.adds&&typeof x.adds==='object'?x.adds:{};for(const [pid,rid] of Object.entries(adds)){if(Number(rid)!==Number(selectedRoster)||!created)continue;const old=tx.acquired.get(String(pid));if(!old||created<old)tx.acquired.set(String(pid),created)}}}catch{}finally{tx.ready=true;tx.loading=null}})();return tx.loading}
  function acquiredAfter(pid,g){const at=Number(tx.acquired.get(String(pid))||0),gt=gameTime(g);return !!at&&!!gt&&at>gt}
  function locked(pid){try{return !!(lockedGames&&lockedGames[String(pid)])}catch{return false}}
  function completedPoints(pid){
    try{
      const m=matchup(selectedRoster);
      if(typeof pointsFor==='function'){
        const v=Number(pointsFor(m,String(pid)));
        if(Number.isFinite(v))return v;
      }
      const startersList=(m?.starters||[]).map(String),i=startersList.indexOf(String(pid));
      if(i>=0&&Array.isArray(m?.starters_points)){
        const v=Number(m.starters_points[i]);
        if(Number.isFinite(v))return v;
      }
      const v=Number(m?.players_points?.[String(pid)]);
      return Number.isFinite(v)?v:null;
    }catch{return null}
  }
  function setPoints(row,pid){try{const el=row.querySelector(':scope > .pts')||row.querySelector('.pts');if(!el)return;const actual=completedPoints(pid);if(actual!==null){el.textContent=actual.toFixed(1);el.dataset.rbVaultActual=actual.toFixed(1);return}if(el.dataset.rbVaultOriginal==null)el.dataset.rbVaultOriginal=String(el.textContent||'').trim();if(el.dataset.rbVaultOriginal)el.textContent=el.dataset.rbVaultOriginal}catch{}}
  function addButton(row,pid,g){row.querySelector('.rb-lock-unavailable')?.remove();row.classList.add('lockable');row.classList.remove('no-game');let btn=row.querySelector('.lock-btn[data-rb-vault-carry="1"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='lock-btn';btn.textContent='LOCK IN';btn.dataset.rbVaultCarry='1';(row.querySelector('.matchup-meta')||row.querySelector('.player-copy')||row.querySelector('.player-info'))?.appendChild(btn)}btn.dataset.lockPlayer=String(pid);btn.dataset.lockGame=String(g.game_id||'');btn.title='Completed starter game is still inside Sleeper’s lock window';if(btn.dataset.rbBound!=='1'){btn.dataset.rbBound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();try{commitLock(String(pid),String(g.game_id||''))}catch{}})}setPoints(row,pid)}
  function nextAfter(pid,g){const gt=gameTime(g);return gamesFor(pid).find(x=>gameTime(x)>gt&&String(x?.game_id||'')!==String(g?.game_id||''))||null}
  // A completed game stays lockable until the player's next game tips off, so show the
  // carry-forward button on every day from that game through today, not only today.
  function visibleOn(day,today,pid,g){if(day===today)return true;const gd=String(g?.date||'');if(!gd||gd>day)return false;const nx=nextAfter(pid,g);return !nx||String(nx.date||'')>day}
  async function decorate(){try{if(!owned()||String(selectedDay)==='all')return;const day=String(selectedDay),today=fantasyDay();if(day>today)return;await ensureTx();const root=document.getElementById('teamView');if(!root)return;const starterIds=starters();for(const row of root.querySelectorAll('.player-row')){if(row.classList.contains('locked-in')||row.querySelector('.lock-chip')||row.querySelector('.lock-btn:not([data-rb-vault-carry="1"])'))continue;const pid=playerId(row);if(!pid||locked(pid)||!starterIds.has(pid))continue;const g=candidate(pid);if(!g||!g.game_id||!visibleOn(day,today,pid,g)||acquiredAfter(pid,g)||!historyOkay(pid,g))continue;addButton(row,pid,g)}refreshTotal()}catch{}}
  function refreshTotal(){try{const root=document.getElementById('teamView');if(!root)return;const rows=[...root.querySelectorAll('.player-row.locked-in')];if(!rows.length)return;let total=0,count=0;for(const row of rows){const v=Number(String((row.querySelector(':scope > .pts')||row.querySelector('.pts'))?.textContent||'').replace(/[^0-9.-]/g,''));if(Number.isFinite(v)){total+=v;count++}}const box=root.querySelector('.rb-lock-total.locked');if(box&&count){const b=box.querySelector('b'),s=box.querySelector('small');if(b&&b.textContent!==total.toFixed(1))b.textContent=total.toFixed(1);if(s&&s.textContent!==`${count} verified locks`)s.textContent=`${count} verified locks`}}catch{}}
  let queued=false;function run(){if(queued)return;queued=true;setTimeout(()=>{queued=false;decorate();refreshTotal()},0)}
  function hookRender(){try{if(typeof renderTeam!=='function'||renderTeam.__rbVaultLockWindow)return false;const base=renderTeam;const wrapped=function(...args){const out=base.apply(this,args);setTimeout(run,0);setTimeout(run,80);return out};wrapped.__rbVaultLockWindow=true;renderTeam=wrapped;try{window.renderTeam=wrapped}catch{}return true}catch{return false}}
  function startup(){hookRender();run();[100,250,500,900,1500,2500,4000,6500].forEach(ms=>setTimeout(()=>{hookRender();run()},ms))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup,{once:true});else startup();
  window.addEventListener('focus',run);window.addEventListener('rb:sleeper-vault',run);window.addEventListener('rb:sleeper-lock-state',run);document.addEventListener('click',e=>{if(e.target.closest?.('.day-btn,.tab'))run()},true);document.addEventListener('change',e=>{if(['teamPicker','weekSel'].includes(e.target?.id))run()},true);
  window.rbLockWindowRefresh=run;
})();