// RosterBate Demo Season Data
// This is STATIC sample data for "Try It Now" preview mode
// Not connected to live player data or real drafts
(function() {
  window.ROSTERBATE_DEMO_DATA = {
    nba: {
      sport: 'nba',
      teamName: 'Demo Dunkers',
      leagueSize: 8,
      scoringFormat: 'h2h_pts',
      draftFormat: 'snake',
      rounds: 13,
      myPos: 0,
      currentWeek: 15,
      weeksCompleted: 14,
      teams: [
        'Demo Dunkers',
        'Sample Squad',
        'Test Team',
        'Practice Players',
        'Trial Tribe',
        'Mock Masters',
        'Preview Pros',
        'Example Elite'
      ],
      // Pre-drafted rosters with sample players
      myRoster: [
        {id: 1, name: 'Jayson Tatum', team: 'BOS', pos: 'SF', fp: 49.8, adp: 9},
        {id: 67, name: 'Donovan Mitchell', team: 'CLE', pos: 'SG', fp: 46, adp: 16},
        {id: 147, name: 'Tyrese Maxey', team: 'PHI', pos: 'PG', fp: 42.4, adp: 25},
        {id: 157, name: 'Nikola Jokic', team: 'DEN', pos: 'C', fp: 58.1, adp: 4},
        {id: 27, name: 'Bam Adebayo', team: 'MIA', pos: 'C', fp: 41.8, adp: 28},
        {id: 187, name: 'Jalen Brunson', team: 'NYK', pos: 'PG', fp: 39.9, adp: 32},
        {id: 37, name: 'Joel Embiid', team: 'PHI', pos: 'C', fp: 61.2, adp: 2},
        {id: 97, name: 'Giannis Antetokounmpo', team: 'MIL', pos: 'PF', fp: 59.7, adp: 3},
        {id: 207, name: 'Stephen Curry', team: 'GSW', pos: 'PG', fp: 46.8, adp: 15},
        {id: 117, name: 'LaMelo Ball', team: 'CHA', pos: 'PG', fp: 45.6, adp: 17},
        {id: 127, name: 'Devin Booker', team: 'PHX', pos: 'SG', fp: 44.3, adp: 20},
        {id: 137, name: 'Jaylen Brown', team: 'BOS', pos: 'SG', fp: 43.5, adp: 22},
        {id: 247, name: 'Domantas Sabonis', team: 'SAC', pos: 'C', fp: 47.9, adp: 12}
      ],
      // Sample season stats (14 weeks completed)
      seasonStats: {
        record: { wins: 9, losses: 5 },
        pointsFor: 8456.3,
        pointsAgainst: 7892.1,
        standing: 3,
        streak: { type: 'W', count: 2 }
      },
      // Sample weekly matchups
      weeklyMatchups: [
        { week: 14, opponent: 1, myScore: 612.4, oppScore: 587.3, result: 'W' },
        { week: 13, opponent: 5, myScore: 598.7, oppScore: 623.1, result: 'L' },
        { week: 12, opponent: 3, myScore: 625.2, oppScore: 601.8, result: 'W' }
      ]
    }
  };

  // Helper function to get demo data for a sport
  window.getRosterbateDemoData = function(sport) {
    const normalized = (sport || 'nba').toLowerCase();
    return window.ROSTERBATE_DEMO_DATA[normalized] || window.ROSTERBATE_DEMO_DATA.nba;
  };
})();
