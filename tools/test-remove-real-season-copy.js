const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const baseDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(baseDir, relativePath), 'utf8');
}

const files = {
  adminLeagues: read('admin-leagues.html'),
  index: read('index.html'),
  historicSeasons: read('historic-seasons.html'),
  historicalCatalog: read('historical-packs/catalog.json'),
  historicalPackFixtures: read('historical-pack-fixtures.js'),
  historicalPack1996CoverageScript: read('expand-historical-pack-1996-coverage.js'),
  historicalPack1996IngestScript: read('ingest-historical-pack-1996-season-stats.js'),
  myLeagues: read('my-leagues.html'),
  seasonExtracted: read('_season_extracted.js'),
  historicUniverse: read('historic-universe.html'),
  historicalPackDevRunner: read('historical-pack-dev-runner.js'),
  historicalUniverseSlots: read('historical-universe-slots.js'),
  rosterbateSeason: read('rosterbate-season.html'),
  simulationSetup: read('rosterbate-simulation-setup.html'),
  simulationLeagueEngine: read('simulation-league-engine.js')
};

for (const [name, text] of Object.entries(files)) {
  assert.doesNotMatch(text, /Play The Real Season/, `${name} should not market real-season replay`);
  assert.doesNotMatch(text, /relive the real season/i, `${name} should not invite users to relive the real season`);
  assert.doesNotMatch(text, /the historical league intact/i, `${name} should not promise the historical league intact`);
  assert.doesNotMatch(text, /replaying one roster intact/i, `${name} should not market preserved-roster replay`);
}

assert.doesNotMatch(
  files.historicalCatalog,
  /preserved roster replay/i,
  'historical-packs/catalog.json should not market preserved-roster replay in loader-backed catalog copy'
);
assert.doesNotMatch(
  files.historicalCatalog,
  /real-season boot/i,
  'historical-packs/catalog.json should not market real-season boot in loader-backed catalog copy'
);
assert.doesNotMatch(
  files.historicalCatalog,
  /real season data/i,
  'historical-packs/catalog.json should not market real-season data in loader-backed catalog copy'
);
assert.doesNotMatch(
  files.historicalCatalog,
  /Sim Season|Sim Season \(After Draft\)/i,
  'historical-packs/catalog.json should not feed older Sim Season labels back into the live archive browser'
);
assert.match(
  files.historicalCatalog,
  /Simulation League|Simulation League \(After Draft\)/i,
  'historical-packs/catalog.json should use simulation-league labels in loader-backed archive metadata'
);
assert.doesNotMatch(
  files.index,
  /Historic Seasons|Browse Historic Seasons|Classic Era Mode|single-player draft board|Solo Reps|No Single Player Leagues Yet|<div class="cta-pane-title">Single Player<\/div>|My Single Player Leagues|personal season manager|solo run left off|Choose one of your solo saves/i,
  'index.html should not market homepage archive and local-league entry points with older historical or single-player wording'
);
assert.doesNotMatch(
  files.adminLeagues,
  /<div class="summary-label">Solo<\/div>|Single-player and personal leagues|solo league|No solo leagues|Solo-heavy snapshot|This snapshot leans solo|Type: Solo/i,
  'admin-leagues.html should not present local leagues with older solo or single-player wording'
);
assert.match(
  files.adminLeagues,
  /<div class="summary-label">Local<\/div>|Local and personal leagues|local league|No local leagues|Local-heavy snapshot|This snapshot leans local|Type: Local/i,
  'admin-leagues.html should present non-multiplayer leagues with local league wording'
);
assert.match(
  files.index,
  /Simulation Archives|Browse Simulation Archives|Simulation Archive|local draft board|Local Reps|No Local Leagues Yet|Local League|My Local Leagues|local league manager|saved local league left off|Choose one of your local saves/i,
  'index.html should frame homepage archive and local-league entry points with simulation-first wording'
);
assert.match(
  files.index,
  /const looksLikeLocalLeague=!payload\.multiplayer[\s\S]*Array\.isArray\(payload\.teams\)[\s\S]*Array\.isArray\(payload\.allRosters\)[\s\S]*Array\.isArray\(payload\.standings\)[\s\S]*activeSeasonBackend:'simulation'[\s\S]*historicalEntryMode:String\(payload\.historicalEntryMode \|\| 'simulation_season'\)\.trim\(\) \|\| 'simulation_season'[\s\S]*legacyHistoricalStatMode:false/s,
  'index.html should normalize both explicit simulation payloads and older local league-shaped saves before reopening them'
);
assert.doesNotMatch(
  files.simulationLeagueEngine,
  /real_season_stats_plus_light_authored_tuning/,
  'simulation-league-engine.js should not persist removed real_season wording in sim profile metadata'
);
assert.doesNotMatch(
  files.historicSeasons,
  /Replay Era Rosters/i,
  'historic-seasons.html should not expose a replay lane in the archive browser'
);
assert.doesNotMatch(
  files.historicSeasons,
  /Real Season/i,
  'historic-seasons.html should not advertise a removed real-season mode'
);
assert.doesNotMatch(
  files.historicSeasons,
  /playRealSeasonBtn/i,
  'historic-seasons.html should not keep the replay button id around'
);
assert.doesNotMatch(
  files.historicSeasons,
  /seasonUrl:\s*'rosterbate-season\.html\?sport=nba&historical=dev/i,
  'historic-seasons.html should not route the season launch through the removed dev historical mode'
);
assert.doesNotMatch(
  files.historicSeasons,
  /plannedModes:\s*\[[^\]]*Replay Era Rosters[^\]]*\]/i,
  'historic-seasons.html should not keep replay-era planned mode copy'
);
assert.doesNotMatch(
  files.myLeagues,
  /continue your saved historical run/i,
  'my-leagues.html should keep generic shared-season fallback copy'
);
assert.doesNotMatch(
  files.myLeagues,
  /single-player/i,
  'my-leagues.html should not present unified local saves as a separate single-player mode'
);
assert.doesNotMatch(
  files.myLeagues,
  /Solo Leagues|Solo Saves|solo league/i,
  'my-leagues.html should present local simulation saves with simulation-first local league wording'
);
assert.match(
  files.myLeagues,
  /Open the shared season manager and continue your shared season\./,
  'my-leagues.html should keep a neutral shared-season fallback line'
);
assert.match(
  files.myLeagues,
  /Local Leagues|local league|saved local leagues/i,
  'my-leagues.html should describe local saves with local league wording'
);
assert.match(
  files.myLeagues,
  /const looksLikeLocalLeague=!payload\.multiplayer[\s\S]*Array\.isArray\(payload\.teams\)[\s\S]*Array\.isArray\(payload\.allRosters\)[\s\S]*Array\.isArray\(payload\.standings\)[\s\S]*activeSeasonBackend:'simulation'[\s\S]*historicalEntryMode:String\(payload\.historicalEntryMode \|\| 'simulation_season'\)\.trim\(\) \|\| 'simulation_season'[\s\S]*legacyHistoricalStatMode:false/s,
  'my-leagues.html should normalize both explicit simulation payloads and older local league-shaped saves before reopening them'
);
assert.match(
  files.adminLeagues,
  /looksLikeLocalLeague=!payload\.multiplayer&&Array\.isArray\(payload\.teams\)&&Array\.isArray\(payload\.allRosters\)&&Array\.isArray\(payload\.standings\)[\s\S]*activeSeasonBackend:"simulation"[\s\S]*historicalEntryMode:String\(payload\.historicalEntryMode\|\|"simulation_season"\)\.trim\(\)\|\|"simulation_season"[\s\S]*legacyHistoricalStatMode:false/s,
  'admin-leagues.html should normalize both explicit simulation payloads and older local league-shaped saves before reopening them from the admin surface'
);

assert.match(
  files.historicSeasons,
  /Simulation ratings coverage|Simulation Ratings Coverage|simulation-ready ratings/,
  'historic-seasons.html should describe archive coverage with simulation-first wording'
);
assert.doesNotMatch(
  files.historicSeasons,
  /RosterBate - Historic Seasons|Loading historical pack browser|Historical mode only works if users trust it|No historical packs/i,
  'historic-seasons.html should not keep old historical-browser chrome copy once the unified simulation archive replacement is active'
);
assert.match(
  files.historicSeasons,
  /Simulation Archives|simulation archive browser|Archive mode is no longer a hidden tool|No archive packs/i,
  'historic-seasons.html should present the archive browser as a simulation archive surface'
);
assert.doesNotMatch(
  files.historicSeasons,
  /Sim Season|Sim After Draft/i,
  'historic-seasons.html should not keep older Sim Season labels in visible archive-browser copy'
);
assert.match(
  files.historicSeasons,
  /Simulation League|League After Draft/i,
  'historic-seasons.html should use simulation-league wording for archive launch surfaces'
);
assert.doesNotMatch(
  files.historicSeasons,
  /Historical Stat Coverage|players with historical season production|No saved historical universes yet|Historical universe slots are unavailable/i,
  'historic-seasons.html should not keep older historical-universe fallback wording in archive details and saved-slot surfaces'
);
assert.doesNotMatch(
  files.historicUniverse,
  /RosterBate - Historical Universe|Saved Historical Universe|saved historical universe|Saved historical run/i,
  'historic-universe.html should not keep old historical-universe chrome copy once the unified simulation archive replacement is active'
);
assert.match(
  files.historicUniverse,
  /Simulation Archive|Saved Simulation Archive|saved simulation archive/i,
  'historic-universe.html should present saved universes as simulation archives'
);
assert.doesNotMatch(
  files.historicUniverse,
  /This saved run keeps that pack alive|full turn-of-the-century historical universe|real modern historical universe/i,
  'historic-universe.html should not keep historical-run fallback summaries once the archive surface is simulation-first'
);
assert.match(
  files.historicalCatalog,
  /simulation-ready ratings/i,
  'historical-packs/catalog.json should carry simulation-first pack summary copy for loader-backed runtime'
);
assert.doesNotMatch(
  files.historicalPackDevRunner,
  /Historical pack dev runner|Historical pack runner|historical packs and archive flows|selected historical pack|Real pack load failed|local historical season boot/i,
  'historical-pack-dev-runner.js should not keep older historical-pack-facing chrome copy in localhost tooling'
);
assert.match(
  files.historicalPackDevRunner,
  /Simulation archive dev runner|Simulation archive runner|simulation archives and pack flows|selected simulation archive pack|Archive pack load failed|local simulation archive boot/i,
  'historical-pack-dev-runner.js should describe localhost tooling as a simulation archive authoring surface'
);
assert.doesNotMatch(
  files.historicalPackFixtures,
  /historical season boot development|Historical Pack Lab|historical universe/i,
  'historical-pack-fixtures.js should not keep older historical fixture copy in localhost fallback content'
);
assert.match(
  files.historicalPackFixtures,
  /simulation archive boot development|Dev Tools|simulation archive/i,
  'historical-pack-fixtures.js should describe fallback fixture content with simulation-first wording'
);
assert.doesNotMatch(
  files.historicalPack1996CoverageScript,
  /historical season|historical universe|historical mode/i,
  'expand-historical-pack-1996-coverage.js should not keep older historical mode phrasing in generated pack copy'
);
assert.match(
  files.historicalPack1996CoverageScript,
  /simulation archive|ratings-ready pack|simulation stat mode|source pack/i,
  'expand-historical-pack-1996-coverage.js should generate simulation-first pack copy'
);
assert.doesNotMatch(
  files.historicalPack1996IngestScript,
  /Historical players|historical season boots|historical rankings/i,
  'ingest-historical-pack-1996-season-stats.js should not keep older historical replay wording in generated pack copy'
);
assert.match(
  files.historicalPack1996IngestScript,
  /Archive players|simulation archive boots|archive rankings/i,
  'ingest-historical-pack-1996-season-stats.js should generate simulation-first pack copy'
);
assert.doesNotMatch(
  files.historicalUniverseSlots,
  /Historical universe/i,
  'historical-universe-slots.js should not keep older historical-universe fallback copy in saved slot metadata'
);
assert.match(
  files.historicalUniverseSlots,
  /Simulation archive/i,
  'historical-universe-slots.js should expose simulation-archive fallback copy for saved slot metadata'
);
assert.match(
  files.rosterbateSeason,
  /Ratings-driven league engine \+ sport-specific tuning|live ratings-based league flow/,
  'rosterbate-season.html should describe simulation ratings with current league-flow wording'
);
assert.doesNotMatch(
  files.rosterbateSeason,
  /single-player shell layout|shared single-player team surface|Single Player leagues default you as commissioner|single-player leagues because|same historical player pool you just drafted|historical universe slot save|historical slot\. Booting from runtime storage instead|Loading saved historical universe slot|Requested historical universe slot was not found|In solo leagues, AI teams will review offers automatically|pending historical season boot flag|Historical season boot was requested|Historical pack dev boot failed/i,
  'rosterbate-season.html should not present unified simulation leagues with legacy single-player phrasing in visible UI copy'
);
assert.match(
  files.rosterbateSeason,
  /polished league shell|shared team-management surface|Local leagues default you as commissioner|Unavailable in local leagues|same source-pack player pool you just drafted|simulation archive slot save|simulation archive slot\. Booting from runtime storage instead|Loading saved simulation archive slot|Requested simulation archive slot was not found|In local leagues, AI teams will review offers automatically|pending simulation archive boot flag|Simulation archive boot was requested|Simulation archive dev boot failed/i,
  'rosterbate-season.html should use neutral unified-engine league wording in season-shell copy'
);
assert.doesNotMatch(
  files.simulationSetup,
  /Single-player simulation|Single player|single-player simulation league/i,
  'rosterbate-simulation-setup.html should not market the unified setup flow as a separate single-player mode'
);
assert.match(
  files.simulationSetup,
  /Local simulation league|Local control|local simulation league/i,
  'rosterbate-simulation-setup.html should present the setup flow as a local simulation league launch'
);
assert.match(
  files.simulationLeagueEngine,
  /Ratings-driven simulation \+ sport-specific tuning/,
  'simulation-league-engine.js should persist simulation ratings as ratings-driven simulation plus sport-specific tuning'
);

console.log('remove real season copy audit test passed');
