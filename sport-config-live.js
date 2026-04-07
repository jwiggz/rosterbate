// RosterBate Sport Configuration
(function() {
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
      return data.teamName === 'Demo Dunkers' || data.isDemo === true;
    } catch(e) {
      return false;
    }
  };

  window.CURRENT_SPORT = getSelectedRosterbateSport();

  window.getRosterbateSportConfig = function(sport) {
    const configs = {
      nba: {
        icon: '🏀',
        label: 'NBA',
        leagueLabel: 'NBA',
        defaultLeagueSize: 10,
        defaultRounds: 13,
        defaultScoring: 'h2h_pts',
        defaultFormat: 'snake',
        starterSlots: ['PG','SG','G','SF','PF','F','C','C','UTIL'],
        waiverPositions: ['ALL','PG','SG','SF','PF','C'],
        teamCodes: ['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS'],
        filters: ['ALL','PG','SG','SF','PF','C'],
        myTeamSlots: ['PG','SG','G','SF','PF','F','C','C','UTIL','UTIL','BN','BN','BN'],
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
        defaultRounds: 15,
        defaultScoring: 'h2h_pts',
        defaultFormat: 'snake',
        starterSlots: ['QB','RB','RB','WR','WR','TE','FLEX','K','DST'],
        waiverPositions: ['ALL','QB','RB','WR','TE','K','DST'],
        teamCodes: ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'],
        filters: ['ALL','QB','RB','WR','TE','K','DST'],
        myTeamSlots: ['QB','RB','RB','WR','WR','TE','FLEX','K','DST','BN','BN','BN','BN','BN','BN'],
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
        defaultRounds: 14,
        defaultScoring: 'h2h_cat',
        defaultFormat: 'snake',
        starterSlots: ['C','1B','2B','3B','SS','OF','OF','OF','UTIL','SP'],
        waiverPositions: ['ALL','C','1B','2B','3B','SS','OF','SP','RP'],
        teamCodes: ['ARI','ATL','BAL','BOS','CHC','CHW','CIN','CLE','COL','DET','HOU','KC','LAA','LAD','MIA','MIL','MIN','NYM','NYY','OAK','PHI','PIT','SD','SEA','SF','STL','TB','TEX','TOR','WAS'],
        filters: ['ALL','C','1B','2B','3B','SS','OF','SP','RP'],
        myTeamSlots: ['C','1B','2B','3B','SS','OF','OF','OF','UTIL','SP','SP','RP','RP','BN'],
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
        irSlots: 0,
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
        irSlots: 0,
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
        irSlots: 0,
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

  window.buildRosterbateSportPlayerPool = function(sport, limit) {
    // Get players from the imported pool
    const pool = window.RB_IMPORTED_POOLS?.[sport];
    if (!pool || !Array.isArray(pool)) return [];
    return pool.slice(0, limit || 300);
  };
})();
