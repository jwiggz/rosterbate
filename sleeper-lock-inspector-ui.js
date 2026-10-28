(()=>{
  const escHtml=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function auth(){try{return sessionStorage.getItem('rbSleeperToken')||sessionStorage.getItem('rbSleeperAuth')||''}catch{return''}}
  function host(){return document.getElementById('activityBody')}
  function ensure(){
    const h=host();if(!h)return null;let el=document.getElementById('rbSleeperInspector');if(el)return el;
    el=document.createElement('div');el.id='rbSleeperInspector';el.className='activity';el.innerHTML='<strong>Sleeper Lock Inspector</strong><br><span style="color:#8fa0b8">Read-only check of Sleeper\'s live private matchup schema.</span><div style="margin-top:7px"><button id="rbRunLockInspect" class="mini-btn" type="button">Inspect Sleeper</button></div><div id="rbLockInspectOut" style="margin-top:7px;color:#9aa9bd;font-size:9px;line-height:1.45"></div>';h.appendChild(el);el.querySelector('#rbRunLockInspect')?.addEventListener('click',run);return el;
  }
  async function run(){
    const el=ensure(),out=el?.querySelector('#rbLockInspectOut'),btn=el?.querySelector('#rbRunLockInspect');if(!out)return;
    const token=auth();if(!token){out.textContent='Connect Sleeper first.';return}
    if(btn){btn.disabled=true;btn.textContent='Inspecting…'}out.textContent='Reading Sleeper schema and matchup leg…';
    try{
      const r=await fetch('/.netlify/functions/sleeper-lock-inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,leagueId,rosterId:selectedRoster,round:selectedWeek,leg:selectedWeek})});
      const d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||'Inspection failed');
      const names=(d.candidateFields||[]).map(x=>x.name).join(', '),queries=(d.candidateQueries||[]).join(', '),mutations=(d.candidateMutations||[]).join(', ');
      const row=JSON.stringify(d.row||{},null,2),probes=JSON.stringify(d.probes||{},null,2),schema=JSON.stringify({allMatchupLegFields:d.allFields||[],update_matchup_leg:d.updateMatchupLeg||null,eventFields:d.eventFields||[]},null,2);
      out.innerHTML=`<div><b style="color:#e7edf6">Type:</b> ${escHtml(d.matchupLegType||'unknown')}</div><div><b style="color:#e7edf6">Candidate fields:</b> ${escHtml(names||'none')}</div><div style="margin-top:5px"><b style="color:#e7edf6">Lock-related queries:</b> ${escHtml(queries||'none')}</div><div style="margin-top:5px"><b style="color:#e7edf6">Lock-related mutations:</b> ${escHtml(mutations||'none')}</div><details style="margin-top:6px"><summary style="cursor:pointer;color:#6ee7e7;font-weight:800">Show raw Sleeper matchup state</summary><pre style="white-space:pre-wrap;word-break:break-word;background:#151e2b;border:1px solid #344157;border-radius:6px;padding:8px;max-height:360px;overflow:auto;color:#d5deea">${escHtml(row)}</pre></details><details style="margin-top:6px"><summary style="cursor:pointer;color:#f3c75b;font-weight:800">Show raw/related matchup probes</summary><pre style="white-space:pre-wrap;word-break:break-word;background:#151e2b;border:1px solid #344157;border-radius:6px;padding:8px;max-height:420px;overflow:auto;color:#d5deea">${escHtml(probes)}</pre></details><details style="margin-top:6px"><summary style="cursor:pointer;color:#b6a1ff;font-weight:800">Show full matchup/event schema</summary><pre style="white-space:pre-wrap;word-break:break-word;background:#151e2b;border:1px solid #344157;border-radius:6px;padding:8px;max-height:420px;overflow:auto;color:#d5deea">${escHtml(schema)}</pre></details>${d.queryError?`<div style="margin-top:6px;color:#ff9aaa">Leaf query error: ${escHtml(d.queryError.message||'unknown')}</div>`:''}`;
    }catch(e){out.innerHTML=`<span style="color:#ff9aaa">${escHtml(e.message||String(e))}</span>`}finally{if(btn){btn.disabled=false;btn.textContent='Inspect Sleeper'}}
  }
  const observer=new MutationObserver(()=>ensure());
  const start=()=>{ensure();const h=host();if(h)observer.observe(h,{childList:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
