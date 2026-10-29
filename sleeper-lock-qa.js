(()=>{
  const q=s=>document.querySelector(s);
  function gameTime(g){
    try{const h=window.rbStarterHistory;if(typeof h?.parseGameTime==='function'){const t=h.parseGameTime(g);if(Number.isFinite(t))return t}}catch{}
    const raw=g?.start_time??g?.start??g?.game_time??g?.datetime??'';
    if(typeof raw==='number'&&Number.isFinite(raw))return raw<1e12?raw*1000:raw;
    const s=String(raw||'').trim();
    if(/^\d{10,13}$/.test(s)){const n=Number(s);return s.length<=10?n*1000:n}
    const t=Date.parse(s);return Number.isFinite(t)?t:0;
  }
  const currentStarters=()=>{try{return new Set((matchup(selectedRoster)?.starters||[]).map(String).filter(x=>x&&x!=='0'))}catch{return new Set()}};
  const gamesFor=(team)=>{try{return (currentData?.schedule||[]).filter(g=>!g?.calendar_only&&(g.home===team||g.away===team)).slice().sort((a,b)=>gameTime(a)-gameTime(b))}catch{return[]}};
  const nextAfter=(team,g)=>{const t=gameTime(g);return gamesFor(team).find(x=>gameTime(x)>t&&String(x?.game_id||'')!==String(g?.game_id||''))||null};
  function candidateGames(pid){
    try{const p=player(pid),team=String(p?.team||''),now=Date.now();return gamesFor(team).filter(g=>String(g?.status||'')==='complete').filter(g=>{const n=nextAfter(team,g);return !n||!gameTime(n)||gameTime(n)>now}).sort((a,b)=>gameTime(b)-gameTime(a))}catch{return[]}
  }
  function readJson(key){try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return{}}}
  function invalidation(pid,gid){
    let v2=false,v3=false,v3data=null;
    try{const k2=`rbLockInvalidatedV2:${leagueId}:${selectedRoster}:${selectedWeek}`,d2=readJson(k2),a=Array.isArray(d2[String(pid)])?d2[String(pid)]:[];v2=a.map(String).includes(String(gid))}catch{}
    try{const k3=`rbLockInvalidatedV3:${leagueId}:${selectedRoster}:${selectedWeek}`,d3=readJson(k3),x=d3?.[String(pid)]?.[String(gid)];v3=!!x;v3data=x||null}catch{}
    return{v2,v3,v3data};
  }
  function acquisition(pid){
    try{
      const k=`rbLockQATx:${leagueId}:${selectedWeek}`;
      return null;
    }catch{return null}
  }
  function history(pid,g){
    try{return window.rbStarterHistory?.evidence?.(String(pid),g)||null}catch{return null}
  }
  function rowFor(pid){
    try{
      const name=String(player(pid)?.full_name||'').trim().toLowerCase();
      return [...document.querySelectorAll('#teamView .player-row')].find(r=>String(r.querySelector('.pname')?.textContent||'').trim().toLowerCase()===name)||null;
    }catch{return null}
  }
  function one(pid){
    pid=String(pid);const p=player(pid),team=String(p?.team||''),candidates=candidateGames(pid),g=candidates[0]||null,next=g?nextAfter(team,g):null,h=g?history(pid,g):null,inv=g?invalidation(pid,String(g.game_id||'')):{v2:false,v3:false,v3data:null},row=rowFor(pid);
    let reason='eligible-candidate';
    if(!currentStarters().has(pid))reason='not-current-starter';
    else if(lockedGames&&lockedGames[pid])reason='already-locked';
    else if(!g)reason='no-completed-game-in-open-window';
    else if(h&&h.eligible===false)reason=`history:${h.mode||'ineligible'}`;
    else if(inv.v3)reason='v3-invalidated';
    else if(inv.v2)reason='legacy-v2-invalidated';
    return{
      player_id:pid,name:p?.full_name||pid,team,currentStarter:currentStarters().has(pid),rowHasLockButton:!!row?.querySelector('.lock-btn'),rowCarryButton:!!row?.querySelector('.lock-btn[data-rb-carry-lock="1"]'),lockedGame:lockedGames?.[pid]||null,
      candidate:g?{game_id:String(g.game_id||''),date:g.date,status:g.status,start_time:g.start_time,opponent:g.home===team?g.away:g.home}:null,
      nextGame:next?{game_id:String(next.game_id||''),date:next.date,status:next.status,start_time:next.start_time,opponent:next.home===team?next.away:next.home}:null,
      history:h?{eligible:h.eligible,mode:h.mode,gameStart:h.gameStart,snapshot:h.snapshot?{ts:h.snapshot.ts,source:h.snapshot.source,hasPlayer:Array.isArray(h.snapshot.starters)&&h.snapshot.starters.map(String).includes(pid)}:null}:null,
      invalidation:inv,reason
    };
  }
  function all(){try{return (matchup(selectedRoster)?.starters||[]).map(String).filter(x=>x&&x!=='0').map(one)}catch{return[]}}
  function show(){
    const data=all();
    const existing=q('#rbLockQaModal');if(existing)existing.remove();
    const wrap=document.createElement('div');wrap.id='rbLockQaModal';wrap.className='modal-backdrop';
    const rows=data.map(x=>`<tr><td>${x.name}</td><td>${x.reason}</td><td>${x.rowHasLockButton?'YES':'NO'}</td><td>${x.candidate?`${x.candidate.date} ${x.candidate.opponent}`:'—'}</td><td>${x.history?`${x.history.mode} / ${x.history.eligible}`:'—'}</td><td>${x.invalidation.v3?'V3':x.invalidation.v2?'V2':'—'}</td></tr>`).join('');
    wrap.innerHTML=`<div class="modal" style="width:min(1050px,96vw);max-height:88vh"><div class="modal-head"><span>Lock Eligibility QA (read-only)</span><button class="modal-close" data-rb-lockqa-close>×</button></div><div class="modal-body" style="overflow:auto;max-height:72vh"><p>This panel does not change lineup or lock state.</p><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th align="left">Player</th><th align="left">Decision</th><th>Button</th><th align="left">Candidate</th><th align="left">History</th><th>Invalidation</th></tr></thead><tbody>${rows}</tbody></table><details style="margin-top:12px"><summary>Raw QA JSON</summary><pre style="white-space:pre-wrap;font-size:10px">${String(JSON.stringify(data,null,2)).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre></details></div></div>`;
    document.body.appendChild(wrap);wrap.querySelector('[data-rb-lockqa-close]')?.addEventListener('click',()=>wrap.remove());
  }
  function install(){
    if(q('#rbLockQaBtn'))return;
    const inspector=[...document.querySelectorAll('button')].find(b=>String(b.textContent||'').trim()==='Inspect Sleeper');
    if(!inspector)return;
    const b=document.createElement('button');b.id='rbLockQaBtn';b.textContent='Lock QA';b.style.cssText='margin-left:6px;padding:4px 8px;border:1px solid #4b5f7a;border-radius:5px;background:#263246;color:#dce5f1;font-size:9px;font-weight:800';b.addEventListener('click',show);inspector.insertAdjacentElement('afterend',b);
  }
  window.rbLockQA={all,one,show};
  let n=0;const t=setInterval(()=>{install();if(++n>60)clearInterval(t)},500);install();
})();