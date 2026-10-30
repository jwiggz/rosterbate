(()=>{
  // League tab: sortable standings (W-L, PF, PA) where clicking a team opens its Team page.
  const css=`
#leagueView .rb-standings{width:100%;border-collapse:collapse;font-size:11px}
#leagueView .rb-standings th{padding:8px 10px;text-align:left;color:#8e9aae;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap}
#leagueView .rb-standings th.num,#leagueView .rb-standings td.num{text-align:right}
#leagueView .rb-standings th button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:inherit}
#leagueView .rb-standings th button:hover,#leagueView .rb-standings th button:focus-visible{color:#e9eef7}
#leagueView .rb-standings th button:focus-visible{outline:1px solid #08c7c9;outline-offset:3px;border-radius:2px}
#leagueView .rb-standings th[aria-sort="ascending"] button,#leagueView .rb-standings th[aria-sort="descending"] button{color:#3fe0c5}
#leagueView .rb-standings .arrow{font-size:8px;opacity:.9}
#leagueView .rb-standings td{padding:10px;border-bottom:1px solid rgba(255,255,255,.05);color:#d7e0ee;font-variant-numeric:tabular-nums}
#leagueView .rb-standings tbody tr{cursor:pointer;transition:background .12s}
#leagueView .rb-standings tbody tr:hover{background:rgba(8,199,201,.07)}
#leagueView .rb-standings tbody tr:focus-visible{outline:1px solid #08c7c9;outline-offset:-1px}
#leagueView .rb-standings tbody tr.mine td:first-child{box-shadow:inset 3px 0 0 #08c7c9}
#leagueView .rb-standings .rank{color:#8e9aae;font-weight:900;width:28px}
#leagueView .rb-standings .tcell{display:flex;align-items:center;gap:10px}
#leagueView .rb-standings .tav{width:30px;height:30px;flex:0 0 30px;border-radius:50%;object-fit:cover;background:#2a3648;display:inline-flex;align-items:center;justify-content:center;color:#c7d2e2;font-size:12px;font-weight:900;overflow:hidden}
#leagueView .rb-standings .tname{font-weight:900;color:#eef4ff}
#leagueView .rb-standings .owner{color:#8190a5;font-size:9px;margin-top:2px}
`;
  const COLS=[
    {key:'rank',label:'Rank',num:false,title:'Standings rank (record, then points for)'},
    {key:'team',label:'Team',num:false,title:'Team name'},
    {key:'record',label:'W-L',num:true,title:'Wins and losses'},
    {key:'pf',label:'PF',num:true,title:'Points for'},
    {key:'pa',label:'PA',num:true,title:'Points against'}
  ];
  let sort={key:'rank',dir:'asc'};
  try{const s=JSON.parse(sessionStorage.getItem('rbStandingsSort')||'null');if(s?.key&&COLS.some(c=>c.key===s.key))sort=s}catch{}

  const esc3=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pts=(s,k)=>Number(s?.[k]||0)+Number(s?.[`${k}_decimal`]||0)/100;
  function rows(){
    const list=(currentData?.teams||[]).map(t=>{const s=t.settings||{};return{t,rid:Number(t.roster_id),w:Number(s.wins||0),l:Number(s.losses||0),tie:Number(s.ties||0),pf:pts(s,'fpts'),pa:pts(s,'fpts_against')}});
    // Official order: best record (win %), then points for.
    const pct=r=>{const g=r.w+r.l+r.tie;return g?(r.w+r.tie/2)/g:0};
    list.sort((a,b)=>pct(b)-pct(a)||b.w-a.w||b.pf-a.pf);
    list.forEach((r,i)=>r.rank=i+1);
    const dir=sort.dir==='asc'?1:-1;
    const val={rank:r=>r.rank,team:r=>String(r.t.team_name||'').toLowerCase(),record:r=>pct(r)*1000+r.w,pf:r=>r.pf,pa:r=>r.pa}[sort.key]||(r=>r.rank);
    return list.slice().sort((a,b)=>{const x=val(a),y=val(b);return (x<y?-1:x>y?1:0)*dir||a.rank-b.rank});
  }
  function avatarUrl(t){const raw=t?.avatar_url??t?.avatar??t?.metadata?.avatar_url??t?.metadata?.avatar??'';if(!raw)return'';const s=String(raw);return /^https?:\/\//i.test(s)?s:`https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(s)}`}
  function avatarHtml(t){const url=avatarUrl(t),initial=esc3(String(t?.team_name||t?.display_name||'?').trim().charAt(0).toUpperCase());return url?`<img class="tav" src="${esc3(url)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;tav&quot;>${initial}</span>'">`:`<span class="tav">${initial}</span>`}
  function linkedRoster(){try{const uid=String(localStorage.getItem('rbSleeperLinkedUserId')||'');return Number((currentData?.teams||[]).find(t=>String(t.owner_id||'')===uid)?.roster_id||0)}catch{return 0}}
  function render(){
    const host=document.getElementById('leagueView');if(!host||!currentData)return;
    const mine=linkedRoster();
    const head=COLS.map(c=>{const active=sort.key===c.key;const aria=active?(sort.dir==='asc'?'ascending':'descending'):'none';return`<th class="${c.num?'num':''}" aria-sort="${aria}" title="${esc3(c.title)}"><button type="button" data-sort="${c.key}">${c.label}${active?`<span class="arrow">${sort.dir==='asc'?'▲':'▼'}</span>`:''}</button></th>`}).join('');
    const body=rows().map(r=>`<tr tabindex="0" data-roster="${r.rid}" class="${r.rid===mine?'mine':''}" title="Open ${esc3(r.t.team_name)}"><td class="rank">${r.rank}</td><td><div class="tcell">${avatarHtml(r.t)}<div><div class="tname">${esc3(r.t.team_name)}</div><div class="owner">${esc3(r.t.display_name)}</div></div></div></td><td class="num">${r.w}-${r.l}${r.tie?`-${r.tie}`:''}</td><td class="num">${r.pf.toFixed(1)}</td><td class="num">${r.pa.toFixed(1)}</td></tr>`).join('');
    host.innerHTML=`<div class="league-card"><h3>League Standings</h3><table class="rb-standings"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function openTeam(rid){
    try{
      currentView='team';
      const picker=document.getElementById('teamPicker');
      if(picker&&[...picker.options].some(o=>Number(o.value)===rid)){picker.value=String(rid);picker.dispatchEvent(new Event('change',{bubbles:true}))}
      else{selectedRoster=rid;try{clearSelection()}catch{}window.render?.()}
      window.scrollTo?.({top:0,behavior:'smooth'});
    }catch{}
  }
  function install(){
    if(document.getElementById('rbStandingsStyle'))return;
    const s=document.createElement('style');s.id='rbStandingsStyle';s.textContent=css;document.head.appendChild(s);
    try{if(typeof renderLeague==='function'&&!renderLeague.__rbStandings){const w=function(){render()};w.__rbStandings=true;renderLeague=w;window.renderLeague=w}}catch{}
    const host=document.getElementById('leagueView');
    host?.addEventListener('click',e=>{
      const b=e.target.closest?.('button[data-sort]');
      if(b){const k=b.dataset.sort;sort=sort.key===k?{key:k,dir:sort.dir==='asc'?'desc':'asc'}:{key:k,dir:['pf','pa','record'].includes(k)?'desc':'asc'};try{sessionStorage.setItem('rbStandingsSort',JSON.stringify(sort))}catch{}render();host.querySelector(`button[data-sort="${k}"]`)?.focus();return}
      const tr=e.target.closest?.('tr[data-roster]');if(tr)openTeam(Number(tr.dataset.roster));
    });
    host?.addEventListener('keydown',e=>{const tr=e.target.closest?.('tr[data-roster]');if(tr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openTeam(Number(tr.dataset.roster))}});
    if(document.querySelector('#leagueView .league-card'))render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
