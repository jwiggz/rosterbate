(()=>{
  const state={pairIndex:0,cache:new Map(),loading:new Map(),lastWeek:null,lastSelectedRoster:null};
  const getToken=()=>String(sessionStorage.getItem('rbSleeperToken')||localStorage.getItem('rbSleeperTokenPersistent')||sessionStorage.getItem('rbSleeperAuth')||'').trim().replace(/^Bearer\s+/i,'');
  const key=()=>`${String(leagueId)}:${Number(selectedWeek)}`;
  function pairs(){
    const groups=new Map();
    for(const m of (currentData?.matchups||[])){
      const id=String(m?.matchup_id??'');
      if(!id)continue;
      if(!groups.has(id))groups.set(id,[]);
      groups.get(id).push(m);
    }
    return [...groups.entries()].map(([id,rows])=>({id,rows:rows.slice().sort((a,b)=>Number(a.roster_id)-Number(b.roster_id))})).sort((a,b)=>Number(a.id)-Number(b.id));
  }
  function chooseDefault(ps){
    if(!ps.length){state.pairIndex=0;return}
    const wanted=Number(selectedRoster),i=ps.findIndex(p=>p.rows.some(r=>Number(r.roster_id)===wanted));
    if(i>=0)state.pairIndex=i;else state.pairIndex=Math.min(state.pairIndex,ps.length-1);
  }
  function readCache(){
    const k=key();if(state.cache.has(k))return state.cache.get(k);
    try{const raw=sessionStorage.getItem(`rbMatchupExact:${k}`);if(raw){const v=JSON.parse(raw);state.cache.set(k,v);return v}}catch{}
    return null;
  }
  function saveCache(v){const k=key();state.cache.set(k,v);try{sessionStorage.setItem(`rbMatchupExact:${k}`,JSON.stringify(v))}catch{}}
  async function fetchExact(force=false){
    const k=key(),cached=readCache();
    if(!force&&cached&&Date.now()-Number(cached.ts||0)<15000)return cached;
    if(state.loading.has(k))return state.loading.get(k);
    const auth=getToken();if(!auth)return cached;
    const p=(async()=>{
      const round=Number(selectedWeek),query=`query matchup_legs { matchup_legs(league_id: \"${String(leagueId)}\", round: ${round}) { roster_id starters starters_games points } }`;
      try{
        const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:auth,'X-Sleeper-GraphQL-Op':'matchup_legs'},body:JSON.stringify({operationName:'matchup_legs',variables:{},query})});
        const d=await r.json();if(!r.ok||!Array.isArray(d?.data?.matchup_legs))return cached;
        const byRoster={};for(const row of d.data.matchup_legs){byRoster[String(row.roster_id)]={starters:Array.isArray(row.starters)?row.starters.map(String):[],startersGames:row.starters_games&&typeof row.starters_games==='object'?row.starters_games:{}}}
        const out={ts:Date.now(),byRoster};saveCache(out);return out;
      }catch{return cached}finally{state.loading.delete(k)}
    })();
    state.loading.set(k,p);return p;
  }
  function lockedIds(exact,m){
    const out=new Set(),valid=new Set((exact?.starters?.length?exact.starters:m?.starters||[]).map(String)),games=exact?.startersGames;
    if(!games||typeof games!=='object'||Array.isArray(games))return out;
    for(const [k,v] of Object.entries(games)){
      if(valid.has(String(k)))out.add(String(k));
      if(v&&typeof v==='object'){const pid=String(v.player_id??v.playerId??v.player??v.pid??'');if(valid.has(pid))out.add(pid)}
    }
    return out;
  }
  function actualFor(m,pid){
    const starters=(m?.starters||[]).map(String),i=starters.indexOf(String(pid));
    if(i>=0&&Array.isArray(m?.starters_points)){const v=Number(m.starters_points[i]);if(Number.isFinite(v))return v}
    const v=Number(m?.players_points?.[String(pid)]);return Number.isFinite(v)?v:0;
  }
  function lockedTotal(m,ids){let n=0;for(const id of ids)n+=actualFor(m,id);return n}
  function scheduleGameForProjection(pg,pid){
    const schedule=currentData?.schedule||[],gid=String(pg?.game_id||''),date=String(pg?.date||''),teamCode=String(currentData?.players?.[String(pid)]?.team||'');
    if(gid){const byId=schedule.find(g=>String(g.game_id||'')===gid);if(byId)return byId}
    return schedule.find(g=>String(g.date||'')===date&&(!teamCode||g.home===teamCode||g.away===teamCode))||null;
  }
  function futureProjection(pid){
    const p=currentData?.projections?.[String(pid)];if(!p||!Array.isArray(p.games))return null;
    let best=null;
    for(const pg of p.games){
      const pts=Number(pg?.points);if(!Number.isFinite(pts))continue;
      const sg=scheduleGameForProjection(pg,pid);if(sg&&String(sg.status||'pre_game')!=='pre_game')continue;
      if(best===null||pts>best)best=pts;
    }
    return best;
  }
  function projectedLockIn(m,locked){
    if(!m)return null;
    let total=lockedTotal(m,locked);
    const starters=(m.starters||[]).map(String).filter(x=>x&&x!=='0');
    for(const pid of starters){
      if(locked.has(pid))continue;
      const v=futureProjection(pid);if(v!==null)total+=v;
    }
    return total;
  }
  function slotLabelsFor(count){return typeof starterLabels==='function'?starterLabels(count):Array.from({length:count},()=> 'UTIL')}
  function lockedRow(id,m,label){
    // The padlock chip is part of the row itself, so re-renders (cached → fresh data) never drop it.
    const p=player(id),body=playerBlock(p,`${matchupDetail(id,'all')} <span class="lock-chip" aria-label="Locked in on Sleeper">LOCKED IN</span>`),pts=actualFor(m,id);
    return `<div class="player-row locked-in"><div class="slot ${slotClass(label)}">${esc(label)}</div>${body}<div class="proj">${projectionText(id,'all')}</div><div class="pts"><span class="rb-match-lock-label">LOCKED IN</span>${num(pts)}</div></div>`;
  }
  function emptySlotRow(label){
    return `<div class="player-row rb-match-empty-slot"><div class="slot ${slotClass(label)}">${esc(label)}</div><div class="player-info"><div class="player-head"><span class="player-fallback">—</span></div><div class="player-copy"><div class="pname">Not locked yet</div><div class="pmeta">Waiting for a locked player in this slot</div></div></div><div class="proj">—</div><div class="pts">—</div></div>`;
  }
  function rosterHtml(m,exact){
    if(!m)return'<div class="match-roster"><div class="empty">Bye</div></div>';
    const starters=(exact?.starters?.length?exact.starters:m.starters||[]).map(String),labels=slotLabelsFor(starters.length),locked=lockedIds(exact,m);
    return `<div class="match-roster">${starters.map((id,i)=>locked.has(id)?lockedRow(id,m,labels[i]||'UTIL'):emptySlotRow(labels[i]||'UTIL')).join('')}</div>`;
  }
  function teamNameFor(m){const t=team(m?.roster_id);return t?.team_name||'Team'}
  function avatarUrl(t){
    const raw=t?.avatar_url??t?.avatar??t?.metadata?.avatar_url??t?.metadata?.avatar??'';
    if(!raw)return'';
    const s=String(raw);return /^https?:\/\//i.test(s)?s:`https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(s)}`;
  }
  function teamAvatar(t){
    const url=avatarUrl(t),initial=esc(String(t?.team_name||t?.display_name||'T').trim().charAt(0).toUpperCase()||'T');
    return `<div class="rb-match-team-avatar">${url?`<img src="${esc(url)}" alt="" onerror="this.remove()">`:''}<span>${initial}</span></div>`;
  }
  function teamHeader(t,score,side){
    return `<div class="rb-match-team-block ${side==='right'?'rb-match-team-block--right':''}">${teamAvatar(t)}<div class="rb-match-team-copy"><div class="match-team">${esc(t?.team_name||'Team')}</div><div class="match-owner">${esc(t?.display_name||'')}</div><div class="rb-team-locked-score">${score==null?'—':num(score)} <span>locked</span></div></div></div>`;
  }
  function selectorHtml(ps){return `<div class="rb-match-nav"><button type="button" id="rbPrevMatch" ${state.pairIndex<=0?'disabled':''}>‹</button><select id="rbMatchSelect">${ps.map((p,i)=>{const a=p.rows[0],b=p.rows[1];return `<option value="${i}" ${i===state.pairIndex?'selected':''}>${esc(teamNameFor(a))} vs ${esc(teamNameFor(b))}</option>`}).join('')}</select><button type="button" id="rbNextMatch" ${state.pairIndex>=ps.length-1?'disabled':''}>›</button></div>`}
  function bindNav(ps){
    document.getElementById('rbPrevMatch')?.addEventListener('click',()=>{state.pairIndex=Math.max(0,state.pairIndex-1);paint(readCache())});
    document.getElementById('rbNextMatch')?.addEventListener('click',()=>{state.pairIndex=Math.min(ps.length-1,state.pairIndex+1);paint(readCache())});
    document.getElementById('rbMatchSelect')?.addEventListener('change',e=>{state.pairIndex=Math.max(0,Math.min(ps.length-1,Number(e.target.value)||0));paint(readCache())});
  }
  function paint(exactState){
    const root=document.getElementById('matchupView');if(!root||!currentData)return;
    const ps=pairs();
    if(state.lastWeek!==Number(selectedWeek)||state.lastSelectedRoster!==Number(selectedRoster)){chooseDefault(ps);state.lastWeek=Number(selectedWeek);state.lastSelectedRoster=Number(selectedRoster)}
    if(!ps.length){root.innerHTML='<div class="match-card"><div class="empty">No matchups.</div></div>';return}
    const pair=ps[Math.min(state.pairIndex,ps.length-1)],aM=pair.rows[0],bM=pair.rows[1],aT=team(aM?.roster_id),bT=team(bM?.roster_id);
    const aExact=exactState?.byRoster?.[String(aM?.roster_id)],bExact=exactState?.byRoster?.[String(bM?.roster_id)];
    if(!exactState){
      root.innerHTML=`<div class="match-card"><div class="match-top rb-match-browser">${teamHeader(aT,null,'left')}<div class="rb-match-center"><div class="vs">LOCKED POINTS</div><div class="score-proj">Loading exact Lock-In data…</div></div>${teamHeader(bT,null,'right')}</div>${selectorHtml(ps)}<div class="match-columns"><div class="match-roster"><div class="empty">Loading locks…</div></div><div class="match-roster"><div class="empty">Loading locks…</div></div></div></div>`;bindNav(ps);return;
    }
    const aLocked=lockedIds(aExact,aM),bLocked=lockedIds(bExact,bM),aScore=lockedTotal(aM,aLocked),bScore=lockedTotal(bM,bLocked),aProj=projectedLockIn(aM,aLocked),bProj=projectedLockIn(bM,bLocked);
    root.innerHTML=`<div class="match-card"><div class="match-top rb-match-browser">${teamHeader(aT,aScore,'left')}<div class="rb-match-center"><div class="vs">LOCKED POINTS</div><div class="score-proj">Proj ${aProj===null?'—':num(aProj)} · ${bProj===null?'—':num(bProj)}</div></div>${teamHeader(bT,bScore,'right')}</div>${selectorHtml(ps)}<div class="match-columns">${rosterHtml(aM,aExact)}${rosterHtml(bM,bExact)}</div></div>`;
    bindNav(ps);
  }
  const style=document.createElement('style');style.textContent=`
    #matchupView .match-top.rb-match-browser{grid-template-columns:minmax(0,1fr) 190px minmax(0,1fr);gap:14px;padding:14px 16px}
    #matchupView .rb-match-team-block{display:flex;align-items:center;gap:10px;min-width:0}
    #matchupView .rb-match-team-block--right{justify-content:flex-end;text-align:right;flex-direction:row-reverse}
    #matchupView .rb-match-team-avatar{width:42px;height:42px;border-radius:10px;overflow:hidden;position:relative;flex:0 0 42px;background:#192332;border:1px solid #42516a;display:grid;place-items:center;color:#dce5f1;font-size:14px;font-weight:900}
    #matchupView .rb-match-team-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;background:#202a3a}
    #matchupView .rb-match-team-avatar span{position:relative;z-index:1}
    #matchupView .rb-match-team-copy{min-width:0}
    #matchupView .rb-match-team-block .match-team{font-size:12px}
    #matchupView .rb-team-locked-score{margin-top:5px;color:#43e3b0;font-size:18px;font-weight:950;line-height:1}
    #matchupView .rb-team-locked-score span{font-size:7px;color:#81a79d;text-transform:uppercase;letter-spacing:.07em;margin-left:3px;vertical-align:middle}
    #matchupView .rb-match-center{text-align:center;align-self:center}
    #matchupView .rb-match-center .vs{font-size:8px;font-weight:900;letter-spacing:.08em;color:#93a1b5;margin:0 0 5px}
    #matchupView .rb-match-center .score-proj{font-size:8px}
    #matchupView .rb-match-nav{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;background:#182231;border-top:1px solid #2d3a4d;border-bottom:1px solid #2d3a4d}
    #matchupView .rb-match-nav button,#matchupView .rb-match-nav select{height:28px;border:1px solid #3a4a61;background:#243146;color:#dce5f1;border-radius:6px;font-size:9px;font-weight:800}
    #matchupView .rb-match-nav button{width:30px;font-size:16px}#matchupView .rb-match-nav button:disabled{opacity:.35;cursor:default}
    #matchupView .rb-match-nav select{min-width:250px;padding:0 9px;text-align:center}
    #matchupView .rb-match-lock-label{display:block;font-size:6px;letter-spacing:.06em;color:#78efd3;margin-bottom:2px;font-weight:950}
    #matchupView .match-roster .player-row.locked-in{opacity:1!important;background:linear-gradient(90deg,rgba(48,216,160,.11),rgba(48,216,160,.025) 65%,transparent)!important}
    #matchupView .match-roster .pts{color:#49e7b1!important}
    #matchupView .rb-match-empty-slot{opacity:.56!important;background:rgba(255,255,255,.012)!important}
    #matchupView .rb-match-empty-slot .pname{color:#aab5c5!important}
    #matchupView .rb-match-empty-slot .pmeta{color:#66758a!important}
    #matchupView .rb-match-empty-slot .player-head{background:#1a2432!important;border-style:dashed!important;color:#6d7b8f!important}
    #matchupView .rb-match-empty-slot .pts,#matchupView .rb-match-empty-slot .proj{color:#66758a!important}
    @media(max-width:760px){#matchupView .match-top.rb-match-browser{grid-template-columns:1fr 1fr}#matchupView .rb-match-center{grid-column:1/-1;grid-row:2}#matchupView .rb-match-team-avatar{width:36px;height:36px;flex-basis:36px}#matchupView .rb-team-locked-score{font-size:15px}}
  `;document.head.appendChild(style);
  async function renderExact(){const cached=readCache();paint(cached);const fresh=await fetchExact(false);if(fresh)paint(fresh)}
  try{renderMatchup=renderExact;window.renderMatchup=renderExact}catch{}
  window.addEventListener('focus',()=>{if(document.querySelector('.tab.active[data-view="matchup"]'))fetchExact(true).then(v=>v&&paint(v))});
  renderExact();
})();