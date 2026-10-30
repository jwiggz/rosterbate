(()=>{
  // Trades tab: multi-team trade builder (players + FAAB), trade history, and the
  // "traded after being locked" rule on the Team view.
  const css=`
#rbTradesView{display:grid;gap:12px}
#rbTradesView .tr-card{background:var(--panel,#202a3a);border:1px solid var(--border,#334258);border-radius:10px;padding:14px}
#rbTradesView h3{margin:0 0 4px;font-size:14px;font-weight:950;color:var(--text,#f4f7fb)}
#rbTradesView .sub{color:var(--muted,#8e9bb0);font-size:9px;font-weight:700;margin-bottom:10px}
#rbTradesView .seg{display:inline-flex;border:1px solid var(--border,#334258);border-radius:8px;overflow:hidden;margin-bottom:12px}
#rbTradesView .seg button{all:unset;cursor:pointer;padding:7px 14px;font-size:9px;font-weight:900;letter-spacing:.04em;color:#aab6c8;background:#192434;border-left:1px solid var(--border,#334258)}
#rbTradesView .seg button:first-child{border-left:0}
#rbTradesView .seg button[aria-pressed="true"]{background:var(--teal,#08c7c9);color:#03282a}
#rbTradesView button:focus-visible,#rbTradesView select:focus-visible,#rbTradesView input:focus-visible{outline:2px solid #08c7c9;outline-offset:2px}
#rbTradesView .chips{display:flex;flex-wrap:wrap;gap:6px}
#rbTradesView .chip{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;border:1px solid var(--border,#334258);background:#192434;color:#c7d2e2;font-size:10px;font-weight:800}
#rbTradesView .chip[aria-pressed="true"]{border-color:#11c3c6;background:#0d3d42;color:#e9fdfd}
#rbTradesView .chip.me{cursor:default;border-color:#2f9d79;background:#123d34;color:#9ff6d7}
#rbTradesView .chip img,#rbTradesView .chip .av,#rbTradesView .tm-head img,#rbTradesView .tm-head .av{width:20px;height:20px;border-radius:50%;object-fit:cover;background:#2a3648;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:900}
#rbTradesView .teams{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
#rbTradesView .tm{border:1px solid rgba(255,255,255,.07);border-radius:9px;background:#18222f;overflow:hidden}
#rbTradesView .tm-head{display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px;font-weight:900;color:#eef4ff}
#rbTradesView .tm-head small{margin-left:auto;color:#8e9bb0;font-size:8px;font-weight:800;text-align:right}
#rbTradesView .tm-list{max-height:360px;overflow:auto}
#rbTradesView .pl{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;color:#d7e0ee}
#rbTradesView .pl:hover{background:rgba(8,199,201,.05)}
#rbTradesView .pl.sel{background:rgba(17,195,198,.12)}
#rbTradesView .pl .nm{font-weight:850;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#rbTradesView .pl .meta{color:#8190a5;font-size:8px;font-weight:800}
#rbTradesView .pl select,#rbTradesView .faab select,#rbTradesView .faab input{background:#121a26;color:#d7e0ee;border:1px solid #3b4b63;border-radius:6px;padding:4px 6px;font-size:9px;font-weight:800}
#rbTradesView .tag{display:inline-block;margin-left:5px;padding:1px 5px;border-radius:4px;font-size:7px;font-weight:900;letter-spacing:.03em;vertical-align:middle}
#rbTradesView .tag.lock{background:rgba(48,216,160,.14);color:#78efd3}
#rbTradesView .tag.ir{background:rgba(169,106,255,.14);color:#c79aff}
#rbTradesView .faab{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:9px 10px;border-top:1px solid rgba(255,255,255,.06);font-size:9px;color:#aab6c8;font-weight:800}
#rbTradesView .faab input{width:62px}
#rbTradesView .sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
#rbTradesView .sum-team{border-radius:9px;background:#18222f;border:1px solid rgba(255,255,255,.07);padding:10px;font-size:10px;color:#d7e0ee}
#rbTradesView .sum-team b{color:#eef4ff}
#rbTradesView .sum-team .in{color:#78efd3}#rbTradesView .sum-team .out{color:#ff9aa9}
#rbTradesView .sum-team ul{margin:4px 0 6px;padding-left:16px}
#rbTradesView .warn{margin-top:8px;padding:8px 10px;border-radius:7px;background:rgba(243,199,91,.1);border:1px solid rgba(243,199,91,.3);color:#f3d589;font-size:9px;font-weight:750;line-height:1.45}
#rbTradesView .err{background:rgba(239,102,128,.1);border-color:rgba(239,102,128,.35);color:#ffb3c1}
#rbTradesView .actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
#rbTradesView .btn{all:unset;cursor:pointer;padding:8px 14px;border-radius:7px;font-size:10px;font-weight:950;background:#27354a;color:#cfd8e6;border:1px solid #40516b}
#rbTradesView .btn.primary{background:var(--teal,#08c7c9);color:#03282a;border-color:var(--teal,#08c7c9)}
#rbTradesView .btn[aria-disabled="true"]{opacity:.45;cursor:not-allowed}
#rbTradesView .note{color:#8e9bb0;font-size:9px;font-weight:700}
#rbTradesView .hist{border-top:1px solid rgba(255,255,255,.06);padding:10px 0;font-size:10px;color:#d7e0ee}
#rbTradesView .hist:first-of-type{border-top:0}
#rbTradesView .hist .when{color:#8e9bb0;font-size:8px;font-weight:800;margin-bottom:5px}
#rbTradesView .hist .side{display:grid;grid-template-columns:150px minmax(0,1fr);gap:8px;padding:2px 0}
#rbTradesView .empty{padding:22px;text-align:center;color:var(--muted,#8e9bb0);font-size:11px;font-weight:700}
#teamView .rb-trade-lock-tag{margin-left:6px;padding:1px 6px;border-radius:4px;font-size:7px;font-weight:900;letter-spacing:.03em;background:rgba(239,102,128,.14);color:#ff9aa9;border:1px solid rgba(239,102,128,.3)}
`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const st={tab:'propose',teams:[],picks:{},faab:[],drops:[],history:null,histKey:'',locks:null,locksKey:'',locksLoading:null};

  // ---------- league helpers ----------
  const teams=()=>currentData?.teams||[];
  const team=rid=>teams().find(t=>Number(t.roster_id)===Number(rid))||null;
  const pname=id=>{try{return player(id).full_name||`Player ${id}`}catch{return`Player ${id}`}};
  const pmeta=id=>{try{const p=player(id);return`${(p.fantasy_positions||[p.position]).filter(Boolean).join('/')} · ${p.team||'FA'}`}catch{return''}};
  function myRoster(){try{const uid=String(localStorage.getItem('rbSleeperLinkedUserId')||'');return Number(teams().find(t=>String(t.owner_id||'')===uid)?.roster_id||0)}catch{return 0}}
  function avatar(t){const raw=t?.avatar_url??t?.avatar??'';const i=esc(String(t?.team_name||'?').charAt(0).toUpperCase());if(!raw)return`<span class="av">${i}</span>`;const s=String(raw);const url=/^https?:\/\//i.test(s)?s:`https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(s)}`;return`<img src="${esc(url)}" alt="" loading="lazy">`}
  const budget=()=>Number(currentData?.league?.settings?.waiver_budget||0);
  const faabLeft=rid=>Math.max(0,budget()-Number(team(rid)?.settings?.waiver_budget_used||0));
  const rosterLimit=()=>(currentData?.league?.roster_positions||[]).filter(x=>String(x).toUpperCase()!=='IR').length;
  const activeCount=rid=>{const t=team(rid);const res=new Set((t?.reserve||[]).map(String));return(t?.players||[]).map(String).filter(p=>!res.has(p)).length};

  // ---------- locks this week (who locked whom), for the trade rule ----------
  async function loadLocks(){
    const key=`${leagueId}:${selectedWeek}`;if(st.locksKey===key&&st.locks)return st.locks;if(st.locksLoading)return st.locksLoading;
    st.locksLoading=(async()=>{const map=new Map();
      try{
        const q=`query matchup_legs { matchup_legs(league_id: "${String(leagueId)}", round: ${Number(selectedWeek)}) { roster_id starters starters_games } }`;
        const r=await fetch('https://sleeper.com/graphql',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:'__RB_SLEEPER_VAULT__','X-Sleeper-GraphQL-Op':'matchup_legs'},body:JSON.stringify({operationName:'matchup_legs',variables:{},query:q})});
        const d=await r.json().catch(()=>({}));
        for(const row of d?.data?.matchup_legs||[]){const sg=row?.starters_games;if(!sg||typeof sg!=='object')continue;for(const pid of Object.keys(sg))map.set(String(pid),Number(row.roster_id))}
      }catch{}
      // Also include exact locks RosterBate already knows (own private state + opponent exact state).
      try{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i)||'';const m=k.match(/^rbOpponentExact:(\d+):(\d+):(\d+)$/);if(!m||m[1]!==String(leagueId)||m[2]!==String(selectedWeek))continue;const x=JSON.parse(sessionStorage.getItem(k)||'null');for(const pid of Object.keys(x?.startersGames||{}))if(!map.has(pid))map.set(String(pid),Number(m[3]))}}catch{}
      st.locks=map;st.locksKey=key;st.locksLoading=null;return map})();
    return st.locksLoading;
  }
  async function loadHistory(){
    const key=`${leagueId}:${selectedWeek}`;if(st.histKey===key&&st.history)return st.history;
    const weeks=[...new Set([Number(selectedWeek),Math.max(1,Number(selectedWeek)-1)])];
    const lists=await Promise.all(weeks.map(w=>fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}/transactions/${w}`,{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[])));
    st.history=lists.flat().filter(t=>String(t?.type)==='trade').sort((a,b)=>Number(b.created||0)-Number(a.created||0));st.histKey=key;return st.history;
  }
  // Players received by trade this week who were locked by the team that sent them.
  async function blockedByTrade(rid){
    const [hist,locks]=await Promise.all([loadHistory(),loadLocks()]);
    const out=new Map();
    for(const t of hist||[]){
      if(String(t.status||'')!=='complete'||Number(t.leg||t.week||selectedWeek)!==Number(selectedWeek))continue;
      for(const [pid,to] of Object.entries(t.adds||{})){
        if(Number(to)!==Number(rid))continue;const from=Number((t.drops||{})[pid]||0);
        if(from&&locks.get(String(pid))===from)out.set(String(pid),from);
      }
    }
    return out;
  }

  // ---------- builder state ----------
  function reset(){const me=myRoster();st.teams=me?[me]:[];st.picks={};st.faab=[];st.drops=[]}
  function others(rid){return st.teams.filter(x=>x!==Number(rid))}
  function toggleTeam(rid){rid=Number(rid);if(rid===myRoster())return;if(st.teams.includes(rid)){st.teams=st.teams.filter(x=>x!==rid);for(const [pid,p] of Object.entries(st.picks))if(p.from===rid||p.to===rid)delete st.picks[pid];st.faab=st.faab.filter(f=>f.from!==rid&&f.to!==rid)}else st.teams.push(rid);fixDest()}
  function fixDest(){for(const p of Object.values(st.picks)){const o=others(p.from);if(!o.includes(p.to))p.to=o[0]||0}for(const f of st.faab){const o=others(f.from);if(!o.includes(f.to))f.to=o[0]||0}}
  function summary(){
    const by={};for(const rid of st.teams)by[rid]={in:[],out:[],faabIn:0,faabOut:0};
    for(const [pid,p] of Object.entries(st.picks)){if(by[p.from])by[p.from].out.push(pid);if(by[p.to])by[p.to].in.push(pid)}
    for(const f of st.faab){const amt=Math.max(0,Math.floor(Number(f.amount)||0));if(!amt)continue;if(by[f.from])by[f.from].faabOut+=amt;if(by[f.to])by[f.to].faabIn+=amt}
    return by;
  }
  function problems(locks){
    const out=[],warn=[],by=summary(),me=myRoster();
    if(st.teams.length<2)out.push('Pick at least one other team.');
    const assets=Object.keys(st.picks).length+st.faab.filter(f=>Number(f.amount)>0).length;
    if(st.teams.length>=2&&!assets)out.push('Add at least one player or FAAB.');
    for(const rid of st.teams){const s=by[rid];if(!s)continue;const t=team(rid);
      if(st.teams.length>=2&&!s.in.length&&!s.out.length&&!s.faabIn&&!s.faabOut)out.push(`${t?.team_name||'A team'} isn't giving or getting anything.`);
      if(s.faabOut>faabLeft(rid))out.push(`${t?.team_name} only has $${faabLeft(rid)} FAAB left (sending $${s.faabOut}).`);
      const after=activeCount(rid)-s.out.length+s.in.length-(rid===me?st.drops.length:0);
      // Only a trade that adds net players past the limit needs drops.
      if(rosterLimit()&&after>rosterLimit()&&after>activeCount(rid)){if(rid===me)out.push(`Your roster would be ${after}/${rosterLimit()}. Choose ${after-rosterLimit()} player${after-rosterLimit()===1?'':'s'} to drop below.`);else warn.push(`${t?.team_name} would be at ${after}/${rosterLimit()} and will have to drop ${after-rosterLimit()} to accept.`)}
    }
    for(const f of st.faab)if(Number(f.amount)<0||!Number.isFinite(Number(f.amount)))out.push('FAAB amounts must be whole dollars of $0 or more.');
    for(const [pid,p] of Object.entries(st.picks)){const by2=locks?.get(String(pid));if(by2&&by2===p.from)warn.push(`${pname(pid)} is locked in by ${team(p.from)?.team_name} this week, so ${team(p.to)?.team_name} won't be able to lock him for the rest of Week ${selectedWeek}.`)}
    return{out,warn};
  }

  // ---------- render ----------
  function host(){let el=document.getElementById('rbTradesView');if(!el){const ph=document.getElementById('placeholderView');if(!ph)return null;el=document.createElement('div');el.id='rbTradesView';el.className='hidden';ph.insertAdjacentElement('afterend',el)}return el}
  function teamColumn(rid,locks){
    const t=team(rid),me=rid===myRoster(),res=new Set((t?.reserve||[]).map(String));
    const ids=(t?.players||[]).map(String).sort((a,b)=>pname(a).localeCompare(pname(b)));
    const multi=st.teams.length>2,o=others(rid);
    const rows=ids.map(pid=>{const p=st.picks[pid];const chk=!!p&&p.from===rid;const lockedBy=locks?.get(pid);
      const dest=chk&&multi?`<select data-dest="${esc(pid)}" aria-label="Send ${esc(pname(pid))} to">${o.map(x=>`<option value="${x}" ${p.to===x?'selected':''}>→ ${esc(team(x)?.team_name||x)}</option>`).join('')}</select>`:'';
      const drop=me&&!chk?`<span class="note" title="Drop to make room"><input type="checkbox" data-drop="${esc(pid)}" ${st.drops.includes(pid)?'checked':''} aria-label="Drop ${esc(pname(pid))}"> drop</span>`:'';
      return`<label class="pl ${chk?'sel':''}"><input type="checkbox" data-pick="${esc(pid)}" data-from="${rid}" ${chk?'checked':''} aria-label="Trade ${esc(pname(pid))}"><span style="min-width:0"><div class="nm">${esc(pname(pid))}${lockedBy===rid?'<span class="tag lock">LOCKED</span>':''}${res.has(pid)?'<span class="tag ir">IR</span>':''}</div><div class="meta">${esc(pmeta(pid))}</div></span>${dest||(st.drops.length||activeCount(rid)>=rosterLimit()?drop:'')}</label>`}).join('');
    const f=st.faab.find(x=>x.from===rid);
    const faab=`<div class="faab">FAAB <input type="number" min="0" step="1" inputmode="numeric" data-faab="${rid}" value="${f?esc(f.amount):''}" placeholder="$0" aria-label="FAAB ${esc(t?.team_name||'')} sends">${multi?`<select data-faab-to="${rid}" aria-label="FAAB goes to">${o.map(x=>`<option value="${x}" ${f?.to===x?'selected':''}>→ ${esc(team(x)?.team_name||x)}</option>`).join('')}</select>`:`→ ${esc(team(o[0])?.team_name||'')}`}<span class="note" style="margin-left:auto">$${faabLeft(rid)} left</span></div>`;
    return`<div class="tm"><div class="tm-head">${avatar(t)}<span>${esc(t?.team_name||'Team')}${me?' (you)':''}</span><small>${activeCount(rid)}/${rosterLimit()||'?'} rostered</small></div><div class="tm-list">${rows||'<div class="empty">No players</div>'}</div>${st.teams.length>=2?faab:''}</div>`;
  }
  function summaryHtml(){
    const by=summary();
    return`<div class="sum">${st.teams.map(rid=>{const s=by[rid],t=team(rid);const li=a=>a.map(pid=>`<li>${esc(pname(pid))} <span class="note">${esc(pmeta(pid))}</span></li>`).join('');
      return`<div class="sum-team"><b>${esc(t?.team_name||'')}</b><div class="in" style="margin-top:6px">Gets</div><ul>${li(s.in)}${s.faabIn?`<li>$${s.faabIn} FAAB</li>`:''}${!s.in.length&&!s.faabIn?'<li class="note">Nothing</li>':''}</ul><div class="out">Gives</div><ul>${li(s.out)}${s.faabOut?`<li>$${s.faabOut} FAAB</li>`:''}${!s.out.length&&!s.faabOut?'<li class="note">Nothing</li>':''}</ul>${rid===myRoster()&&st.drops.length?`<div class="out">Drops</div><ul>${li(st.drops)}</ul>`:''}</div>`}).join('')}</div>`;
  }
  function historyHtml(){
    const h=st.history;if(!h)return'<div class="empty">Loading trades…</div>';if(!h.length)return`<div class="empty">No trades in Week ${Math.max(1,selectedWeek-1)} or Week ${selectedWeek}.</div>`;
    return h.map(t=>{const rids=(t.roster_ids||[]).map(Number);const when=new Date(Number(t.created||0)).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});const status=String(t.status||'');
      const sides=rids.map(rid=>{const got=Object.entries(t.adds||{}).filter(([,r])=>Number(r)===rid).map(([pid])=>esc(pname(pid)));const faab=(t.waiver_budget||[]).filter(x=>Number(x.receiver)===rid).map(x=>`$${Number(x.amount)} FAAB`);const picks=(t.draft_picks||[]).filter(x=>Number(x.owner_id)===rid).map(x=>`${x.season} R${x.round} pick`);const all=[...got,...faab,...picks];return`<div class="side"><b>${esc(team(rid)?.team_name||`Roster ${rid}`)}</b><span><span class="in" style="color:#78efd3">gets</span> ${all.join(', ')||'<span class="note">nothing</span>'}</span></div>`}).join('');
      return`<div class="hist"><div class="when">${esc(when)} · ${rids.length}-team trade${status&&status!=='complete'?` · ${esc(status)}`:''}</div>${sides}</div>`}).join('');
  }
  async function draw(){
    const el=host();if(!el)return;
    if(!st.teams.length||!st.teams.includes(myRoster()))reset();
    const me=myRoster();
    if(!me){el.innerHTML=`<div class="tr-card"><h3>Trades</h3><div class="empty">Link your Sleeper account (top right) to build trades for your team.</div></div>`;return}
    const locks=st.locks;
    const seg=`<div class="seg" role="group" aria-label="Trades view"><button type="button" data-tab="propose" aria-pressed="${st.tab==='propose'}">Propose Trade</button><button type="button" data-tab="history" aria-pressed="${st.tab==='history'}">Trade History</button></div>`;
    if(st.tab==='history'){el.innerHTML=`<div class="tr-card">${seg}<h3>Trade History</h3><div class="sub">Completed and pending trades from Week ${Math.max(1,selectedWeek-1)}–${selectedWeek}, including FAAB.</div>${historyHtml()}</div>`;return}
    const chips=teams().map(t=>{const rid=Number(t.roster_id);if(rid===me)return`<span class="chip me">${avatar(t)}${esc(t.team_name)} (you)</span>`;return`<button type="button" class="chip" data-team="${rid}" aria-pressed="${st.teams.includes(rid)}">${avatar(t)}${esc(t.team_name)}</button>`}).join('');
    const {out,warn}=problems(locks);const ready=!out.length;
    el.innerHTML=`<div class="tr-card">${seg}<h3>Propose a Trade</h3><div class="sub">Pick one or more teams — Sleeper supports trades between several teams at once. Then check the players and FAAB each team sends.</div><div class="chips" aria-label="Trade partners">${chips}</div></div>
      ${st.teams.length>=2?`<div class="teams">${st.teams.map(rid=>teamColumn(rid,locks)).join('')}</div>`:''}
      ${st.teams.length>=2?`<div class="tr-card"><h3>Summary</h3><div class="sub">${st.teams.length}-team trade · Week ${selectedWeek}</div>${summaryHtml()}${out.map(x=>`<div class="warn err">${esc(x)}</div>`).join('')}${warn.map(x=>`<div class="warn">${esc(x)}</div>`).join('')}
        <div class="actions"><span class="btn primary" role="button" tabindex="0" aria-disabled="true" title="Sending to Sleeper is being connected">Send to Sleeper</span><button type="button" class="btn" data-copy ${ready?'':'aria-disabled="true"'}>Copy summary</button><button type="button" class="btn" data-reset>Reset</button><span class="note">${ready?'Trade looks valid. Sending to Sleeper turns on once the proposal format is confirmed.':'Fix the items above to continue.'}</span></div></div>`:''}`;
  }
  function textSummary(){const by=summary();return st.teams.map(rid=>{const s=by[rid];return`${team(rid)?.team_name}: gets ${[...s.in.map(pname),s.faabIn?`$${s.faabIn} FAAB`:''].filter(Boolean).join(', ')||'nothing'}; gives ${[...s.out.map(pname),s.faabOut?`$${s.faabOut} FAAB`:''].filter(Boolean).join(', ')||'nothing'}`}).join('\n')}
  function bind(){
    const el=host();if(!el||el.dataset.rbBound==='1')return;el.dataset.rbBound='1';
    el.addEventListener('click',e=>{
      const tb=e.target.closest?.('[data-tab]');if(tb){st.tab=tb.dataset.tab;if(st.tab==='history')loadHistory().then(()=>draw());draw();return}
      const tm=e.target.closest?.('[data-team]');if(tm){toggleTeam(tm.dataset.team);draw();return}
      if(e.target.closest?.('[data-reset]')){reset();draw();return}
      const cp=e.target.closest?.('[data-copy]');if(cp&&cp.getAttribute('aria-disabled')!=='true'){navigator.clipboard?.writeText(textSummary()).catch(()=>{});cp.textContent='Copied';setTimeout(()=>{cp.textContent='Copy summary'},1200)}
    });
    el.addEventListener('change',e=>{
      const t=e.target;
      if(t.dataset.pick){const pid=t.dataset.pick,from=Number(t.dataset.from);if(t.checked){st.picks[pid]={from,to:others(from)[0]||0};st.drops=st.drops.filter(x=>x!==pid)}else delete st.picks[pid];draw();return}
      if(t.dataset.dest){const p=st.picks[t.dataset.dest];if(p)p.to=Number(t.value);draw();return}
      if(t.dataset.drop){const pid=t.dataset.drop;st.drops=t.checked?[...new Set([...st.drops,pid])]:st.drops.filter(x=>x!==pid);draw();return}
      if(t.dataset.faab){const from=Number(t.dataset.faab);let f=st.faab.find(x=>x.from===from);if(!f){f={from,to:others(from)[0]||0,amount:0};st.faab.push(f)}f.amount=Math.max(0,Math.floor(Number(t.value)||0));draw();return}
      if(t.dataset.faabTo){const from=Number(t.dataset.faabTo);let f=st.faab.find(x=>x.from===from);if(!f){f={from,to:0,amount:0};st.faab.push(f)}f.to=Number(t.value);draw()}
    });
  }
  async function show(){
    const el=host();if(!el)return;bind();
    document.getElementById('placeholderView')?.classList.add('hidden');el.classList.remove('hidden');
    draw();loadLocks().then(()=>{if(currentView==='trades')draw()});loadHistory().then(()=>{if(currentView==='trades')draw()});
  }

  // ---------- Team view: traded-after-lock rule ----------
  let blocked=new Map(),blockedKey='';
  async function refreshBlocked(){
    try{const rid=Number(selectedRoster),key=`${leagueId}:${selectedWeek}:${rid}`;if(!rid)return;blocked=await blockedByTrade(rid);blockedKey=key;enforce()}catch{}
  }
  function enforce(){
    if(!blocked.size)return;
    document.querySelectorAll('#teamView .player-row').forEach(row=>{
      let pid=String(row.dataset.rbPlayerId||'');
      if(!pid){const nm=String(row.querySelector('.pname')?.textContent||'').trim().toLowerCase();for(const id of blocked.keys())if(pname(id).toLowerCase()===nm){pid=id;break}}
      if(!pid||!blocked.has(pid)||row.classList.contains('locked-in'))return;
      const btns=row.querySelectorAll('.lock-btn');if(!btns.length&&row.querySelector('.rb-trade-lock-tag'))return;
      btns.forEach(b=>b.remove());row.classList.remove('lockable');
      if(!row.querySelector('.rb-trade-lock-tag')){const host=row.querySelector('.matchup-meta')||row.querySelector('.pmeta')||row.querySelector('.pname');const s=document.createElement('span');s.className='rb-trade-lock-tag';s.textContent=`LOCKED BY ${String(team(blocked.get(pid))?.team_name||'PREVIOUS TEAM').toUpperCase()} · NOT LOCKABLE THIS WEEK`;host?.appendChild(s)}
    });
  }

  function install(){
    if(!document.getElementById('rbTradesStyle')){const s=document.createElement('style');s.id='rbTradesStyle';s.textContent=css;document.head.appendChild(s)}
    try{if(typeof render==='function'&&!render.__rbTrades){const base=render;const w=function(...a){const out=base.apply(this,a);const el=document.getElementById('rbTradesView');if(currentView==='trades')show();else el?.classList.add('hidden');const k=`${leagueId}:${selectedWeek}:${selectedRoster}`;if(k!==blockedKey)refreshBlocked();return out};w.__rbTrades=true;render=w;window.render=w}}catch{}
    try{if(typeof renderTeam==='function'&&!renderTeam.__rbTradeLock){const base=renderTeam;const w=function(...a){const o=base.apply(this,a);enforce();setTimeout(enforce,0);setTimeout(enforce,120);return o};w.__rbTradeLock=true;renderTeam=w;window.renderTeam=w}}catch{}
    const tv=document.getElementById('teamView');if(tv)new MutationObserver(()=>{if(blocked.size)queueMicrotask(enforce)}).observe(tv,{childList:true,subtree:true});
    window.addEventListener('rb:sleeper-lock-state',()=>{st.locks=null;st.locksKey='';refreshBlocked()});
    try{if(currentView==='trades')window.render()}catch{}
    setTimeout(refreshBlocked,1500);
  }
  window.rbTrades={state:st,summary,textSummary,blockedByTrade};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
