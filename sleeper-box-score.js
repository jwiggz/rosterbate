(()=>{
  // Box score window for one NBA game (opened from the Scores tab's game chips):
  // live score, both teams' players with stats + league fantasy points, and recent plays.
  const css=`
#rbBoxBack{position:fixed;inset:0;z-index:600;background:#04080ecc;display:grid;place-items:center;padding:16px}
#rbBox{width:min(1100px,97vw);max-height:93vh;display:flex;flex-direction:column;background:#1c2636;border:1px solid #3b4b63;border-radius:14px;overflow:hidden;color:#d7e0ee;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#rbBox .bx-head{display:grid;grid-template-columns:1fr auto 1fr auto;align-items:center;gap:14px;padding:14px 18px;background:linear-gradient(90deg,#173a40,#1d2b3f);border-bottom:1px solid #33435a}
#rbBox .bx-team{display:flex;flex-direction:column;gap:2px}
#rbBox .bx-team.r{text-align:right}
#rbBox .bx-abbr{font-size:20px;font-weight:950;color:#f4f7fb}
#rbBox .bx-name{font-size:9px;font-weight:800;color:#93a3b8}
#rbBox .bx-score{font-size:30px;font-weight:950;color:#f4f7fb;font-variant-numeric:tabular-nums;text-align:center;line-height:1}
#rbBox .bx-score small{display:block;margin-top:6px;font-size:9px;font-weight:900;letter-spacing:.05em;color:#93a3b8}
#rbBox .bx-score small.live{color:#30d8a0}
#rbBox .bx-close{all:unset;cursor:pointer;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:18px;color:#cfd8e6;background:#27354a}
#rbBox .bx-close:focus-visible{outline:2px solid #08c7c9;outline-offset:2px}
#rbBox .bx-body{overflow:auto;padding:14px 18px;display:grid;gap:14px}
#rbBox .bx-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:14px}
#rbBox h4{margin:0 0 6px;font-size:11px;font-weight:950;color:#eef4ff}
#rbBox table{width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums}
#rbBox th{padding:5px 6px;text-align:right;color:#8e9aae;font-size:8px;font-weight:900;letter-spacing:.05em;border-bottom:1px solid rgba(255,255,255,.08)}
#rbBox th.l,#rbBox td.l{text-align:left}
#rbBox td{padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,.045);white-space:nowrap}
#rbBox tr.bench td.l .nm{color:#aab6c8}
#rbBox tr.mine td:first-child{box-shadow:inset 3px 0 0 #08c7c9}
#rbBox .nm{font-weight:900;color:#eef4ff}
#rbBox .own{margin-left:5px;padding:1px 5px;border-radius:4px;font-size:7px;font-weight:900;background:rgba(143,160,184,.12);color:#aab6c8}
#rbBox .own.fa{background:rgba(48,216,160,.12);color:#78efd3}
#rbBox .own.me{background:rgba(8,199,201,.18);color:#5ff0f2}
#rbBox .fp{font-weight:950;color:#f3c75b}
#rbBox .plays{max-height:260px;overflow:auto;border:1px solid rgba(255,255,255,.06);border-radius:9px}
#rbBox .play{display:grid;grid-template-columns:66px 44px 1fr 64px;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.045);font-size:10px}
#rbBox .play.score .txt{color:#eef4ff;font-weight:800}
#rbBox .play .txt{text-align:left}
#rbBox .play .t{color:#8e9aae;font-weight:800}
#rbBox .play .tm{color:#aab6c8;font-weight:900}
#rbBox .play .sc{text-align:right;font-variant-numeric:tabular-nums;color:#c7d2e2}
#rbBox .note{color:#8e9aae;font-size:9px;font-weight:700}
#rbBox .empty{padding:24px;text-align:center;color:#8e9aae;font-size:11px;font-weight:700}
@media(max-width:600px){#rbBox .bx-cols{grid-template-columns:1fr}#rbBox .bx-abbr{font-size:16px}#rbBox .bx-score{font-size:22px}}
`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let timer=null,openId='',lastFocus=null;
  function owners(){const map=new Map();let mine=0;try{const uid=String(localStorage.getItem('rbSleeperLinkedUserId')||'');for(const t of currentData?.teams||[]){if(String(t.owner_id||'')===uid)mine=Number(t.roster_id);for(const p of t.players||[])map.set(String(p),t)}}catch{}return{map,mine}}
  function period(n){return n>4?`OT${n-4>1?n-4:''}`:`Q${n}`}
  function table(g,abbr,lines){
    const {map,mine}=owners();const rows=lines.filter(l=>l.team===abbr);
    if(!rows.length)return`<div><h4>${esc(abbr)}</h4><div class="empty">${g.state==='pre'?'Game hasn\'t started.':'No stats yet.'}</div></div>`;
    const tr=rows.map(l=>{const t=map.get(String(l.id)),me=t&&Number(t.roster_id)===mine;const own=!/^\d+$/.test(String(l.id))?'':!t?'<span class="own fa">FA</span>':me?'<span class="own me">MY TEAM</span>':`<span class="own">${esc(t.team_name||'Rostered')}</span>`;const s=l.s||{};
      return`<tr class="${l.starter?'':'bench'} ${me?'mine':''}"><td class="l"><span class="nm">${esc(l.name)}</span>${own}</td><td>${Math.round(s.min||0)}</td><td>${s.pts||0}</td><td>${s.reb||0}</td><td>${s.ast||0}</td><td>${s.stl||0}</td><td>${s.blk||0}</td><td>${s.tpm||0}</td><td>${s.to||0}</td><td>${s.fgm||0}-${s.fga||0}</td><td class="fp">${Number(l.fpts||0).toFixed(1)}</td></tr>`}).join('');
    return`<div><h4>${esc(abbr)}</h4><table><thead><tr><th class="l">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>3PM</th><th>TO</th><th>FG</th><th>FPTS</th></tr></thead><tbody>${tr}</tbody></table></div>`;
  }
  function render(d){
    const box=document.getElementById('rbBox');if(!box)return;const g=d.game;
    const live=g.state==='in';const status=live?(g.detail||'Live'):g.state==='post'?(g.detail||'Final'):(()=>{try{return new Date(g.start).toLocaleString('en-US',{weekday:'short',hour:'numeric',minute:'2-digit'})}catch{return'Scheduled'}})();
    const plays=(d.plays||[]).map(p=>`<div class="play ${p.scoring?'score':''}"><span class="t">${p.period?esc(period(p.period)):''} ${esc(p.clock)}</span><span class="tm">${esc(p.team)}</span><span class="txt">${esc(p.text)}</span><span class="sc">${Number.isFinite(p.away)&&Number.isFinite(p.home)?`${p.away}-${p.home}`:''}</span></div>`).join('');
    const scrollKeep=box.querySelector('.bx-body')?.scrollTop||0;
    box.innerHTML=`<div class="bx-head"><div class="bx-team"><span class="bx-abbr">${esc(g.away)}</span><span class="bx-name">${esc(g.awayName)}</span></div><div class="bx-score">${g.state==='pre'?'vs':`${g.awayScore} – ${g.homeScore}`}<small class="${live?'live':''}">${live?'● ':''}${esc(status)}</small></div><div class="bx-team r"><span class="bx-abbr">${esc(g.home)}</span><span class="bx-name">${esc(g.homeName)}</span></div><button type="button" class="bx-close" aria-label="Close box score">×</button></div>
      <div class="bx-body"><div class="note">Fantasy points use your league's scoring.${live?' Updates every 30 seconds while open.':''}${g.venue?` · ${esc(g.venue)}`:''}</div>
      <div class="bx-cols">${table(g,g.away,d.lines||[])}${table(g,g.home,d.lines||[])}</div>
      ${live||plays?`<div><h4>${live?'Live plays':'Plays'}</h4>${plays?`<div class="plays" aria-live="polite">${plays}</div>`:'<div class="empty">No plays yet.</div>'}</div>`:''}</div>`;
    box.querySelector('.bx-body').scrollTop=scrollKeep;
    box.querySelector('.bx-close').onclick=close;
    clearTimeout(timer);if(live&&openId===g.id)timer=setTimeout(()=>load(g.id),30000);
  }
  async function load(id){
    try{const r=await fetch(`/.netlify/functions/sleeper-scores?league=${encodeURIComponent(leagueId)}&game=${encodeURIComponent(id)}&_=${Date.now()}`,{cache:'no-store'});const d=await r.json();if(openId!==id)return;if(!r.ok||!d?.ok)throw new Error(d?.error||`HTTP ${r.status}`);render(d)}
    catch(e){const box=document.getElementById('rbBox');if(box&&openId===id&&!box.querySelector('.bx-cols'))box.querySelector('.bx-body').innerHTML=`<div class="empty">Couldn't load the box score: ${esc(e.message)}</div>`;clearTimeout(timer);timer=setTimeout(()=>{if(openId===id)load(id)},30000)}
  }
  function close(){clearTimeout(timer);openId='';document.getElementById('rbBoxBack')?.remove();try{lastFocus?.focus()}catch{}}
  function open(id,chip){
    if(!document.getElementById('rbBoxStyle')){const s=document.createElement('style');s.id='rbBoxStyle';s.textContent=css;document.head.appendChild(s)}
    close();lastFocus=chip||document.activeElement;openId=String(id);
    const back=document.createElement('div');back.id='rbBoxBack';back.innerHTML=`<section id="rbBox" role="dialog" aria-modal="true" aria-label="Box score"><div class="bx-head"><div></div><div class="bx-score">…<small>Loading box score</small></div><div></div><button type="button" class="bx-close" aria-label="Close box score">×</button></div><div class="bx-body"><div class="empty">Loading…</div></div></section>`;
    document.body.appendChild(back);back.addEventListener('click',e=>{if(e.target===back)close()});back.querySelector('.bx-close').onclick=close;back.querySelector('.bx-close').focus();
    load(String(id));
  }
  document.addEventListener('click',e=>{const c=e.target.closest?.('[data-box]');if(c){e.preventDefault();open(c.dataset.box,c)}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openId){close();return}if((e.key==='Enter'||e.key===' ')&&e.target.closest?.('[data-box]')){e.preventDefault();open(e.target.closest('[data-box]').dataset.box,e.target)}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&openId)load(openId)});
  window.rbOpenBoxScore=open;
})();
