(function(root){
  'use strict';

  function deepFreeze(value){
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.keys(value).forEach((key) => {
      deepFreeze(value[key]);
    });
    return value;
  }

  const CURRENT_NBA_SHELL = {
    anchorSeasonId: 'nba_2025_26',
    anchorSeasonLabel: '2025-26 NBA',
    regularSeasonStartDate: '2025-10-21',
    regularSeasonEndDate: '2026-04-12',
    playInStartDate: '2026-04-14',
    playInEndDate: '2026-04-17',
    playoffsStartDate: '2026-04-18',
    finalsStartDate: '2026-06-03',
    regularSeasonGamesPerTeam: 82,
    rosterSize: 10,
    playInSeeds: [7, 8, 9, 10],
    teams: [
      { abbr: 'ATL', name: 'Atlanta Hawks', conference: 'East', division: 'Southeast' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' },
      { abbr: 'BKN', name: 'Brooklyn Nets', conference: 'East', division: 'Atlantic' },
      { abbr: 'CHA', name: 'Charlotte Hornets', conference: 'East', division: 'Southeast' },
      { abbr: 'CHI', name: 'Chicago Bulls', conference: 'East', division: 'Central' },
      { abbr: 'CLE', name: 'Cleveland Cavaliers', conference: 'East', division: 'Central' },
      { abbr: 'DET', name: 'Detroit Pistons', conference: 'East', division: 'Central' },
      { abbr: 'IND', name: 'Indiana Pacers', conference: 'East', division: 'Central' },
      { abbr: 'MIA', name: 'Miami Heat', conference: 'East', division: 'Southeast' },
      { abbr: 'MIL', name: 'Milwaukee Bucks', conference: 'East', division: 'Central' },
      { abbr: 'NYK', name: 'New York Knicks', conference: 'East', division: 'Atlantic' },
      { abbr: 'ORL', name: 'Orlando Magic', conference: 'East', division: 'Southeast' },
      { abbr: 'PHI', name: 'Philadelphia 76ers', conference: 'East', division: 'Atlantic' },
      { abbr: 'TOR', name: 'Toronto Raptors', conference: 'East', division: 'Atlantic' },
      { abbr: 'WAS', name: 'Washington Wizards', conference: 'East', division: 'Southeast' },
      { abbr: 'DAL', name: 'Dallas Mavericks', conference: 'West', division: 'Southwest' },
      { abbr: 'DEN', name: 'Denver Nuggets', conference: 'West', division: 'Northwest' },
      { abbr: 'GSW', name: 'Golden State Warriors', conference: 'West', division: 'Pacific' },
      { abbr: 'HOU', name: 'Houston Rockets', conference: 'West', division: 'Southwest' },
      { abbr: 'LAC', name: 'Los Angeles Clippers', conference: 'West', division: 'Pacific' },
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'MEM', name: 'Memphis Grizzlies', conference: 'West', division: 'Southwest' },
      { abbr: 'MIN', name: 'Minnesota Timberwolves', conference: 'West', division: 'Northwest' },
      { abbr: 'NOP', name: 'New Orleans Pelicans', conference: 'West', division: 'Southwest' },
      { abbr: 'OKC', name: 'Oklahoma City Thunder', conference: 'West', division: 'Northwest' },
      { abbr: 'PHX', name: 'Phoenix Suns', conference: 'West', division: 'Pacific' },
      { abbr: 'POR', name: 'Portland Trail Blazers', conference: 'West', division: 'Northwest' },
      { abbr: 'SAC', name: 'Sacramento Kings', conference: 'West', division: 'Pacific' },
      { abbr: 'SAS', name: 'San Antonio Spurs', conference: 'West', division: 'Southwest' },
      { abbr: 'UTA', name: 'Utah Jazz', conference: 'West', division: 'Northwest' }
    ]
  };

  const SIMULATION_SHELL = deepFreeze({
    ...CURRENT_NBA_SHELL,
    sport: 'nba'
  });

  const NFL_2014_TEAMS = deepFreeze([
    { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
    { abbr: 'ATL', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
    { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
    { abbr: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
    { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
    { abbr: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
    { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
    { abbr: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
    { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
    { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
    { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
    { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
    { abbr: 'HOU', name: 'Houston Texans', conference: 'AFC', division: 'South' },
    { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
    { abbr: 'JAX', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
    { abbr: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
    { abbr: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
    { abbr: 'MIN', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
    { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
    { abbr: 'NO', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
    { abbr: 'NYG', name: 'New York Giants', conference: 'NFC', division: 'East' },
    { abbr: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
    { abbr: 'OAK', name: 'Oakland Raiders', conference: 'AFC', division: 'West' },
    { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
    { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
    { abbr: 'SD', name: 'San Diego Chargers', conference: 'AFC', division: 'West' },
    { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
    { abbr: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
    { abbr: 'STL', name: 'St. Louis Rams', conference: 'NFC', division: 'West' },
    { abbr: 'TB', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
    { abbr: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
    { abbr: 'WAS', name: 'Washington Redskins', conference: 'NFC', division: 'East' }
  ]);

  const SIMULATION_SHELLS = deepFreeze({
    nba_2025_26: SIMULATION_SHELL,
    nfl_2014: deepFreeze({
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      regularSeasonStartDate: '2014-09-04',
      regularSeasonEndDate: '2014-12-28',
      playoffsStartDate: '2015-01-03',
      championshipDate: '2015-02-01',
      championshipLabel: 'Super Bowl XLIX',
      regularSeasonWeeks: 17,
      rosterSize: 13,
      playoffFieldPerConference: 6,
      conferences: ['AFC', 'NFC'],
      teams: NFL_2014_TEAMS
    })
  });

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeShellSelector(selector){
    if (typeof selector === 'string') {
      return { sport: String(selector || '').trim().toLowerCase() };
    }
    const input = selector && typeof selector === 'object' ? selector : {};
    return {
      sport: String(input.sport || 'nba').trim().toLowerCase(),
      anchorSeasonId: String(input.anchorSeasonId || '').trim().toLowerCase()
    };
  }

  function getSimulationShell(selector){
    const normalized = normalizeShellSelector(selector);
    const explicitId = normalized.anchorSeasonId;
    if (explicitId && SIMULATION_SHELLS[explicitId]) {
      return clone(SIMULATION_SHELLS[explicitId]);
    }
    if (normalized.sport === 'nfl') {
      return clone(SIMULATION_SHELLS.nfl_2014);
    }
    return clone(SIMULATION_SHELLS.nba_2025_26);
  }

  function listSimulationShells(){
    return Object.keys(SIMULATION_SHELLS).map((key) => clone(SIMULATION_SHELLS[key]));
  }

  function findSimulationTeamByAbbr(abbr, selector){
    const key = String(abbr || '').trim().toUpperCase();
    return getSimulationShell(selector).teams.find((team) => team.abbr === key) || null;
  }

  const api = {
    SIMULATION_SHELL,
    SIMULATION_SHELLS,
    normalizeShellSelector,
    getSimulationShell,
    listSimulationShells,
    findSimulationTeamByAbbr
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationModeConfig = api;
})(typeof window !== 'undefined' ? window : globalThis);
