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

  const SIMULATION_SHELL = deepFreeze({
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
  });

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function getSimulationShell(){
    return clone(SIMULATION_SHELL);
  }

  function findSimulationTeamByAbbr(abbr){
    const key = String(abbr || '').trim().toUpperCase();
    return getSimulationShell().teams.find((team) => team.abbr === key) || null;
  }

  const api = {
    SIMULATION_SHELL,
    getSimulationShell,
    findSimulationTeamByAbbr
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationModeConfig = api;
})(typeof window !== 'undefined' ? window : globalThis);
