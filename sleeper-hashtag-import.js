(()=>{
  const STORAGE_PREFIX='rbHashtagProjV1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const normTeam=s=>String(s||'').trim().toUpperCase().replace(/^PHO$/,'PHX').replace(/^BRK$/,'BKN').replace(/^CHO$/,'CHA').replace(/^GS$/,'GSW').replace(/^NO$/,'NOP').replace(/^NY$/,'NYK').replace(/^SA$/,'SAS');
  const key=()=>`${STORAGE_PREFIX}:${typeof leagueId!=='undefined'?leagueId:'league'}:${currentData?.league?.season||''}`;
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:null};

  function scoringValue(scoring,names){for(const n of names){const v=Number(scoring?.[n]);if(Number.isFinite(v))return v}return 0}
  function fantasyPoints(row){
    const s=currentData?.league?.scoring_settings||{};
    const mult={
      pts:scoringValue(s,['pts','points']),
      reb:scoringValue(s,['reb','rebs','rebounds']),
      ast:scoringValue(s,['ast','assists']),
      stl:scoringValue(s,['stl','steals']),
      blk:scoringValue(s,['blk','blocks']),
      tpm:scoringValue(s,['tpm','fg3m','3pm']),
      to:scoringValue(s,['to','tov','turnovers']),
      dd:scoringValue(s,['dd','double_double','double_doubles']),
      td:scoringValue(s,['td','triple_double','triple_doubles'])
    };
    const vals={pts:row.pts,reb:row.reb,ast:row.ast,stl:row.stl,blk:row.blk,tpm:row.tpm,to:row.to,dd:row.dd,td:row.td};
    let total=0,used=0;
    for(const k of Object.keys(vals)){if(vals[k]!=null&&mult[k]!==0){total+=vals[k]*mult[k];used++}}
    return used?Math.round(total*100)/100:row.total;
  }

  function parse(html){
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    const table=doc.querySelector('#ContentPlaceHolder1_GridView1');
    if(!table)throw new Error('Hashtag projection table was not found. Paste the full authenticated projection-page HTML.');
    const heads=[...table.querySelectorAll('tr:first-child th')].map(x=>x.textContent.trim().toUpperCase());
    const idx=name=>heads.indexOf(name);
    const required=['NAME','TEAM','TOTAL','GP','PTS','TREB','AST','STL','BLK','3PM','TO'];
    const missing=required.filter(x=>idx(x)<0);
    if(missing.length)throw new Error(`Missing Hashtag columns: ${missing.join(', ')}`);
    const rows=[];
    for(const tr of [...table.querySelectorAll('tr')].slice(1)){
      const td=[...tr.children]; if(td.length<heads.length)continue;
      const name=(td[idx('NAME')]?.querySelector('[title="NAME"]')?.textContent||td[idx('NAME')]?.textContent||'').trim();
      const team=(td[idx('TEAM')]?.querySelector('[title="TEAM"]')?.textContent||td[idx('TEAM')]?.textContent||'').trim();
      if(!name||!team)continue;
      rows.push({
        rank:num(td[idx('R#')]?.textContent),name,team:normTeam(team),
        total:num(td[idx('TOTAL')]?.textContent),gp:num(td[idx('GP')]?.textContent),
        pts:num(td[idx('PTS')]?.textContent),reb:num(td[idx('TREB')]?.textContent),ast:num(td[idx('AST')]?.textContent),
        stl:num(td[idx('STL')]?.textContent),blk:num(td[idx('BLK')]?.textContent),tpm:num(td[idx('3PM')]?.textContent),
        to:num(td[idx('TO')]?.textContent),dd:idx('DD')>=0?num(td[idx('DD')]?.textContent):null,td:idx('TD')>=0?num(td[idx('TD')]?.textContent):null
      });
    }
    if(!rows.length)throw new Error('No projection rows were parsed.');
    return rows;
  }

  function matchPlayers(rows){
    const byName=new Map();
    for(const [id,p] of Object.entries(currentData?.players||{})){
      const n=normName(p?.full_name); if(!n)continue;
      if(!byName.has(n))byName.set(n,[]);byName.get(n).push({id:String(id),team:normTeam(p?.team),p});
    }
    const matched={},unmatched=[];
    for(const row of rows){
      const candidates=byName.get(normName(row.name))||[];
      const exact=candidates.find(x=>x.team===row.team)||candidates[0];
      if(!exact){unmatched.push(row.name);continue}
      matched[exact.id]={...row,points:fantasyPoints(row)};
    }
    return{matched,unmatched};
  }

  function buildProjectionMap(matched){
    const out={};
    for(const [id,row] of Object.entries(matched)){
      const p=currentData?.players?.[id]; if(!p?.team)continue;
      const games=(currentData?.schedule||[]).filter(g=>!g.calendar_only&&(g.home===p.team||g.away===p.team));
      out[id]={week_points:Math.round(games.length*Number(row.points||0)*100)/100,source:'hashtag',hashtag_total:row.total,hashtag_stats:{pts:row.pts,reb:row.reb,ast:row.ast,stl:row.stl,blk:row.blk,tpm:row.tpm,to:row.to,dd:row.dd,td:row.td},games:games.map(g=>({game_id:String(g.game_id||''),date:g.date,points:row.points,stats:{pts:row.pts,reb:row.reb,ast:row.ast,stl:row.stl,blk:row.blk,tpm:row.tpm,to:row.to,dd:row.dd,td:row.td},source:'hashtag'}))};
    }
    return out;
  }

  function save(data){localStorage.setItem(key(),JSON.stringify(data))}
  function loadSaved(){try{return JSON.parse(localStorage.getItem(key())||'null')}catch{return null}}
  function apply(data,rerender=true){
    if(!currentData||!data?.projections)return false;
    currentData.projections={...(currentData.projections||{}),...data.projections};
    window.rbHashtagProjectionMeta=data;
    if(rerender){try{render()}catch{try{renderTeam();renderActivity()}catch{}}}
    updateButton();
    return true;
  }

  function ensureStyle(){if(document.getElementById('rbHashtagStyle'))return;const s=document.createElement('style');s.id='rbHashtagStyle';s.textContent=`
.rb-hashtag-btn{height:28px;border:1px solid #8e6621;background:#4c3917;color:#ffd66d;border-radius:6px;padding:0 9px;font-size:8px;font-weight:900}.rb-hashtag-btn.active{border-color:#30d8a0;background:#173f34;color:#8ff2cf}.rb-hashtag-note{font-size:9px;color:#97a7bb;line-height:1.45;margin-bottom:9px}.rb-hashtag-modal textarea{width:100%;min-height:250px;resize:vertical;background:#141d2a;color:#dfe8f4;border:1px solid #3d4d65;border-radius:7px;padding:9px;font:9px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace}.rb-hashtag-summary{margin-top:8px;padding:8px;border-radius:6px;background:#172230;color:#9fb0c5;font-size:9px}`;document.head.appendChild(s)}

  function updateButton(){const b=document.getElementById('rbHashtagBtn');if(!b)return;const d=loadSaved()||window.rbHashtagProjectionMeta;b.classList.toggle('active',!!d);b.textContent=d?`Hashtag ✓ ${d.matched??Object.keys(d.players||d.projections||{}).length}`:'Hashtag Projections'}
  function ensureButton(){
    ensureStyle();
    const host=document.querySelector('#teamView .team-top .week-nav')||document.querySelector('.league-head .head-actions');
    if(!host||document.getElementById('rbHashtagBtn')){updateButton();return}
    const b=document.createElement('button');b.id='rbHashtagBtn';b.className='rb-hashtag-btn';b.type='button';b.textContent='Hashtag Projections';b.addEventListener('click',openImport);host.prepend(b);updateButton();
  }

  function openImport(){
    const old=document.getElementById('rbHashtagBackdrop');if(old)old.remove();
    const wrap=document.createElement('div');wrap.id='rbHashtagBackdrop';wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal rb-hashtag-modal"><div class="modal-head"><span>Import Hashtag Basketball Projections</span><button class="modal-close">×</button></div><div class="modal-body"><div class="rb-hashtag-note">While logged into Hashtag Basketball, copy the HTML response from the premium Points League Projections page and paste it here. Your Hashtag password is never stored or sent to RosterBate.</div><textarea id="rbHashtagHtml" placeholder="Paste the authenticated Hashtag Basketball HTML here..."></textarea><div id="rbHashtagResult" class="rb-hashtag-summary">Expected columns: NAME, TEAM, TOTAL, GP, PTS, TREB, AST, STL, BLK, 3PM, TO, DD, TD.</div></div><div class="modal-actions"><button id="rbHashtagClear" class="danger">Clear Import</button><button data-close>Cancel</button><button id="rbHashtagApply" class="primary">Import Projections</button></div></section>`;
    document.body.appendChild(wrap);
    const close=()=>wrap.remove();wrap.querySelector('.modal-close').onclick=close;wrap.querySelector('[data-close]').onclick=close;wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
    wrap.querySelector('#rbHashtagClear').onclick=()=>{localStorage.removeItem(key());window.rbHashtagProjectionMeta=null;close();location.reload()};
    wrap.querySelector('#rbHashtagApply').onclick=()=>{
      const result=wrap.querySelector('#rbHashtagResult');
      try{
        const rows=parse(wrap.querySelector('#rbHashtagHtml').value);const {matched,unmatched}=matchPlayers(rows);const projections=buildProjectionMap(matched);
        const data={version:1,source:'hashtag-basketball',importedAt:new Date().toISOString(),season:currentData?.league?.season||'',leagueId:String(leagueId),rows:rows.length,matched:Object.keys(projections).length,unmatched:unmatched.slice(0,30),projections};
        save(data);apply(data,true);result.textContent=`Imported ${data.matched} of ${data.rows} Hashtag players.${unmatched.length?` ${unmatched.length} unmatched.`:''}`;setTimeout(close,700);
      }catch(e){result.textContent=`Import failed: ${e?.message||e}`}
    };
  }

  function restore(){const d=loadSaved();if(d)apply(d,false);ensureButton()}
  const patch=()=>{if(typeof renderTeam==='function'&&!renderTeam.__rbHashtag){const orig=renderTeam;renderTeam=function(){const r=orig.apply(this,arguments);ensureButton();return r};renderTeam.__rbHashtag=true}restore()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(patch,0),{once:true});else setTimeout(patch,0);
  window.addEventListener('rb:data-loaded',restore);
})();