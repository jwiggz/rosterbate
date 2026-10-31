(()=>{
  // Scores tab: top fantasy scorers today, last game, and last 3 / 7 / 14 game averages.
  // Also removes the Trend tab from the top navigation.
  const css=`
.tab[data-view="trend"]{display:none!important}
#rbScoresView{background:var(--panel,#202a3a);border:1px solid var(--border,#334258);border-radius:10px;padding:14px}
#rbScoresView .sc-top{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}
#rbScoresView h3{margin:0;font-size:14px;font-weight:950;color:var(--text,#f4f7fb)}
#rbScoresView .sc-sub{color:var(--muted,#8e9bb0);font-size:9px;font-weight:700}
#rbScoresView .sc-spacer{flex:1}
#rbScoresView .sc-seg+.sc-seg{margin-left:-2px}
#rbScoresView .sc-seg{display:inline-flex;border:1px solid var(--border,#334258);border-radius:8px;overflow:hidden}
#rbScoresView .sc-seg button{all:unset;cursor:pointer;padding:7px 11px;font-size:9px;font-weight:900;letter-spacing:.04em;color:#aab6c8;background:#192434;border-left:1px solid var(--border,#334258)}
#rbScoresView .sc-seg button:first-child{border-left:0}
#rbScoresView .sc-seg button[aria-pressed="true"]{background:var(--teal,#08c7c9);color:#03282a}
#rbScoresView .sc-seg button:focus-visible{outline:2px solid #e9eef7;outline-offset:-2px}
#rbScoresView select{background:#192434;color:#d7e0ee;border:1px solid var(--border,#334258);border-radius:8px;padding:6px 8px;font-size:9px;font-weight:800}
#rbScoresView .sc-games{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px}
#rbScoresView .sc-game{cursor:pointer;flex:0 0 auto;min-width:92px;padding:6px 8px;border-radius:7px;background:#192434;border:1px solid rgba(255,255,255,.06);font-size:9px;color:#c7d2e2;font-variant-numeric:tabular-nums}
#rbScoresView .sc-game .row{display:flex;justify-content:space-between;gap:8px;font-weight:900}
#rbScoresView .sc-game .st{margin-top:3px;color:var(--muted,#8e9bb0);font-size:8px;font-weight:800}
#rbScoresView .sc-game:hover{border-color:rgba(8,199,201,.45)}
#rbScoresView .sc-game:focus-visible{outline:2px solid #08c7c9;outline-offset:2px}
#rbScoresView .sc-game.in{border-color:rgba(48,216,160,.45)}#rbScoresView .sc-game.in .st{color:var(--green,#30d8a0)}
#rbScoresView .sc-wrap{overflow-x:auto}
#rbScoresView table{width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums}
#rbScoresView th{position:sticky;top:0;background:var(--panel,#202a3a);padding:7px 8px;text-align:right;color:#8e9aae;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap}
#rbScoresView th.l,#rbScoresView td.l{text-align:left}
#rbScoresView th button{all:unset;cursor:pointer;color:inherit}
#rbScoresView th button:hover{color:#e9eef7}#rbScoresView th button:focus-visible{outline:1px solid #08c7c9;outline-offset:3px}
#rbScoresView th[aria-sort="descending"] button,#rbScoresView th[aria-sort="ascending"] button{color:#3fe0c5}
#rbScoresView td{padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,.045);color:#d7e0ee;white-space:nowrap}
#rbScoresView tbody tr:hover{background:rgba(8,199,201,.05)}
#rbScoresView tr.mine td:first-child{box-shadow:inset 3px 0 0 var(--teal,#08c7c9)}
#rbScoresView .rk{color:#8e9aae;font-weight:900;width:26px}
#rbScoresView .nm{font-weight:900;color:#eef4ff}
#rbScoresView .meta{color:#8190a5;font-size:8px;font-weight:800;margin-top:2px}
#rbScoresView .own{display:inline-block;margin-left:6px;padding:1px 5px;border-radius:4px;font-size:7px;font-weight:900;letter-spacing:.03em;background:rgba(143,160,184,.12);color:#aab6c8}
#rbScoresView .own.fa{background:rgba(48,216,160,.12);color:#78efd3}
#rbScoresView .own.me{background:rgba(8,199,201,.18);color:#5ff0f2}
#rbScoresView .fp{font-weight:950;color:var(--yellow,#f3c75b);font-size:11px}
#rbScoresView .live{color:var(--green,#30d8a0);font-size:7px;font-weight:900;margin-left:4px}
#rbScoresView .sc-empty,#rbScoresView .sc-load{padding:30px 10px;text-align:center;color:var(--muted,#8e9bb0);font-size:11px;font-weight:700}
#rbScoresView .sc-err{color:#ff9aa9}
`;
  const RANGES=[['today','Today'],['last','Last Game'],['l3','Last 3'],['l7','Last 7'],['l14','Last 14']];
  const COLS=[['fpts','FPTS'],['pts','PTS'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['tpm','3PM'],['to','TO'],['fg','FG']];
  const st={mode:'total',range:'today',owner:'all',pos:'ALL',sort:'fpts',dir:-1,data:null,loading:null,error:'',key:'',timer:null};
  try{const s=JSON.parse(sessionStorage.getItem('rbScoresPrefs')||'null');if(s)Object.assign(st,{mode:s.mode||st.mode,range:s.range||st.range,owner:s.owner||st.owner,pos:s.pos||st.pos,sort:s.sort||st.sort,dir:s.dir||st.dir})}catch{}
  const save=()=>{try{sessionStorage.setItem('rbScoresPrefs',JSON.stringify({mode:st.mode,range:st.range,owner:st.owner,pos:st.pos,sort:st.sort,dir:st.dir}))}catch{}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const f1=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'—';
  const fantasyDay=()=>{const d=new Date();if(d.getHours()<6)d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const dlabel=d=>{try{return new Date(`${d}T12:00:00`).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}catch{return d}};

  function owners(){
    const map=new Map();let mine=0;
    try{const uid=String(localStorage.getItem('rbSleeperLinkedUserId')||'');for(const t of currentData?.teams||[]){if(String(t.owner_id||'')===uid)mine=Number(t.roster_id);for(const p of t.players||[])map.set(String(p),t)}}catch{}
    return{map,mine};
  }
  function host(){
    let el=document.getElementById('rbScoresView');
    if(!el){const ph=document.getElementById('placeholderView');if(!ph)return null;el=document.createElement('div');el.id='rbScoresView';el.className='hidden';ph.insertAdjacentElement('afterend',el)}
    return el;
  }
  async function load(force=false){
    const key=`${leagueId}:${fantasyDay()}`;
    if(!force&&st.data&&st.key===key)return st.data;
    if(st.loading)return st.loading;
    st.loading=(async()=>{try{const r=await fetch(`/.netlify/functions/sleeper-scores?league=${encodeURIComponent(leagueId)}&date=${fantasyDay()}&_=${Date.now()}`,{cache:'no-store'});const d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||`HTTP ${r.status}`);st.data=d;st.key=key;st.error=''}catch(e){st.error=e?.message||String(e)}finally{st.loading=null}return st.data})();
    return st.loading;
  }
  function lineFor(p){
    if(st.range==='today')return p.today?{fpts:p.today.fpts,s:p.today.s,gp:1,note:`${p.today.home?'vs':'@'} ${p.today.opp}`,live:p.today.live}:null;
    if(st.range==='last')return p.last?{fpts:p.last.fpts,s:p.last.s,gp:1,note:`${dlabel(p.last.date)} ${p.last.home?'vs':'@'} ${p.last.opp}`}:null;
    const a=p[st.range];if(!a)return null;const tot=st.mode==='total'&&a.ts;return{fpts:tot?a.tfpts:a.fpts,s:tot?a.ts:a.s,gp:a.gp,note:`${a.gp} game${a.gp===1?'':'s'}`,avg:!tot};
  }
  function rows(){
    const {map,mine}=owners();
    let list=(st.data?.players||[]).map(p=>({p,l:lineFor(p),t:map.get(String(p.id))||null})).filter(x=>x.l);
    if(st.owner==='mine')list=list.filter(x=>x.t&&Number(x.t.roster_id)===mine);
    else if(st.owner==='rostered')list=list.filter(x=>x.t);
    else if(st.owner==='fa')list=list.filter(x=>!x.t);
    if(st.pos!=='ALL')list=list.filter(x=>String(x.p.pos||'').split('/').includes(st.pos));
    const val=x=>st.sort==='fpts'?x.l.fpts:st.sort==='fg'?(x.l.s.fga?x.l.s.fgm/x.l.s.fga:-1):Number(x.l.s[st.sort]||0);
    list.sort((a,b)=>(val(a)-val(b))*st.dir||b.l.fpts-a.l.fpts);
    return{list,mine};
  }
  function gamesStrip(){
    if(st.range!=='today')return'';
    const g=st.data?.games||[];if(!g.length)return'';
    const status=x=>x.state==='in'?(x.detail||'Live'):x.state==='post'?'Final':(()=>{try{return new Date(x.start).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}catch{return'Scheduled'}})();
    return`<div class="sc-games" aria-label="Today's games">${g.map(x=>`<div class="sc-game ${x.state}" role="button" tabindex="0" data-box="${esc(x.id)}" title="Open box score"><div class="row"><span>${esc(x.away)}</span><span>${x.state==='pre'?'':x.awayScore}</span></div><div class="row"><span>${esc(x.home)}</span><span>${x.state==='pre'?'':x.homeScore}</span></div><div class="st">${esc(status(x))}</div></div>`).join('')}</div>`;
  }
  function emptyMessage(){
    if(st.range==='today'){const g=st.data?.games||[];if(!g.length)return'No NBA games today.';if(g.every(x=>x.state==='pre'))return'No games have tipped off yet today. Check back once games start, or look at Last Game.';}
    return st.owner!=='all'||st.pos!=='ALL'?'No players match these filters.':'No games in this range yet.';
  }
  function draw(){
    const el=host();if(!el)return;
    const seg=RANGES.map(([k,l])=>`<button type="button" data-range="${k}" aria-pressed="${st.range===k}">${l}</button>`).join('');
    const top=`<div class="sc-top"><div><h3>Top Scorers</h3><div class="sc-sub">${st.range==='today'?`${dlabel(fantasyDay())} · your league's scoring`:st.range==='last'?'Most recent game played':`${st.mode==='total'?'Totals':'Per-game averages'} over each player's last ${st.range.slice(1)} games`}</div></div><span class="sc-spacer"></span><div class="sc-seg" role="group" aria-label="Time range">${seg}</div>${['l3','l7','l14'].includes(st.range)?`<div class="sc-seg" role="group" aria-label="Totals or per game"><button type="button" data-mode="total" aria-pressed="${st.mode==='total'}">Totals</button><button type="button" data-mode="avg" aria-pressed="${st.mode==='avg'}">Per Game</button></div>`:''}<select id="rbScOwner" aria-label="Owner filter"><option value="all">All players</option><option value="mine">My team</option><option value="rostered">Rostered</option><option value="fa">Free agents</option></select><select id="rbScPos" aria-label="Position filter">${['ALL','PG','SG','SF','PF','C'].map(p=>`<option value="${p}">${p==='ALL'?'All positions':p}</option>`).join('')}</select></div>`;
    let body='';
    if(!st.data&&st.loading)body='<div class="sc-load">Loading box scores…</div>';
    else if(!st.data&&st.error)body=`<div class="sc-empty sc-err">Couldn't load scores: ${esc(st.error)}</div>`;
    else{
      const {list,mine}=rows();
      if(!list.length)body=`<div class="sc-empty">${esc(emptyMessage())}</div>`;
      else{
        const multi=!['today','last'].includes(st.range),avg=multi&&st.mode==='avg';
        const head=`<tr><th class="l">#</th><th class="l">Player</th><th class="l">${multi?'GP':'Game'}</th>${COLS.map(([k,l])=>`<th aria-sort="${st.sort===k?(st.dir<0?'descending':'ascending'):'none'}"><button type="button" data-sort="${k}">${l}${st.sort===k?(st.dir<0?' ▼':' ▲'):''}</button></th>`).join('')}</tr>`;
        const fmt=v=>avg?f1(v):String(Math.round(Number(v)||0));
        const tr=list.slice(0,150).map((x,i)=>{const s=x.l.s,t=x.t,me=t&&Number(t.roster_id)===mine;const own=!t?'<span class="own fa">FA</span>':me?'<span class="own me">MY TEAM</span>':`<span class="own">${esc(t.team_name||t.display_name||'Rostered')}</span>`;
          return`<tr class="${me?'mine':''}"><td class="l rk">${i+1}</td><td class="l"><div class="nm">${esc(x.p.name)}${own}</div><div class="meta">${esc(x.p.team)} · ${esc(x.p.pos||'—')}${x.p.injury?` · ${esc(x.p.injury)}`:''}</div></td><td class="l">${esc(x.l.note)}${x.l.live?'<span class="live">LIVE</span>':''}</td><td class="fp">${f1(x.l.fpts)}</td><td>${fmt(s.pts)}</td><td>${fmt(s.reb)}</td><td>${fmt(s.ast)}</td><td>${fmt(s.stl)}</td><td>${fmt(s.blk)}</td><td>${fmt(s.tpm)}</td><td>${fmt(s.to)}</td><td>${avg?`${f1(s.fgm)}-${f1(s.fga)}`:`${Math.round(s.fgm)}-${Math.round(s.fga)}`}</td></tr>`}).join('');
        body=`${gamesStrip()}<div class="sc-wrap"><table><thead>${head}</thead><tbody>${tr}</tbody></table></div>`;
      }
      if(st.data&&st.range==='today'&&!list.length)body=gamesStrip()+body;
    }
    el.innerHTML=top+body;
    el.querySelector('#rbScOwner').value=st.owner;el.querySelector('#rbScPos').value=st.pos;
  }
  function bind(){
    const el=host();if(!el||el.dataset.rbBound==='1')return;el.dataset.rbBound='1';
    el.addEventListener('click',e=>{
      const md=e.target.closest?.('button[data-mode]');if(md){st.mode=md.dataset.mode;save();draw();el.querySelector(`button[data-mode="${st.mode}"]`)?.focus();return}
      const r=e.target.closest?.('button[data-range]');if(r){st.range=r.dataset.range;save();draw();el.querySelector(`button[data-range="${st.range}"]`)?.focus();return}
      const s=e.target.closest?.('button[data-sort]');if(s){const k=s.dataset.sort;if(st.sort===k)st.dir*=-1;else{st.sort=k;st.dir=k==='to'?1:-1}save();draw();el.querySelector(`button[data-sort="${k}"]`)?.focus()}
    });
    el.addEventListener('change',e=>{if(e.target.id==='rbScOwner')st.owner=e.target.value;if(e.target.id==='rbScPos')st.pos=e.target.value;save();draw()});
  }
  async function show(){
    const el=host();if(!el)return;bind();
    document.getElementById('placeholderView')?.classList.add('hidden');el.classList.remove('hidden');
    draw();await load();if(currentView==='scores')draw();
    clearInterval(st.timer);
    st.timer=setInterval(async()=>{if(currentView!=='scores'||document.hidden){return}const live=(st.data?.games||[]).some(g=>g.state==='in');if(!live)return;await load(true);if(currentView==='scores')draw()},60000);
  }
  function install(){
    if(!document.getElementById('rbScoresStyle')){const s=document.createElement('style');s.id='rbScoresStyle';s.textContent=css;document.head.appendChild(s)}
    document.querySelector('.tab[data-view="trend"]')?.remove();
    try{if(typeof render==='function'&&!render.__rbScores){const base=render;const w=function(...a){if(currentView==='trend')currentView='team';const out=base.apply(this,a);const el=document.getElementById('rbScoresView');if(currentView==='scores')show();else{el?.classList.add('hidden');clearInterval(st.timer)}return out};w.__rbScores=true;render=w;window.render=w}}catch{}
    try{if(currentView==='scores'||currentView==='trend')window.render()}catch{}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
