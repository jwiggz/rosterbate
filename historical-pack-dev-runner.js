(function(global){
  'use strict';

  const isBrowser=typeof document!=='undefined';
  const hostname=(global.location && global.location.hostname) || '';
  const enabled=isBrowser && (hostname==='localhost' || hostname==='127.0.0.1');
  const dependencyDefs=[
    {key:'validator', globalName:'RosterBateHistoricalPackValidator', file:'historical-pack-validator.js'},
    {key:'fixtures', globalName:'RosterBateHistoricalPackFixtures', file:'historical-pack-fixtures.js'},
    {key:'importer', globalName:'RosterBateHistoricalPackImporter', file:'historical-pack-importer.js'}
  ];

  const currentScript=isBrowser ? document.currentScript : null;
  const baseUrl=currentScript && currentScript.src ? currentScript.src.replace(/[^/]+$/,'') : '';
  let initPromise=null;
  let helpAnnounced=false;
  let panelReady=false;

  const PANEL_STYLE_ID='rbHistoricalDevPanelStyle';
  const PANEL_ROOT_ID='rbHistoricalDevPanel';
  const DEFAULT_FIXTURE_ID='nba_1996_full_season_v1';
  const LOCAL_STATE_KEY='rbHistoricalPackDevLocalState';
  const PENDING_BOOT_KEY='rbHistoricalPackDevPendingSeasonBoot';
  const TEAM_SELECTION_KEY='rbHistoricalPackDevSelectedTeamId';
  const TEAM_SELECT_ID=PANEL_ROOT_ID+'_teamSelect';
  const FIXTURE_META_ID=PANEL_ROOT_ID+'_fixtureMeta';

  function resolveUrl(file){
    try{
      return baseUrl ? String(new URL(file, baseUrl)) : file;
    }catch(e){
      return file;
    }
  }

  function dependencyLoaded(dep){
    return !!global[dep.globalName];
  }

  function loadScript(src){
    return new Promise(function(resolve, reject){
      if(!isBrowser) return reject(new Error('browser_environment_required'));
      const existing=[].slice.call(document.scripts || []).find(function(script){
        return script && script.src===src;
      });
      if(existing){
        if(existing.dataset.rbLoaded==='true' || existing.readyState==='complete') return resolve();
        existing.addEventListener('load', function(){ resolve(); }, {once:true});
        existing.addEventListener('error', function(){ reject(new Error('script_load_failed:'+src)); }, {once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.defer=true;
      script.dataset.rbHistoricalDev='true';
      script.addEventListener('load', function(){
        script.dataset.rbLoaded='true';
        resolve();
      }, {once:true});
      script.addEventListener('error', function(){
        reject(new Error('script_load_failed:'+src));
      }, {once:true});
      document.head.appendChild(script);
    });
  }

  function loadDependency(dep){
    if(dependencyLoaded(dep)) return Promise.resolve(global[dep.globalName]);
    return loadScript(resolveUrl(dep.file)).then(function(){
      if(!dependencyLoaded(dep)) throw new Error('dependency_not_available:'+dep.globalName);
      return global[dep.globalName];
    });
  }

  function ensureReady(){
    if(!enabled){
      return Promise.resolve({
        status:'disabled',
        message:'Historical pack dev runner only enables itself on localhost.'
      });
    }
    if(initPromise) return initPromise;
    initPromise=dependencyDefs.reduce(function(chain, dep){
      return chain.then(function(){ return loadDependency(dep); });
    }, Promise.resolve()).then(function(){
      if(!helpAnnounced && global.console && typeof global.console.info==='function'){
        helpAnnounced=true;
        global.console.info('[RosterBate dev] Historical pack runner ready. Try `rbHistoricalPackDev.help()`.');
      }
      return api;
    });
    return initPromise;
  }

  async function getDependencies(){
    await ensureReady();
    return {
      validator: global.RosterBateHistoricalPackValidator,
      fixtures: global.RosterBateHistoricalPackFixtures,
      importer: global.RosterBateHistoricalPackImporter
    };
  }

  function disabledResponse(){
    return {
      status:'disabled',
      message:'Historical pack dev runner is only active on localhost.'
    };
  }

  function ensurePanelStyles(){
    if(!isBrowser || document.getElementById(PANEL_STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=PANEL_STYLE_ID;
    style.textContent=
      '#'+PANEL_ROOT_ID+'{position:fixed;right:18px;bottom:18px;z-index:99999;font-family:IBM Plex Sans,Segoe UI,Arial,sans-serif;color:#f6efe6;pointer-events:none;}'+
      '#'+PANEL_ROOT_ID+' *{box-sizing:border-box;}'+
      '#'+PANEL_ROOT_ID+' .rbh-shell{width:min(332px,calc(100vw - 32px));border:1px solid rgba(255,164,76,.34);border-radius:18px;background:linear-gradient(180deg,rgba(10,15,28,.96),rgba(8,12,22,.92));box-shadow:0 22px 50px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.03) inset;backdrop-filter:blur(18px);pointer-events:auto;overflow:hidden;}'+
      '#'+PANEL_ROOT_ID+' .rbh-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:12px 14px;border:0;background:linear-gradient(135deg,rgba(255,146,44,.18),rgba(122,76,255,.14));color:#fff7ea;cursor:pointer;font:700 13px/1.1 IBM Plex Sans,Segoe UI,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;}'+
      '#'+PANEL_ROOT_ID+' .rbh-toggle:hover{background:linear-gradient(135deg,rgba(255,146,44,.25),rgba(122,76,255,.2));}'+
      '#'+PANEL_ROOT_ID+' .rbh-toggle-badge{display:inline-flex;align-items:center;gap:8px;}'+
      '#'+PANEL_ROOT_ID+' .rbh-dot{width:9px;height:9px;border-radius:999px;background:#58e6a3;box-shadow:0 0 0 4px rgba(88,230,163,.12),0 0 16px rgba(88,230,163,.42);}'+
      '#'+PANEL_ROOT_ID+' .rbh-toggle-meta{font-size:11px;font-weight:600;letter-spacing:.04em;color:rgba(220,233,255,.72);}'+
      '#'+PANEL_ROOT_ID+' .rbh-body{display:none;padding:14px 14px 12px;border-top:1px solid rgba(255,255,255,.06);}'+
      '#'+PANEL_ROOT_ID+'[data-open="true"] .rbh-body{display:block;}'+
      '#'+PANEL_ROOT_ID+' .rbh-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;}'+
      '#'+PANEL_ROOT_ID+' .rbh-title strong{display:block;font:700 21px/1 Teko,Impact,sans-serif;letter-spacing:.03em;text-transform:uppercase;color:#fffaf1;}'+
      '#'+PANEL_ROOT_ID+' .rbh-title span{display:block;margin-top:4px;font:500 11px/1.4 IBM Plex Sans,Segoe UI,Arial,sans-serif;color:rgba(199,214,239,.78);}'+
      '#'+PANEL_ROOT_ID+' .rbh-status{margin-bottom:12px;padding:10px 11px;border-radius:13px;border:1px solid rgba(255,255,255,.06);background:linear-gradient(180deg,rgba(18,27,46,.95),rgba(12,18,31,.95));font:600 12px/1.45 IBM Plex Sans,Segoe UI,Arial,sans-serif;color:#dfe9f7;}'+
      '#'+PANEL_ROOT_ID+' .rbh-status strong{color:#ffffff;}'+
      '#'+PANEL_ROOT_ID+' .rbh-status[data-tone="warn"]{border-color:rgba(255,179,86,.28);color:#ffe2b8;}'+
      '#'+PANEL_ROOT_ID+' .rbh-status[data-tone="error"]{border-color:rgba(255,107,107,.3);color:#ffd1d1;}'+
      '#'+PANEL_ROOT_ID+' .rbh-status[data-tone="success"]{border-color:rgba(83,233,162,.26);color:#d8ffef;}'+
      '#'+PANEL_ROOT_ID+' .rbh-select-shell{margin-bottom:12px;padding:10px 11px 11px;border-radius:13px;border:1px solid rgba(255,255,255,.06);background:linear-gradient(180deg,rgba(14,21,34,.94),rgba(11,16,27,.94));}'+
      '#'+PANEL_ROOT_ID+' .rbh-select-label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;font:700 10px/1 IBM Plex Sans,Segoe UI,Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:rgba(186,205,236,.82);}'+
      '#'+PANEL_ROOT_ID+' .rbh-select-hint{font:600 9px/1 IBM Plex Sans,Segoe UI,Arial,sans-serif;letter-spacing:.06em;color:rgba(255,186,125,.82);}'+
      '#'+PANEL_ROOT_ID+' .rbh-select{width:100%;padding:11px 38px 11px 12px;border-radius:12px;border:1px solid rgba(255,164,76,.22);background:linear-gradient(135deg,rgba(24,35,59,.96),rgba(15,21,34,.96));color:#f7f6ef;outline:none;font:700 13px/1.1 IBM Plex Sans,Segoe UI,Arial,sans-serif;appearance:none;background-image:linear-gradient(45deg,transparent 50%,#ffbd78 50%),linear-gradient(135deg,#ffbd78 50%,transparent 50%);background-position:calc(100% - 18px) 16px,calc(100% - 12px) 16px;background-size:6px 6px,6px 6px;background-repeat:no-repeat;}'+
      '#'+PANEL_ROOT_ID+' .rbh-select:focus{border-color:rgba(255,186,125,.45);box-shadow:0 0 0 3px rgba(255,164,76,.12);}'+
      '#'+PANEL_ROOT_ID+' .rbh-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;}'+
      '#'+PANEL_ROOT_ID+' .rbh-btn{padding:10px 9px;border-radius:12px;border:1px solid rgba(124,151,198,.24);background:linear-gradient(180deg,rgba(29,39,62,.95),rgba(19,26,43,.95));color:#f5f8fd;cursor:pointer;font:700 11px/1.1 IBM Plex Sans,Segoe UI,Arial,sans-serif;letter-spacing:.07em;text-transform:uppercase;transition:transform .16s ease,border-color .16s ease,background .16s ease;}'+
      '#'+PANEL_ROOT_ID+' .rbh-btn:hover{transform:translateY(-1px);border-color:rgba(255,164,76,.4);}'+
      '#'+PANEL_ROOT_ID+' .rbh-btn:disabled{opacity:.55;cursor:default;transform:none;}'+
      '#'+PANEL_ROOT_ID+' .rbh-btn--accent{background:linear-gradient(135deg,#ff922c,#ffb25f);color:#20160b;border-color:rgba(255,193,123,.6);}'+
      '#'+PANEL_ROOT_ID+' .rbh-btn--success{background:linear-gradient(135deg,#4fe0a2,#8df0c0);color:#072418;border-color:rgba(143,255,205,.52);}'+
      '#'+PANEL_ROOT_ID+' .rbh-btn--ghost{background:linear-gradient(180deg,rgba(16,23,37,.9),rgba(11,16,26,.95));color:#bcd0ef;}'+
      '#'+PANEL_ROOT_ID+' .rbh-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:8px;border-top:1px solid rgba(255,255,255,.05);}'+
      '#'+PANEL_ROOT_ID+' .rbh-footnote{font:600 10px/1.45 IBM Plex Sans,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:rgba(161,183,219,.74);}'+
      '#'+PANEL_ROOT_ID+' .rbh-link{border:0;background:none;color:#8ec8ff;cursor:pointer;font:700 11px/1 IBM Plex Sans,Segoe UI,Arial,sans-serif;padding:0;}'+
      '#'+PANEL_ROOT_ID+' .rbh-link:hover{color:#ffd0a2;}';
    document.head.appendChild(style);
  }

  function panelNode(id){
    return isBrowser ? document.getElementById(id) : null;
  }

  function setPanelOpen(open){
    const root=panelNode(PANEL_ROOT_ID);
    if(!root) return;
    const toggle=root.querySelector('[data-role="toggle"]');
    root.dataset.open=open ? 'true' : 'false';
    if(toggle){
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      const meta=toggle.querySelector('[data-role="toggle-meta"]');
      if(meta) meta.textContent=open ? 'Hide' : 'Open';
    }
  }

  function setPanelBusy(busy){
    const root=panelNode(PANEL_ROOT_ID);
    if(!root) return;
    root.querySelectorAll('[data-role="action"]').forEach(function(button){
      button.disabled=!!busy;
    });
  }

  function setPanelStatus(text, tone){
    const status=panelNode(PANEL_ROOT_ID+'_status');
    if(!status) return;
    status.dataset.tone=tone || 'neutral';
    status.innerHTML=text;
  }

  function formatResultSummary(result){
    if(!result || typeof result!=='object') return 'No result returned.';
    const status=result.status || 'unknown';
    const validationStatus=result.validation && result.validation.status ? result.validation.status : '';
    const summary=result.importPlan && result.importPlan.summary ? result.importPlan.summary : (result.validation && result.validation.summary ? result.validation.summary : null);
    const pieces=['<strong>'+status+'</strong>'];
    if(validationStatus) pieces.push('Validation: '+validationStatus);
    if(summary){
      const counts=[
        summary.teamCount!=null ? summary.teamCount+' teams' : '',
        summary.playerCount!=null ? summary.playerCount+' players' : '',
        summary.gameCount!=null ? summary.gameCount+' games' : '',
        summary.playerGameStatCount!=null ? summary.playerGameStatCount+' stat rows' : ''
      ].filter(Boolean);
      if(counts.length) pieces.push(counts.join(' • '));
    }
    if(result.message) pieces.push(result.message);
    if(result.writerError) pieces.push('Writer error: '+result.writerError);
    return pieces.join('<br>');
  }

  function localStorageAvailable(){
    return isBrowser && typeof global.localStorage!=='undefined';
  }

  function getPersistedSelectedTeamId(){
    if(!localStorageAvailable()) return '';
    return String(global.localStorage.getItem(TEAM_SELECTION_KEY) || '').trim();
  }

  function persistSelectedTeamId(teamId){
    if(!localStorageAvailable()) return '';
    const normalized=String(teamId || '').trim();
    if(normalized) global.localStorage.setItem(TEAM_SELECTION_KEY, normalized);
    else global.localStorage.removeItem(TEAM_SELECTION_KEY);
    return normalized;
  }

  function getPanelSelectedTeamId(){
    const select=panelNode(TEAM_SELECT_ID);
    return String((select && select.value) || getPersistedSelectedTeamId() || '').trim();
  }

  function getSelectedTeamLabel(){
    const select=panelNode(TEAM_SELECT_ID);
    if(!select) return '';
    const option=select.options && select.selectedIndex>=0 ? select.options[select.selectedIndex] : null;
    return option ? String(option.textContent || '').trim() : '';
  }

  function buildLocalStatePayload(importResult, options){
    const importPlan=importResult && importResult.importPlan ? importResult.importPlan : null;
    const summary=importPlan && importPlan.summary ? importPlan.summary : null;
    const selectedTeamId=String(options && options.selectedTeamId || '').trim();
    return {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      source: 'historical-pack-dev-runner',
      packId: importPlan && importPlan.metadata ? importPlan.metadata.packId : null,
      seasonId: importPlan && importPlan.metadata ? importPlan.metadata.seasonId : null,
      selectedTeamId: selectedTeamId || null,
      validationStatus: importResult && importResult.validation ? importResult.validation.status : null,
      summary: summary,
      importPlan: importPlan
    };
  }

  function writeImportToLocalState(importResult, options){
    if(!localStorageAvailable()){
      throw new Error('local_storage_unavailable');
    }
    const payload=buildLocalStatePayload(importResult, options);
    const selectedTeamId=persistSelectedTeamId(payload.selectedTeamId);
    global.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(payload));
    global.localStorage.setItem(PENDING_BOOT_KEY, JSON.stringify({
      packId: payload.packId,
      seasonId: payload.seasonId,
      selectedTeamId: selectedTeamId || null,
      savedAt: payload.savedAt,
      source: payload.source
    }));
    return {
      key: LOCAL_STATE_KEY,
      pendingBootKey: PENDING_BOOT_KEY,
      savedAt: payload.savedAt,
      packId: payload.packId,
      seasonId: payload.seasonId,
      selectedTeamId: selectedTeamId || null,
      summary: payload.summary
    };
  }

  function readAppliedLocalState(){
    if(!localStorageAvailable()) return null;
    const raw=global.localStorage.getItem(LOCAL_STATE_KEY);
    if(!raw) return null;
    try{
      return JSON.parse(raw);
    }catch(error){
      return {
        status: 'invalid_local_state',
        key: LOCAL_STATE_KEY,
        error: error && error.message ? error.message : String(error),
        raw: raw
      };
    }
  }

  function clearAppliedLocalState(){
    if(!localStorageAvailable()) return false;
    global.localStorage.removeItem(LOCAL_STATE_KEY);
    global.localStorage.removeItem(PENDING_BOOT_KEY);
    return true;
  }

  function buildTeamOptionMarkup(team){
    const label=team.displayName || [team.city, team.name].filter(Boolean).join(' ') || team.teamId;
    const abbr=String(team.abbreviation || '').trim().toUpperCase();
    return '<option value="'+String(team.teamId)+'">'+label+(abbr ? ' ('+abbr+')' : '')+'</option>';
  }

  async function syncPanelFixtureContext(){
    if(!enabled || !panelReady) return null;
    try{
      const deps=await getDependencies();
      const fixture=deps.fixtures.getFixtureById(DEFAULT_FIXTURE_ID);
      if(!fixture) return null;
      const teams=Array.isArray(fixture.teams) ? fixture.teams.slice() : [];
      const players=Array.isArray(fixture.players) ? fixture.players : [];
      const select=panelNode(TEAM_SELECT_ID);
      const fixtureMeta=panelNode(FIXTURE_META_ID);
      const fallback=String((fixture.presentation && fixture.presentation.featuredTeamId) || (teams[0] && teams[0].teamId) || '').trim();
      const preferred=String(getPersistedSelectedTeamId() || fallback).trim();
      if(select){
        select.innerHTML=teams.map(buildTeamOptionMarkup).join('');
        const selectedExists=teams.some(function(team){ return String(team.teamId)===preferred; });
        select.value=selectedExists ? preferred : String((teams[0] && teams[0].teamId) || '');
        persistSelectedTeamId(select.value);
      }
      if(fixtureMeta){
        fixtureMeta.textContent='Fixture: '+DEFAULT_FIXTURE_ID+' • '+teams.length+' teams • '+players.length+' players';
      }
      return fixture;
    }catch(error){
      if(global.console && typeof global.console.warn==='function'){
        global.console.warn('[RosterBate dev] Failed to sync fixture context:', error && error.message ? error.message : error);
      }
      return null;
    }
  }

  async function runPanelAction(action){
    try{
      setPanelBusy(true);
      if(action==='ready'){
        const result=await api.ready();
        await syncPanelFixtureContext();
        setPanelStatus(formatResultSummary(result), result.status==='ready' ? 'success' : (result.status==='error' ? 'error' : 'warn'));
        return;
      }
      if(action==='fixture'){
        const fixture=await api.getFixture(DEFAULT_FIXTURE_ID);
        const playerCount=fixture && Array.isArray(fixture.players) ? fixture.players.length : 0;
        const teamCount=fixture && Array.isArray(fixture.teams) ? fixture.teams.length : 0;
        setPanelStatus('<strong>Fixture loaded</strong><br>'+DEFAULT_FIXTURE_ID+'<br>'+teamCount+' teams • '+playerCount+' players','success');
        if(global.console && typeof global.console.log==='function') global.console.log('[RosterBate dev] Historical fixture', fixture);
        return;
      }
      if(action==='validate'){
        const result=await api.validateFixture(DEFAULT_FIXTURE_ID);
        setPanelStatus(formatResultSummary({status:'validated', validation:result}), result.status==='validation_failed' ? 'error' : (result.warnings && result.warnings.length ? 'warn' : 'success'));
        if(global.console && typeof global.console.log==='function') global.console.log('[RosterBate dev] Validation report', result);
        return;
      }
      if(action==='import'){
        const result=await api.importFixture(DEFAULT_FIXTURE_ID);
        setPanelStatus(formatResultSummary(result), result.status==='dry_run_ready' ? 'success' : (String(result.status||'').includes('failed') ? 'error' : 'warn'));
        if(global.console && typeof global.console.log==='function') global.console.log('[RosterBate dev] Import result', result);
        return;
      }
      if(action==='apply'){
        const selectedTeamId=getPanelSelectedTeamId();
        const selectedTeamLabel=getSelectedTeamLabel();
        const result=await api.applyFixtureToLocalState(DEFAULT_FIXTURE_ID, {selectedTeamId:selectedTeamId});
        const writerResult=result && result.writerResult ? result.writerResult : null;
        const savedSummary=writerResult && writerResult.summary ? writerResult.summary : null;
        const savedBits=[
          writerResult && writerResult.packId ? writerResult.packId : DEFAULT_FIXTURE_ID,
          savedSummary && savedSummary.teamCount!=null ? savedSummary.teamCount+' teams' : '',
          savedSummary && savedSummary.playerCount!=null ? savedSummary.playerCount+' players' : '',
          selectedTeamLabel ? ('Team: '+selectedTeamLabel) : ''
        ].filter(Boolean);
        setPanelStatus('<strong>Applied To Local State</strong><br>'+savedBits.join(' • ')+'<br>Saved under <code>'+LOCAL_STATE_KEY+'</code> and staged for the next season boot.', result.status==='import_applied' ? 'success' : 'warn');
        if(global.console && typeof global.console.log==='function') global.console.log('[RosterBate dev] Applied import result', result);
      }
    }catch(error){
      setPanelStatus('<strong>Runner error</strong><br>'+(error && error.message ? error.message : String(error)), 'error');
    }finally{
      setPanelBusy(false);
    }
  }

  function ensurePanel(){
    if(!enabled || !isBrowser || panelReady || !document.body) return;
    ensurePanelStyles();
    const root=document.createElement('aside');
    root.id=PANEL_ROOT_ID;
    root.dataset.open='false';
    root.innerHTML=
      '<div class="rbh-shell">'+
        '<button type="button" class="rbh-toggle" data-role="toggle" aria-expanded="false">'+
          '<span class="rbh-toggle-badge"><span class="rbh-dot"></span><span>Historical Pack Lab</span></span>'+
          '<span class="rbh-toggle-meta" data-role="toggle-meta">Open</span>'+
        '</button>'+
        '<div class="rbh-body">'+
          '<div class="rbh-title"><div><strong>Pack Dev</strong><span>Localhost-only runner for the `1995-96` historical fixture.</span></div></div>'+
          '<div class="rbh-status" id="'+PANEL_ROOT_ID+'_status" data-tone="neutral"><strong>Idle</strong><br>Use Validate or Dry Import to test the sample pack.</div>'+
          '<div class="rbh-select-shell">'+
            '<div class="rbh-select-label"><span>Featured Team</span><span class="rbh-select-hint">Staged for season boot</span></div>'+
            '<select class="rbh-select" id="'+TEAM_SELECT_ID+'" data-role="team-select"><option value="">Loading teams…</option></select>'+
          '</div>'+
          '<div class="rbh-actions">'+
            '<button type="button" class="rbh-btn rbh-btn--ghost" data-role="action" data-action="ready">Ready</button>'+
            '<button type="button" class="rbh-btn" data-role="action" data-action="validate">Validate</button>'+
            '<button type="button" class="rbh-btn rbh-btn--accent" data-role="action" data-action="import">Dry Import</button>'+
            '<button type="button" class="rbh-btn rbh-btn--success" data-role="action" data-action="apply">Apply To Local</button>'+
          '</div>'+
          '<div class="rbh-footer">'+
            '<div class="rbh-footnote" id="'+FIXTURE_META_ID+'">Fixture: '+DEFAULT_FIXTURE_ID+'</div>'+
            '<button type="button" class="rbh-link" data-role="action" data-action="fixture">Log Fixture</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(root);
    root.querySelector('[data-role="toggle"]').addEventListener('click', function(){
      setPanelOpen(root.dataset.open!=='true');
    });
    root.querySelectorAll('[data-role="action"]').forEach(function(button){
      button.addEventListener('click', function(){
        runPanelAction(button.dataset.action);
      });
    });
    const teamSelect=root.querySelector('[data-role="team-select"]');
    if(teamSelect){
      teamSelect.addEventListener('change', function(){
        persistSelectedTeamId(teamSelect.value);
        setPanelStatus('<strong>Featured team staged</strong><br>Next local historical season boot will open as '+(getSelectedTeamLabel() || 'the selected team')+'.', 'success');
      });
    }
    panelReady=true;
    syncPanelFixtureContext();
  }

  const api={
    enabled: enabled,
    async ready(){
      if(!enabled) return disabledResponse();
      try{
        await ensureReady();
        return {
          status:'ready',
          commands:[
            'await rbHistoricalPackDev.ready()',
            'rbHistoricalPackDev.help()',
            'await rbHistoricalPackDev.getFixture()',
            'await rbHistoricalPackDev.validateFixture()',
            'await rbHistoricalPackDev.importFixture()',
            'await rbHistoricalPackDev.applyFixtureToLocalState()',
            'rbHistoricalPackDev.getSelectedTeam()',
            'await rbHistoricalPackDev.validateBundle(bundle)',
            'await rbHistoricalPackDev.importBundle(bundle)',
            'rbHistoricalPackDev.readAppliedLocalState()'
          ]
        };
      }catch(error){
        return {status:'error', message:error && error.message ? error.message : String(error)};
      }
    },
    help(){
      const message={
        enabled: enabled,
        usage:[
          'await rbHistoricalPackDev.ready()',
          'await rbHistoricalPackDev.getFixture("nba_1996_full_season_v1")',
          'await rbHistoricalPackDev.validateFixture("nba_1996_full_season_v1")',
          'await rbHistoricalPackDev.importFixture("nba_1996_full_season_v1")',
          'await rbHistoricalPackDev.applyFixtureToLocalState("nba_1996_full_season_v1")',
          'rbHistoricalPackDev.getSelectedTeam()',
          'rbHistoricalPackDev.setSelectedTeam("nba_1996_sea")',
          'rbHistoricalPackDev.readAppliedLocalState()',
          'rbHistoricalPackDev.clearAppliedLocalState()'
        ]
      };
      if(global.console && typeof global.console.table==='function'){
        global.console.table(message.usage.map(function(item){ return {command:item}; }));
      }else if(global.console && typeof global.console.info==='function'){
        global.console.info(message);
      }
      return message;
    },
    async getFixture(packId){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      return deps.fixtures.getFixtureById(packId || DEFAULT_FIXTURE_ID);
    },
    async validateFixture(packId){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      const id=packId || DEFAULT_FIXTURE_ID;
      const bundle=deps.fixtures.getFixtureById(id);
      if(!bundle){
        return {status:'fixture_not_found', packId:id};
      }
      return deps.validator.validateHistoricalPackBundle(bundle);
    },
    async importFixture(packId, options){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      return deps.importer.importHistoricalPackFixture(packId || DEFAULT_FIXTURE_ID, options || {});
    },
    async applyFixtureToLocalState(packId, options){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      const selectedTeamId=String(options && options.selectedTeamId || getPanelSelectedTeamId()).trim();
      return deps.importer.importHistoricalPackFixture(packId || DEFAULT_FIXTURE_ID, {
        dryRun: false,
        writer: function(importResult){
          return writeImportToLocalState(importResult, {selectedTeamId:selectedTeamId});
        }
      });
    },
    async validateBundle(bundle){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      return deps.validator.validateHistoricalPackBundle(bundle);
    },
    async importBundle(bundle, options){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      return deps.importer.importHistoricalPackBundle(bundle, options || {});
    },
    async getSelectedTeam(){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      const fixture=deps.fixtures.getFixtureById(DEFAULT_FIXTURE_ID);
      const selectedTeamId=getPanelSelectedTeamId() || getPersistedSelectedTeamId();
      const teams=fixture && Array.isArray(fixture.teams) ? fixture.teams : [];
      return teams.find(function(team){ return String(team.teamId)===String(selectedTeamId); }) || null;
    },
    async setSelectedTeam(teamId){
      if(!enabled) return disabledResponse();
      const deps=await getDependencies();
      const fixture=deps.fixtures.getFixtureById(DEFAULT_FIXTURE_ID);
      const teams=fixture && Array.isArray(fixture.teams) ? fixture.teams : [];
      const nextId=String(teamId || '').trim();
      if(!teams.some(function(team){ return String(team.teamId)===nextId; })){
        return {status:'team_not_found', teamId:nextId};
      }
      persistSelectedTeamId(nextId);
      const select=panelNode(TEAM_SELECT_ID);
      if(select) select.value=nextId;
      return {status:'team_selected', teamId:nextId};
    },
    readAppliedLocalState: readAppliedLocalState,
    clearAppliedLocalState: clearAppliedLocalState,
    localStateKey: LOCAL_STATE_KEY,
    pendingBootKey: PENDING_BOOT_KEY,
    teamSelectionKey: TEAM_SELECTION_KEY
  };

  global.rbHistoricalPackDev=api;
  global.rbHistoricalDev=api;

  if(enabled){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', ensurePanel, {once:true});
    }else{
      ensurePanel();
    }
    ensureReady().catch(function(error){
      if(global.console && typeof global.console.warn==='function'){
        global.console.warn('[RosterBate dev] Historical pack runner failed to initialize:', error && error.message ? error.message : error);
      }
    });
  }
})(typeof window!=='undefined' ? window : globalThis);
