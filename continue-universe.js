(function(global){
  'use strict';

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function normalizeSport(value){
    return String(value || 'nba').trim().toLowerCase() || 'nba';
  }

  function isSimulationSlot(slot){
    const mode = String(slot?.simulationMode || '').trim().toLowerCase();
    const entryMode = String(slot?.historicalEntryMode || '').trim().toLowerCase();
    const tone = String(slot?.modeTone || '').trim().toLowerCase();
    return tone === 'simulation'
      || entryMode === 'simulation_season'
      || mode === 'nba_mixed_era_single_player_v1'
      || mode === 'nfl_mixed_era_single_player_v1';
  }

  function formatDate(value){
    const timestamp = Number(value || 0);
    if(!Number.isFinite(timestamp) || timestamp <= 0) return 'Not played yet';
    try{
      return new Date(timestamp).toLocaleString([], {
        month:'short',
        day:'numeric',
        hour:'numeric',
        minute:'2-digit'
      });
    }catch(error){
      return 'Recently';
    }
  }

  function formatSport(value){
    const sport = normalizeSport(value);
    return sport === 'nfl' ? 'NFL' : sport === 'mlb' ? 'MLB' : 'NBA';
  }

  function formatRecord(slot){
    const wins = Number(slot?.wins);
    const losses = Number(slot?.losses);
    if(Number.isFinite(wins) && Number.isFinite(losses)){
      return wins + '-' + losses;
    }
    return '0-0';
  }

  function getProgress(slot){
    const explicit = String(slot?.progressLabel || '').trim();
    if(explicit) return explicit;
    const sport = normalizeSport(slot?.sport || 'nba');
    const week = Number(slot?.currentWeek || 1) || 1;
    const day = Number(slot?.currentDay || 1) || 1;
    return sport === 'nfl' ? ('Week ' + week) : ('Week ' + week + ' - Day ' + day);
  }

  function buildResumeUrl(api, slot){
    if(!api || typeof api.buildSeasonUrl !== 'function') return '#';
    const state = typeof api.getState === 'function' ? api.getState(slot?.slotId) : null;
    return api.buildSeasonUrl(slot, slot?.sport, state || null);
  }

  function buildDetailsUrl(api, slot){
    if(!api || typeof api.buildDetailsUrl !== 'function') return '#';
    return api.buildDetailsUrl(slot, slot?.sport);
  }

  function getSavedSimulationSlots(options){
    const api = global.RosterBateHistoricalUniverseSlots;
    if(!api || typeof api.listSlots !== 'function') return [];
    const opts = options && typeof options === 'object' ? options : {};
    const sport = opts.sport ? normalizeSport(opts.sport) : '';
    return api.listSlots(sport ? { sport } : {})
      .filter(isSimulationSlot)
      .slice(0, Math.max(1, Number(opts.limit || 12) || 12));
  }

  function renderSavedSimulationLeagues(mount, options){
    const target = typeof mount === 'string' ? global.document?.getElementById(mount) : mount;
    if(!target) return [];
    const api = global.RosterBateHistoricalUniverseSlots;
    const opts = options && typeof options === 'object' ? options : {};
    const slots = getSavedSimulationSlots(opts);
    const emptyTitle = opts.emptyTitle || 'No Saved Leagues Yet';
    const emptyCopy = opts.emptyCopy || 'Start a simulation league and it will appear here for this browser profile.';
    const heading = opts.heading || 'Saved Leagues';
    const kicker = opts.kicker || 'Continue Universe';
    const copy = opts.copy || 'Resume local simulation universes saved in this browser.';
    const maxCards = Math.max(1, Number(opts.maxCards || slots.length || 1));
    const visibleSlots = slots.slice(0, maxCards);
    target.innerHTML = [
      '<div class="saved-leagues-head">',
        '<div>',
          '<div class="saved-leagues-kicker">' + escapeHtml(kicker) + '</div>',
          '<div class="saved-leagues-title">' + escapeHtml(heading) + '</div>',
          '<div class="saved-leagues-copy">' + escapeHtml(copy) + '</div>',
        '</div>',
        slots.length ? '<span class="saved-leagues-count">' + slots.length + ' saved</span>' : '',
      '</div>',
      visibleSlots.length
        ? '<div class="saved-leagues-grid">' + visibleSlots.map(function(slot){
            const title = String(slot?.leagueName || slot?.title || 'Simulation League').trim();
            const team = String(slot?.teamName || slot?.historicalSelectedTeamId || 'Managed team').trim();
            const progress = getProgress(slot);
            const record = formatRecord(slot);
            const updated = formatDate(slot?.updatedAt);
            const resumeUrl = buildResumeUrl(api, slot);
            const detailsUrl = buildDetailsUrl(api, slot);
            const pf = Number(slot?.pf);
            const rank = Number(slot?.teamRank);
            return [
              '<article class="saved-league-card">',
                '<div class="saved-league-top">',
                  '<div>',
                    '<div class="saved-league-sport">' + escapeHtml(formatSport(slot?.sport)) + ' Local League</div>',
                    '<div class="saved-league-name">' + escapeHtml(title) + '</div>',
                    '<div class="saved-league-team">' + escapeHtml(team) + '</div>',
                  '</div>',
                  '<div class="saved-league-record">' + escapeHtml(record) + '</div>',
                '</div>',
                '<div class="saved-league-meta">',
                  '<span>' + escapeHtml(progress) + '</span>',
                  '<span>Last played ' + escapeHtml(updated) + '</span>',
                  Number.isFinite(rank) ? '<span>Rank #' + rank + '</span>' : '',
                  Number.isFinite(pf) ? '<span>' + pf.toFixed(1) + ' PF</span>' : '',
                '</div>',
                '<div class="saved-league-actions">',
                  '<a class="saved-league-btn primary" href="' + escapeHtml(resumeUrl) + '">Continue Season</a>',
                  '<a class="saved-league-btn secondary" href="' + escapeHtml(detailsUrl) + '">Open Details</a>',
                '</div>',
              '</article>'
            ].join('');
          }).join('') + '</div>'
        : [
          '<div class="saved-leagues-empty">',
            '<strong>' + escapeHtml(emptyTitle) + '</strong>',
            '<span>' + escapeHtml(emptyCopy) + '</span>',
          '</div>'
        ].join(''),
      slots.length > visibleSlots.length
        ? '<div class="saved-leagues-more">' + (slots.length - visibleSlots.length) + ' more saved league' + (slots.length - visibleSlots.length === 1 ? '' : 's') + ' available on the Continue Universe page.</div>'
        : ''
    ].join('');
    return slots;
  }

  global.RosterBateSavedLeagues = {
    getSavedSimulationSlots,
    renderSavedSimulationLeagues
  };
})(window);
