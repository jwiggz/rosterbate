// RosterBate Sport Configuration
(function() {
  function hexToRgba(hex, alpha) {
    const value = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(102,102,102,${alpha})`;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function createPalette(primary, secondary, ink) {
    return {
      primary,
      secondary,
      ink,
      glow: hexToRgba(primary, 0.28),
      ring: hexToRgba(secondary, 0.42),
      shadow: hexToRgba(primary, 0.18)
    };
  }

  const NBA_SAFE_INSPIRED_TEAM_PALETTES = {
    ATL: createPalette('#D76849', '#F2B56E', '#211412'),
    BOS: createPalette('#2F8F5B', '#D6C27A', '#121811'),
    BKN: createPalette('#4D5564', '#D6DEE8', '#13151A'),
    CHA: createPalette('#4B58C7', '#42D8C6', '#111426'),
    CHI: createPalette('#D84D63', '#161D28', '#130F12'),
    CLE: createPalette('#8C4A7A', '#F0A65F', '#1B1218'),
    DAL: createPalette('#2B7AB8', '#76D0D4', '#101B25'),
    DEN: createPalette('#3F5FA7', '#F2AB46', '#151628'),
    DET: createPalette('#4E6DD1', '#DC6A4A', '#131824'),
    GSW: createPalette('#2F5AC6', '#F1B34F', '#11182A'),
    HOU: createPalette('#C94B57', '#EF8B6F', '#1A1012'),
    IND: createPalette('#36569F', '#F0BF67', '#151824'),
    LAC: createPalette('#2C7DB2', '#F26C4D', '#111A23'),
    LAL: createPalette('#7D4EC9', '#FFC76A', '#171123'),
    MEM: createPalette('#5A7BC7', '#9FD8CC', '#111B25'),
    MIA: createPalette('#EF6B76', '#31D0B4', '#1C1014'),
    MIL: createPalette('#2F7E58', '#D7C38A', '#111814'),
    MIN: createPalette('#3F69B6', '#61C8D7', '#101826'),
    NOP: createPalette('#315987', '#E28B52', '#131824'),
    NYK: createPalette('#2F7FE2', '#F5A153', '#101A27'),
    OKC: createPalette('#2AA8D6', '#FFB357', '#101A21'),
    ORL: createPalette('#3D73DB', '#B7D6FF', '#11182A'),
    PHI: createPalette('#3C67D6', '#FF725C', '#131927'),
    PHX: createPalette('#8D55D6', '#F89D53', '#1A1224'),
    POR: createPalette('#DC5D5C', '#2D3949', '#171113'),
    SAC: createPalette('#8D56C7', '#C2BDD6', '#171225'),
    SAS: createPalette('#7B8697', '#D9DFEB', '#14181E'),
    TOR: createPalette('#D65E68', '#5F748D', '#171216'),
    UTA: createPalette('#3EA670', '#E8BB5D', '#121912'),
    WAS: createPalette('#4C78D4', '#D96B63', '#131925')
  };

  window.normalizeRosterbateSport = function(sport) {
    const normalized = String(sport || '').toLowerCase().trim();
    return ['nba', 'nfl', 'mlb'].includes(normalized) ? normalized : 'nba';
  };

  // Detect which sport to use from URL parameter or default to NBA
  window.getSelectedRosterbateSport = function() {
    const params = new URLSearchParams(window.location.search || '');
    const sport = params.get('sport');
    return normalizeRosterbateSport(sport);
  };

  // Set the sport (updates URL and reloads config)
  window.setSelectedRosterbateSport = function(sport) {
    const normalized = normalizeRosterbateSport(sport);
    window.CURRENT_SPORT = normalized;
    window.SPORT_CFG = getRosterbateSportConfig(normalized);
    window.SPORT_RULES = getRosterbateLeagueRuleDefaults(normalized);
    window.POSITION_LABELS = getRosterbatePositionLabels(normalized);
    return normalized;
  };

  // Check if we're in demo/preview mode
  window.isRosterbateDemoMode = function() {
    // Check if localStorage has demo data
    try {
      const saved = localStorage.getItem('rosterbateDraft');
      if (!saved) return false;
      const data = JSON.parse(saved);
      // Explicitly check isDemo flag (false = live data, true = demo data)
      return data.isDemo === true;
    } catch(e) {
      return false;
    }
  };

  window.CURRENT_SPORT = getSelectedRosterbateSport();

  window.getRosterbatePlayerPoolServiceMode = function(sport) {
    const normalized = normalizeRosterbateSport(sport);
    const modes = {
      nba: 'imported_snapshot',
      nfl: 'imported_snapshot',
      mlb: 'live'
    };
    return modes[normalized] || 'imported_snapshot';
  };

  window.isRosterbateLiveServiceSport = function(sport) {
    return getRosterbatePlayerPoolServiceMode(sport) === 'live';
  };

  window.getRosterbatePlayerPoolLimit = function(sport) {
    const normalized = normalizeRosterbateSport(sport);
    const limits = {
      nba: 500,
      nfl: 320,
      mlb: 500
    };
    return limits[normalized] || 320;
  };

  window.getRosterbateSportConfig = function(sport) {
    const configs = {
      nba: {
        icon: '🏀',
        label: 'NBA',
        leagueLabel: 'NBA',
        defaultLeagueSize: 10,
        defaultRounds: 15,
        defaultScoring: 'h2h_pts',
        defaultFormat: 'snake',
        starterSlots: ['PG','SG','G','SF','PF','F','C','C','UTIL'],
        waiverPositions: ['ALL','PG','SG','SF','PF','C'],
        teamCodes: ['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS'],
        filters: ['ALL','PG','SG','SF','PF','C'],
        myTeamSlots: ['PG','SG','G','SF','PF','F','C','C','UTIL','UTIL','BN','BN','BN','IR','IR'],
        scoringInfo: {
          h2h_pts: 'Weekly head-to-head matchups. Win by scoring more total fantasy points than your opponent.',
          h2h_cat: 'Win/lose 9 stat categories weekly. PTS, REB, AST, STL, BLK, TO, FG%, FT%, 3PM.',
          roto: 'Season-long cumulative stats. Rank 1st-12th in each category. Top total rank wins.',
          points: 'Season-long points race. Highest total fantasy points at season end wins the league.',
          moneyball_pts: 'Lock-in mode: H2H Points league where you lock one game per week for each position. Score fantasy points from only locked games.',
          moneyball_cat: 'Lock-in mode: Lock one game per week for each position. Win/lose stat categories using only locked games.'
        }
      },
      nfl: {
        icon: '🏈',
        label: 'NFL',
        leagueLabel: 'NFL',
        defaultLeagueSize: 10,
        defaultRounds: 17,
        defaultScoring: 'h2h_pts',
        defaultFormat: 'snake',
        starterSlots: ['QB','RB','RB','WR','WR','TE','FLEX','K','DST'],
        waiverPositions: ['ALL','QB','RB','WR','TE','K','DST'],
        teamCodes: ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'],
        filters: ['ALL','QB','RB','WR','TE','K','DST'],
        myTeamSlots: ['QB','RB','RB','WR','WR','TE','FLEX','K','DST','BN','BN','BN','BN','BN','BN','IR','IR'],
        scoringInfo: {
          h2h_pts: 'Weekly matchups. Win by scoring more fantasy points.',
          h2h_cat: 'Win/lose stat categories weekly.',
          roto: 'Season-long cumulative ranking.',
          points: 'Season total points race.'
        }
      },
      mlb: {
        icon: '⚾',
        label: 'MLB',
        leagueLabel: 'MLB',
        defaultLeagueSize: 10,
        defaultRounds: 16,
        defaultScoring: 'h2h_cat',
        defaultFormat: 'snake',
        starterSlots: ['C','1B','2B','3B','SS','OF','OF','OF','UTIL','SP'],
        waiverPositions: ['ALL','C','1B','2B','3B','SS','OF','SP','RP'],
        teamCodes: ['ARI','ATL','BAL','BOS','CHC','CHW','CIN','CLE','COL','DET','HOU','KC','LAA','LAD','MIA','MIL','MIN','NYM','NYY','OAK','PHI','PIT','SD','SEA','SF','STL','TB','TEX','TOR','WAS'],
        filters: ['ALL','C','1B','2B','3B','SS','OF','SP','RP'],
        myTeamSlots: ['C','1B','2B','3B','SS','OF','OF','OF','UTIL','SP','SP','RP','RP','BN','IL','IL'],
        scoringInfo: {
          h2h_pts: 'Weekly matchups by total points.',
          h2h_cat: 'Win/lose hitting and pitching categories weekly.',
          roto: 'Season-long cumulative ranking.',
          points: 'Season total points race.'
        }
      }
    };
    return configs[sport] || configs.nba;
  };

  window.getRosterbateLeagueRuleDefaults = function(sport) {
    const rules = {
      nba: {
        starters: 9,
        benchSlots: 4,
        irSlots: 2,
        positions: {
          PG: { starters: 1, max: 4 },
          SG: { starters: 1, max: 4 },
          G: { starters: 1, max: 'No Limit' },
          SF: { starters: 1, max: 4 },
          PF: { starters: 1, max: 4 },
          F: { starters: 1, max: 'No Limit' },
          C: { starters: 2, max: 4 },
          UTIL: { starters: 2, max: 'No Limit' }
        },
        scoring: {
          pts: 1,
          reb: 1.2,
          ast: 1.5,
          stl: 3,
          blk: 3,
          to: -1,
          tpm: 0.5
        },
        scoringLabels: {
          pts: 'Points',
          reb: 'Rebounds',
          ast: 'Assists',
          stl: 'Steals',
          blk: 'Blocks',
          to: 'Turnovers',
          tpm: '3-Pointers Made'
        }
      },
      nfl: {
        starters: 9,
        benchSlots: 6,
        irSlots: 2,
        positions: {
          QB: { starters: 1, max: 3 },
          RB: { starters: 2, max: 6 },
          WR: { starters: 2, max: 6 },
          TE: { starters: 1, max: 3 },
          FLEX: { starters: 1, max: 'No Limit' },
          K: { starters: 1, max: 2 },
          DST: { starters: 1, max: 2 }
        },
        scoring: {
          pass_yd: 0.04,
          pass_td: 4,
          int: -2,
          rush_yd: 0.1,
          rush_td: 6,
          rec: 1,
          rec_yd: 0.1,
          rec_td: 6
        },
        scoringLabels: {
          pass_yd: 'Passing Yards',
          pass_td: 'Passing TDs',
          int: 'Interceptions',
          rush_yd: 'Rushing Yards',
          rush_td: 'Rushing TDs',
          rec: 'Receptions',
          rec_yd: 'Receiving Yards',
          rec_td: 'Receiving TDs'
        }
      },
      mlb: {
        starters: 10,
        benchSlots: 4,
        irSlots: 2,
        positions: {
          C: { starters: 1, max: 3 },
          '1B': { starters: 1, max: 3 },
          '2B': { starters: 1, max: 3 },
          '3B': { starters: 1, max: 3 },
          SS: { starters: 1, max: 3 },
          OF: { starters: 3, max: 6 },
          UTIL: { starters: 1, max: 'No Limit' },
          SP: { starters: 2, max: 6 },
          RP: { starters: 2, max: 4 }
        },
        scoring: {
          hr: 4,
          rbi: 1,
          run: 1,
          sb: 2,
          ip: 3,
          so: 1,
          w: 5,
          sv: 5
        },
        scoringLabels: {
          hr: 'Home Runs',
          rbi: 'RBIs',
          run: 'Runs',
          sb: 'Stolen Bases',
          ip: 'Innings Pitched',
          so: 'Strikeouts',
          w: 'Wins',
          sv: 'Saves'
        }
      }
    };
    return rules[sport] || rules.nba;
  };

  window.getRosterbatePositionLabels = function(sport) {
    const labels = {
      nba: {
        PG: 'Point Guard',
        SG: 'Shooting Guard',
        G: 'Guard',
        SF: 'Small Forward',
        PF: 'Power Forward',
        F: 'Forward',
        C: 'Center',
        UTIL: 'Utility'
      },
      nfl: {
        QB: 'Quarterback',
        RB: 'Running Back',
        WR: 'Wide Receiver',
        TE: 'Tight End',
        FLEX: 'Flex',
        K: 'Kicker',
        DST: 'Defense/Special Teams'
      },
      mlb: {
        C: 'Catcher',
        '1B': 'First Base',
        '2B': 'Second Base',
        '3B': 'Third Base',
        SS: 'Shortstop',
        OF: 'Outfield',
        UTIL: 'Utility',
        SP: 'Starting Pitcher',
        RP: 'Relief Pitcher'
      }
    };
    return labels[sport] || labels.nba;
  };

  // Initialize SPORT_CFG for immediate use
  window.SPORT_CFG = getRosterbateSportConfig(CURRENT_SPORT);
  window.SPORT_RULES = getRosterbateLeagueRuleDefaults(CURRENT_SPORT);
  window.POSITION_LABELS = getRosterbatePositionLabels(CURRENT_SPORT);

  window.getRosterbatePlayerSummary = function(player, sport) {
    if (!player || !player.statSummary) return '—';
    return player.statSummary;
  };

  window.getRosterbatePlayerDetailStats = function(player) {
    if (!player || !player.detailStats) return [];
    return player.detailStats;
  };

  window.getRosterbatePlayerFantasyScore = function(sport, player, scoringRules) {
    // For non-NBA sports, return the base fp
    return player?.fp || 0;
  };

  // Build player pool for drafts and seasons
  // These pools come from RB_IMPORTED_POOLS (sport-data-live.json/js)
  // Only sports with an active live service should be labeled "live" in the UI.
  // Other sports may still use imported snapshot data until their live feed is ready.
  window.buildRosterbateSportPlayerPool = function(sport, limit) {
    // Get players from the imported pool
    const pool = window.RB_IMPORTED_POOLS?.[sport];
    if (!pool || !Array.isArray(pool)) return [];
    const fallbackLimit = typeof getRosterbatePlayerPoolLimit === 'function'
      ? getRosterbatePlayerPoolLimit(sport)
      : (sport === 'nba' ? 500 : 320);
    return pool.slice(0, limit || fallbackLimit);
  };

  // Get team colors for display
  window.getRosterbateTeamColor = function(sport, teamCode) {
    const colors = {
      nba: Object.fromEntries(Object.entries(NBA_SAFE_INSPIRED_TEAM_PALETTES).map(([code, palette]) => [code, palette.primary])),
      nfl: {
        ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D', CAR: '#0085CA',
        CHI: '#0B162A', CIN: '#FB4F14', CLE: '#311D00', DAL: '#041E42', DEN: '#FB4F14',
        DET: '#0076B6', GB: '#203731', HOU: '#03202F', IND: '#002C5F', JAX: '#006778',
        KC: '#E31837', LAC: '#0080C6', LAR: '#003594', LV: '#000000', MIA: '#008E97',
        MIN: '#4F2683', NE: '#002244', NO: '#D3BC8D', NYG: '#0B2265', NYJ: '#125740',
        PHI: '#004C54', PIT: '#FFB612', SEA: '#002244', SF: '#AA0000', TB: '#D50A0A',
        TEN: '#0C2340', WAS: '#5A1414'
      },
      mlb: {
        ARI: '#A71930', ATL: '#CE1141', BAL: '#DF4601', BOS: '#BD3039', CHC: '#0E3386',
        CHW: '#27251F', CIN: '#C6011F', CLE: '#0C2340', COL: '#33006F', DET: '#0C2340',
        HOU: '#EB6E1F', KC: '#004687', LAA: '#BA0021', LAD: '#005A9C', MIA: '#00A3E0',
        MIL: '#12284B', MIN: '#002B5C', NYM: '#002D72', NYY: '#0C2340', OAK: '#003831',
        PHI: '#E81828', PIT: '#FDB827', SD: '#2F241D', SEA: '#0C2C56', SF: '#FD5A1E',
        STL: '#C41E3A', TB: '#092C5C', TEX: '#003278', TOR: '#134A8E', WAS: '#AB0003'
      }
    };
    const sportColors = colors[sport] || colors.nba;
    return sportColors[teamCode] || '#666666';
  };

  window.getRosterbateTeamPalette = function(sport, teamCode) {
    const normalized = normalizeRosterbateSport(sport);
    if (normalized === 'nba' && NBA_SAFE_INSPIRED_TEAM_PALETTES[teamCode]) {
      return Object.assign({}, NBA_SAFE_INSPIRED_TEAM_PALETTES[teamCode]);
    }
    const primary = window.getRosterbateTeamColor(normalized, teamCode);
    return createPalette(primary, primary, '#0f172a');
  };

  window.RB_SAFE_NBA_TEAM_PALETTES = NBA_SAFE_INSPIRED_TEAM_PALETTES;
})();
