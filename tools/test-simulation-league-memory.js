const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildSimulationLeagueMemory,
  buildSimulationLeagueMemoryBeats
} = require('../simulation-league-memory.js');

const state = {
  leagueShell: {
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers' },
      { abbr: 'BOS', name: 'Boston Celtics' },
      { abbr: 'IND', name: 'Indiana Pacers' }
    ]
  },
  seasonState: {
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', w: 4, l: 1, pf: 560, pa: 510, streak: 'W3' },
      { teamIdx: 1, teamAbbr: 'BOS', w: 2, l: 3, pf: 520, pa: 528, streak: 'L2' },
      { teamIdx: 2, teamAbbr: 'IND', w: 1, l: 4, pf: 488, pa: 540, streak: 'L1' }
    ],
    completedGameLogs: [
      {
        day: 1,
        week: 1,
        away: 1,
        awayAbbr: 'BOS',
        awayName: 'Boston Celtics',
        awayScore: 101,
        awayTotal: 206.5,
        awayEntries: [
          { player: { id: 33, name: 'Larry Bird', team: 'BOS', pos: 'SF' }, finalScore: 58.1 }
        ],
        home: 0,
        homeAbbr: 'LAL',
        homeName: 'Los Angeles Lakers',
        homeScore: 108,
        homeTotal: 223.2,
        homeEntries: [
          { player: { id: 32, name: 'Magic Johnson', team: 'LAL', pos: 'PG' }, finalScore: 71.4 }
        ],
        winner: 'home'
      },
      {
        day: 3,
        week: 1,
        away: 0,
        awayAbbr: 'LAL',
        awayName: 'Los Angeles Lakers',
        awayScore: 112,
        awayTotal: 231.4,
        awayEntries: [
          { player: { id: 32, name: 'Magic Johnson', team: 'LAL', pos: 'PG' }, finalScore: 63.2 }
        ],
        home: 1,
        homeAbbr: 'BOS',
        homeName: 'Boston Celtics',
        homeScore: 109,
        homeTotal: 228.9,
        homeEntries: [
          { player: { id: 33, name: 'Larry Bird', team: 'BOS', pos: 'SF' }, finalScore: 66.7 }
        ],
        winner: 'away'
      },
      {
        day: 4,
        week: 1,
        away: 2,
        awayAbbr: 'IND',
        awayName: 'Indiana Pacers',
        awayScore: 99,
        awayTotal: 198.2,
        awayEntries: [
          { player: { id: 31, name: 'Reggie Miller', team: 'IND', pos: 'SG' }, finalScore: 47.6 }
        ],
        home: 0,
        homeAbbr: 'LAL',
        homeName: 'Los Angeles Lakers',
        homeScore: 130,
        homeTotal: 260.3,
        homeEntries: [
          { player: { id: 34, name: 'Shaquille ONeal', team: 'LAL', pos: 'C' }, finalScore: 69.2 }
        ],
        winner: 'home'
      }
    ]
  }
};

const memory = buildSimulationLeagueMemory(state);

assert.equal(memory.version, 1, 'league memory should expose a stable version');
assert.equal(memory.generatedFromGameCount, 3, 'league memory should record how many official games it read');

assert.equal(memory.rivalries.length >= 2, true, 'league memory should track head-to-head rivalry summaries');
const lakersCeltics = memory.rivalries.find((rivalry) => rivalry.key === 'BOS_LAL');
assert.ok(lakersCeltics, 'league memory should include the Lakers/Celtics repeated matchup');
assert.equal(lakersCeltics.meetings, 2);
assert.equal(lakersCeltics.leaderAbbr, 'LAL');
assert.equal(lakersCeltics.leaderWins, 2);
assert.match(lakersCeltics.summary, /Los Angeles Lakers.*2 straight.*Boston Celtics/i);

assert.equal(memory.signatureGames[0].playerName, 'Magic Johnson');
assert.equal(memory.signatureGames[0].fantasyPoints, 71.4);
assert.match(memory.signatureGames[0].summary, /Magic Johnson.*71\.4 FP.*Boston Celtics/i);

assert.ok(memory.momentum.find((entry) => entry.teamAbbr === 'LAL'), 'league memory should summarize team momentum');
assert.match(memory.momentum.find((entry) => entry.teamAbbr === 'LAL').summary, /4-1.*W3/i);

assert.ok(memory.notableMatchups.some((entry) => entry.type === 'blowout'), 'league memory should preserve notable blowout beats');

const beats = buildSimulationLeagueMemoryBeats(memory, { day: 4, limit: 4 });
assert.ok(beats.length >= 3, 'league memory should produce report-ready beats');
assert.equal(beats[0].type, 'signature');
assert.match(beats.map((beat) => beat.text).join(' '), /2 straight|4-1|31-point/i);

const seasonHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');
assert.match(seasonHtml, /simulation-league-memory\.js/, 'season shell should load the league memory module');
assert.match(seasonHtml, /function refreshSimulationLeagueMemory\(\)/, 'season shell should rebuild simulation league memory');
assert.match(seasonHtml, /function renderRevealMemoryBeats\(report\)/, 'league reports should render memory beats');
assert.match(seasonHtml, /seasonState\.leagueMemory=memory/, 'simulation persistence should write league memory into season state');
assert.match(seasonHtml, /id="hubSportsCenterCard"/, 'simulation hub should expose a Fantasy SportsCenter mount');
assert.match(seasonHtml, /function buildFantasySportsCenterSnapshot\(/, 'season shell should build a SportsCenter editorial snapshot from memory');
assert.match(seasonHtml, /function renderFantasySportsCenterCard\(/, 'season shell should render the SportsCenter hub card');
assert.match(seasonHtml, /Fantasy SportsCenter/, 'SportsCenter panel should use the product-facing label');

console.log('simulation league memory test passed');
