// RosterBate Sport Configuration
(function() {
  window.SPORT_CFG = {
    icon: '🏀',
    label: 'NBA',
    leagueLabel: 'NBA',
    defaultLeagueSize: 10,
    defaultRounds: 13,
    defaultScoring: 'h2h_pts',
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
  };

  window.SPORT_RULES = {
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
  };

  window.POSITION_LABELS = {
    PG: 'Point Guard',
    SG: 'Shooting Guard',
    G: 'Guard',
    SF: 'Small Forward',
    PF: 'Power Forward',
    F: 'Forward',
    C: 'Center',
    UTIL: 'Utility'
  };

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
