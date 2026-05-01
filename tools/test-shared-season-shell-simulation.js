const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');
const simMatchupHtml = fs.readFileSync(path.join(__dirname, '..', 'sim-matchup.html'), 'utf8');
const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'simulation-season-adapter.js'), 'utf8');
const portraitSource = fs.readFileSync(path.join(__dirname, '..', 'player-portrait-assets.js'), 'utf8');
const portraitManifest = fs.readFileSync(path.join(__dirname, '..', 'assets', 'player-portraits', 'manifest.json'), 'utf8');
const portraitManifestBuilder = fs.readFileSync(path.join(__dirname, 'build-player-portrait-manifest.js'), 'utf8');

assert.match(html, /function assignSimulationNbaBenchPlayerToSlotFromShell\(/, 'shared shell should support moving NBA bench players into starter slots');
assert.match(html, /function clearSimulationNbaSlotAssignmentFromShell\(/, 'shared shell should support clearing NBA starter slots');
assert.match(html, /function startSimulationRosterMoveFromShell\(/, 'shared shell should expose simulation roster move mode');
assert.match(html, /function applySimulationRosterMoveToSlotFromShell\(/, 'shared shell should expose simulation move-mode landing choices');
assert.match(html, /healthLabel/, 'shared shell roster rows should render player health labels');
assert.match(html, /statChips/, 'shared shell roster rows should render player stat chips');
assert.doesNotMatch(html, /\$\{renderStatChips\(entry\)\}/, 'shared shell roster rows should keep stat chips out of the player-name cell when stat columns are visible');
assert.doesNotMatch(html, /const statChipsMarkup=renderWaiverStatChips\(row,4\)/, 'shared shell waiver table rows should keep stat chips out of the player-name cell when stat columns are visible');
assert.match(html, /id="teamSettingsInjuries"/, 'team settings should expose an AI injuries toggle for simulation leagues');
assert.match(html, /injuriesEnabled:\s*injuriesEnabled/, 'team settings save should persist the AI injuries toggle through the simulation adapter');
assert.match(html, /id="seasonLeagueHomeLink"/, 'season shell should expose a top-nav league home button');
assert.match(html, /onclick="goPage\('hub'\)"/, 'league home button should return to the in-league hub instead of leaving the season manager');
assert.match(html, /function updateSeasonLeagueHomeLink\(/, 'season shell should show the league home button once season data is loaded');
assert.match(html, /function bindHubStandingsInteractions\([\s\S]*openViewer\(teamIdx\)/, 'league-home standings rows should open the team lineup viewer');
assert.match(html, /\.hub-standings-row:hover/, 'league-home standings rows should show visible hover feedback');
assert.match(html, /\.hub-standings-row\.is-viewing/, 'league-home standings rows should retain a selected state while the lineup viewer is open');
assert.match(html, /id="vActions" class="viewer-actions viewer-actions-top"/, 'team lineup viewer actions should live in the popup header');
assert.doesNotMatch(html, /View Standings<\/button>/, 'team lineup viewer should not include a redundant view-standings action');
assert.match(html, /tradeTargetLabel/, 'team lineup viewer should surface top trade targets in the trade lane');
assert.match(html, /bench=roster\.filter\(p=>!sIds\.includes\(p\.id\)\)\.sort/, 'team lineup viewer should sort bench depth by fantasy strength');
assert.match(html, />GAME<\/span>/, 'team lineup viewer rows should make game-day players visually obvious');
assert.match(html, />OFF<\/span>/, 'team lineup viewer rows should make off-day players visually obvious');
assert.match(html, /playerDetailNameButton\(p\)/, 'team lineup viewer player names should open the player detail modal');
assert.match(html, /id="tradeTargetCard-\$\{target\.ti\}"/, 'trade target cards should expose stable ids for viewer-triggered trade focus');
assert.match(html, /tradeTargetCard-\$\{Number\(ti\)\}`\)\?\.classList\.add\('is-viewing'\)/, 'opening a trade from the viewer should visibly focus the selected trade partner');
assert.match(html, /\[data-trade-team\]\.is-viewing/, 'trade target cards should have a visible focused state');
assert.match(html, /const byFantasyValue=\(a,b\)=>Number\(b\?\.fp\|\|0\)-Number\(a\?\.fp\|\|0\)/, 'trade builder should sort both rosters by fantasy value');
assert.match(html, /Build a package up to 5-for-5/, 'trade builder modal should explain package depth');
assert.match(html, /Highest FP First/, 'trade builder column labels should explain the sorted order');
assert.match(html, /id="localTradeBuilderModal"/, 'local trade builder should render in a modal instead of the old inline builder');
assert.match(html, /function tradePlayerKey\(value\)/, 'local trade builder should normalize player ids as stable string keys');
assert.match(html, /function normalizeTradePackageIds\(ids\)/, 'trade modal internals should expose shared package id normalization');
assert.match(html, /function buildTradePackagePreviewModel\(/, 'trade modal internals should expose a shared package preview model');
assert.match(html, /const localTradePreview=buildTradePackagePreviewModel\(\{[\s\S]*outgoingIds:trP\.give[\s\S]*incomingIds:trP\.get/, 'local trade modal should use the shared package preview model for selected packages');
assert.match(html, /Package limit is 5 players per side/, 'local trade builder should cap package size before sending');
assert.match(html, /getLocalTradeBuilderFairness\(givePlayers,getPlayers,tradeTeamName\(trP\.ti\)\)/, 'local trade builder should use fairness gating before enabling send');
assert.match(html, /id="playerDetailModal"/, 'season shell should expose a reusable player detail modal');
assert.match(html, /function openPlayerDetailModal\(/, 'season shell should open player details from any player-name click');
assert.match(html, /class="player-name-link"/, 'season shell should render player names as detail buttons');
assert.match(html, /PLAYER DOSSIER/, 'player detail modal should use native RosterBate dossier styling');
assert.match(html, /Trade posture/, 'player detail modal should use RosterBate trade posture language');
assert.match(html, /Game Log/, 'player detail modal should include game-log context');
assert.match(html, /Recent News/, 'player detail modal should include recent-news context');
assert.match(html, /function renderPlayerPortrait\(/, 'season shell should render player portraits from a shared helper instead of jersey-only avatars');
assert.match(html, /class="pav player-portrait"/, 'season shell player avatars should use portrait markup');
assert.match(html, /<script src="player-portrait-assets\.js"><\/script>/, 'season shell should load the shared portrait asset pipeline');
assert.match(html, /RosterBatePlayerPortraits\.renderPortraitMarkup/, 'season shell should prefer shared portrait image markup when available');
assert.match(html, /portrait-state-injured/, 'season shell should style injured portrait states');
assert.match(html, /portrait-state-offday/, 'season shell should style off-day portrait states');
assert.match(html, /portrait-state-takeover/, 'season shell should style takeover portrait states');
assert.match(html, /portrait-card-bg/, 'season shell player portraits should use illustrated card-style portrait panels');
assert.match(html, /portrait-ink-outline/, 'season shell player portraits should include ink-outline illustration details');
assert.match(html, /\.hub-shell\{[^}]*max-width:none/, 'league home shell should use the full available viewport width');
assert.match(html, /\.hub-lower\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'league home lower content should spread into a two-column desktop grid');
assert.match(html, /function openSimulationRevealDayLiveMatchup\(/, 'simulation hub reveal CTA should launch the live matchup popup instead of only batch-simming the day');
assert.match(html, /function renderHub\(\)\{[\s\S]*const sport=/, 'regular league hub should derive sport context before rendering NBA/NFL-specific copy');
assert.match(html, /if\(actionId==='sim-day' && primaryAction\?\.shellTone==='reveal'\) return 'openSimulationRevealDayLiveMatchup\(\)'/, 'NBA reveal-day primary actions should route through the embedded live sim popup');
assert.match(simMatchupHtml, /postMessage\(\{ type:'rosterbate-live-matchup-committed'/, 'embedded live matchup should notify the season shell after it writes back a result');
assert.match(simMatchupHtml, /postMessage\(\{ type:'rosterbate-live-matchup-return'/, 'embedded live matchup should let the popup close back to the season shell');
assert.match(simMatchupHtml, /id="speed-3x" onclick="setSpeed\(3\)">3×<\/button>/, 'live matchup controls should include a 3x speed option');
assert.match(simMatchupHtml, /let speed = 3;/, 'live matchup should default to 3x speed');
assert.match(simMatchupHtml, /function renderLivePlayerPortrait\(/, 'live matchup should render player portraits in roster rows');
assert.match(simMatchupHtml, /class="live-player-portrait"/, 'live matchup roster rows should use portrait markup instead of dot-only players');
assert.match(simMatchupHtml, /<script src="player-portrait-assets\.js"><\/script>/, 'live matchup should load the shared portrait asset pipeline');
assert.match(simMatchupHtml, /RosterBatePlayerPortraits\.renderPortraitMarkup/, 'live matchup should prefer shared portrait image markup when available');
assert.match(simMatchupHtml, /function refreshLivePortraitPanels\(/, 'live matchup should refresh roster rows after portrait manifest load');
assert.match(simMatchupHtml, /loadLivePortraitManifest\(\)/, 'live matchup should trigger an explicit portrait manifest refresh after boot');
assert.match(simMatchupHtml, /portrait-state-scoring/, 'live matchup should animate scoring portrait states');
assert.match(simMatchupHtml, /portrait-state-takeover/, 'live matchup should animate takeover portrait states');
assert.match(simMatchupHtml, /portrait-card-bg/, 'live matchup player portraits should use illustrated card-style portrait panels');
assert.match(simMatchupHtml, /portrait-ink-outline/, 'live matchup player portraits should include ink-outline illustration details');
assert.match(simMatchupHtml, /player-showcase-card/, 'live matchup rows should frame portraits as compact player showcase cards');
assert.match(simMatchupHtml, /player-event-badge/, 'live matchup scoring events should surface as visible portrait-card badges');
assert.match(simMatchupHtml, /portrait-pop/, 'live matchup portraits should animate when a player produces a scoring event');
assert.match(portraitSource, /RosterBatePlayerPortraits/, 'shared portrait asset pipeline should expose the global API');
assert.match(portraitSource, /rbPlayerPortraitOverrides/, 'shared portrait asset pipeline should support local real-image overrides');
assert.match(portraitSource, /loadManifest/, 'shared portrait asset pipeline should load a real-image manifest');
assert.match(portraitSource, /stateClassList/, 'shared portrait asset pipeline should generate reusable animation state classes');
assert.match(portraitSource, /buildGeneratedPortraitSvg/, 'shared portrait asset pipeline should include generated SVG fallback art');
assert.match(portraitSource, /player-portrait-img/, 'shared portrait asset pipeline should render image-backed portrait markup');
assert.doesNotThrow(() => JSON.parse(portraitManifest), 'portrait manifest should be valid JSON');
assert.match(portraitManifestBuilder, /michael-jordan__CHI\.png/, 'portrait manifest builder should document the team-aware filename convention');
assert.match(portraitManifestBuilder, /--check/, 'portrait manifest builder should support CI-safe manifest checks');

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSharedSinglePlayerRosterMarkers(markup, label) {
  assert.match(markup, /Roster Operations/, `${label} should render the shared single-player roster operations heading`);
  assert.match(markup, /season-mini-tabs/, `${label} should render the shared single-player mini-tab rail`);
  assert.match(markup, /season-mini-tab[^>]*>\s*Stats\s*</, `${label} should render the shared Stats tab`);
  assert.match(markup, /season-mini-tab[^>]*>\s*Matchup\s*</, `${label} should render the shared Matchup tab`);
  assert.match(markup, /<th>Action<\/th>[\s\S]*<th>Opp<\/th>[\s\S]*<th>Time<\/th>[\s\S]*<th>Status<\/th>[\s\S]*<th>FP<\/th>[\s\S]*<th>TFP<\/th>/, `${label} should keep the single-player roster table columns`);
  assert.match(markup, /Reserves \/ IR|Bench \/ Depth/, `${label} should keep the single-player reserve and IR section label`);
  assert.doesNotMatch(markup, /Lineup Control/, `${label} should not keep the legacy simulation-only lineup-control card`);
}

function assertSimulationParityMeta(markup, label) {
  assert.match(markup, /season-team-link[^>]*>[^<]*Waiver Order[^<]*</, `${label} should surface waiver-order parity metadata`);
  assert.match(markup, /season-team-link[^>]*>[^<]*Watch List[^<]*</, `${label} should keep the watch-list affordance visible`);
  assert.match(markup, /season-team-link(?:-btn)?[^>]*>[^<]*Settings[^<]*</, `${label} should keep the team-settings affordance visible`);
}

function extractBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find start marker: ${startMarker}`);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find end marker: ${endMarker}`);
  return html.slice(start, end);
}

function extractFrom(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find start marker: ${startMarker}`);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find end marker: ${endMarker}`);
  return html.slice(start, end);
}

const harnessSource = `
let HISTORICAL_SLOT_QUOTA_BLOCKED = false;
let currentRbUser = null;
const TCOLORS = ['#2563eb', '#16a34a', '#f97316'];
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, (char)=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
function renderTeamInitialAvatar(name, teamCode, size){ return '<span class="pav">'+String(name||teamCode||'P').slice(0,2)+'</span>'; }
function renderSidePowerups(){}
function buildSeasonNowCard(card){ return '<div class="season-now-card"><div>'+String(card?.label||'')+'</div><div>'+String(card?.value||'')+'</div></div>'; }
function renderHub(){}
${extractBetween('const DEFAULT_PAGES=', 'let CURRENT_SPORT =')}
${extractBetween('function getRequestedSimulationMode(', 'function loadHistoricalUniverseSlotState(')}
${extractBetween('function loadHistoricalUniverseSlotState(', 'function shouldBootHistoricalDevSeason(')}
${extractBetween('function getMatchingLocalLeagueData(', 'function getSharedSeasonActorId(')}
${extractBetween('function isHistoricalSimulationUniverse(', 'function isHistoricalDraftUniverse(')}
${extractBetween('function setSeasonSidePanelVisible(', 'function buildPowerupCardsHtml(')}
${extractBetween('function setHubSummaryStatLabels(', 'function persistSimulationSeasonState(')}
${extractBetween('function persistSimulationSeasonState(', 'function buildPowerupCardsHtml(')}
${extractBetween('function syncGameStateToD()', 'function queueSharedSeasonSave(')}
${extractBetween('function handleRosterAction(', 'function closeIlModal(')}
${extractBetween('function teamName(', 'function logActivity(')}
${extractBetween('function getLatestRevealReportDay(', 'function buildSimulationDayRunnerSnapshot(')}
${extractBetween('function getSharedSimulationSport(', 'function renderSimulationHubInSharedShell(')}
${extractBetween('function renderSimulationHubInSharedShell(', 'function renderSimulationWaiverInSharedShell(')}
${extractBetween('function renderSimulationWaiverInSharedShell(', 'function claimSimulationFreeAgentFromShell(')}
${extractBetween('function claimSimulationFreeAgentFromShell(', 'function renderSimulationTradesInSharedShell(')}
${extractBetween('function renderSimulationTradesInSharedShell(', 'function applySimulationTradeFromShell(')}
${extractBetween('function applySimulationTradeFromShell(', 'function renderSimulationStandingsInSharedShell(')}
${extractBetween('function getTradeFairnessPlayerValue(', 'function getTradeConversationKey(')}
${extractBetween('function getTradeConversationKey(', 'function renderTrades(')}
${extractBetween('function renderTrades(', 'function renderStandingsTeamDetails(')}
${extractBetween('function renderSimulationStandingsInSharedShell(', 'function renderSimulationRosterInSharedShell(')}
${extractBetween('function applySimulationSuggestedLineupFromShell(', 'function renderSimulationRosterInSharedShell(')}
${extractBetween('function renderSimulationRosterInSharedShell(', 'function renderSimulationScheduleInSharedShell(')}
${extractBetween('function renderSimulationScheduleInSharedShell(', 'function renderSimulationPlayoffsInSharedShell(')}
${extractBetween('function renderSimulationPlayoffsInSharedShell(', 'function renderActiveSeasonScreen(')}
${extractBetween('function getActiveSeasonPageId(', 'function buildLifetimeSeasonPayload(')}
${extractBetween('function getAuthoritativeSimulationSeasonState(', 'let wAdd=null')}
${extractBetween('function weekForDay(', 'function dayOfWeek(')}
${extractBetween('function initSeason(', 'function refreshSeasonPlayerUniverse(').replace('function initSeason(', 'function realInitSeason(')}
${extractBetween('async function loadDemo(', 'function isDemoSeasonData(')}
${extractFrom('window.onload=async function(){', 'function clearAllData(')}

module.exports = {
  getRequestedSimulationMode,
  getRequestedHistoricalUniverseSlotId,
  getResolvedSeasonBackend,
  getActiveSeasonBackend,
  normalizeLocalLeagueDraftSnapshot,
  doesSavedSeasonMatchRequestedLeague,
  getLeagueTeamCount,
  getLeagueRosteredPlayerCount,
  shouldPreferLocalLeagueData,
  resolveSeasonManagerLeagueDataLoad,
  getLatestRevealReportDay,
  getDailyRevealReport,
  getSimulationDayLog,
  readCompletedSimulationDraftState,
  resolveCompletedSimulationDraftSeasonBoot,
  consumeCompletedSimulationDraftFallbackBoot,
  isSharedSimulationSeason,
  shouldPersistSharedSimulationState,
  getActiveSeasonPages,
  getActiveSeasonLabels,
  loadHistoricalUniverseSlotState,
  normalizeSharedSimulationSeasonBootState,
  buildSharedSimulationPersistenceState,
  persistHistoricalUniverseSlotSnapshot,
  persistSimulationSeasonState,
  syncGameStateToD,
  findSimulationRevealLiveMatchup,
  renderSimulationHubInSharedShell,
  applySimulationPowerupFromShell,
  renderSimulationRosterInSharedShell,
  renderSimulationScheduleInSharedShell,
  renderSimulationPlayoffsInSharedShell,
  renderSimulationWaiverInSharedShell,
  renderSimulationTradesInSharedShell,
  updateSimulationTradePreviewFromShell,
  openSimulationTradeBuilderModal,
  closeSimulationTradeBuilderModal,
  renderSimulationTradeBuilderModal,
  getSimulationTradeBuilderSelectedIds,
  getSimulationTradeBuilderPlayerById,
  updateSimulationTradeBuilderPreview,
  applySimulationTradeBuilderPackage,
  renderSimulationStandingsInSharedShell,
  submitSimulationWaiverClaimFromShell,
  cancelSimulationWaiverClaimFromShell,
  claimSimulationFreeAgentFromShell,
  applySimulationTradeFromShell,
  tradePlayerKey,
  findRosterPlayerByTradeId,
  normalizeTradePackageIds,
  resolveTradePackagePlayers,
  getTradePackageSideValue,
  buildTradePackagePreviewModel,
  getLocalTradeBuilderFairness,
  renderTrades,
  openTrade,
  toggleTr,
  submitTrade,
  validateTradeOfferStillAvailable,
  acceptTrade,
  applySimulationSuggestedLineupFromShell,
  handleRosterAction,
  getActiveSeasonPageId,
  isDayRevealed,
  getDayResult,
  getTeamWeekRevealedScore,
  getLiveStandingsSnapshot,
  revealDay,
  settleWeek,
  goPage,
  advanceWeek,
  initSeason: realInitSeason,
  resolveLocalSavedSeasonAutoLoad,
  loadDemo,
  setActiveSeasonMode(value){ ACTIVE_SEASON_MODE = value; },
  getActiveSeasonMode(){ return ACTIVE_SEASON_MODE; },
  setSeasonModeAdapter(value){ SEASON_MODE_ADAPTER = value; },
  getSeasonModeAdapter(){ return SEASON_MODE_ADAPTER; },
  setData(value){ D = value; },
  getData(){ return D; },
  setGame(value){ G = value; },
  getGame(){ return G; }
};
`;

function createElement(id) {
  const shell = { style: {} };
  const classes = new Set();
  if (SCREEN_IDS.has(id)) classes.add('screen');
  return {
    id,
    textContent: '',
    innerHTML: '',
    style: {},
    value: '',
    checked: false,
    disabled: false,
    attributes: {},
    classList: {
      add(...tokens) {
        tokens.forEach((token) => classes.add(String(token)));
      },
      remove(...tokens) {
        tokens.forEach((token) => classes.delete(String(token)));
      },
      contains(token) {
        return classes.has(String(token));
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      this[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelectorAll() {
      return [];
    },
    closest(selector) {
      return selector === '.season-screen-shell' ? shell : null;
    },
    remove() {
      delete elements[id];
      this.removed = true;
    },
    scrollIntoView() {},
    _shell: shell
  };
}

function parseAttributes(markup) {
  const attrs = {};
  const attrPattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)=(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrPattern.exec(String(markup || '')))) {
    attrs[match[1]] = match[2] ?? match[3] ?? '';
  }
  return attrs;
}

function registerMarkupElements(markup) {
  const source = String(markup || '');
  const idPattern = /id="([^"]+)"/g;
  let match;
  while ((match = idPattern.exec(source))) {
    const id = match[1];
    if (!elements[id]) elements[id] = createElement(id);
  }
  const inputPattern = /<input\b[^>]*>/gi;
  let inputIndex = 0;
  while ((match = inputPattern.exec(source))) {
    const attrs = parseAttributes(match[0]);
    const id = attrs.id || `__input_${inputIndex++}_${attrs['data-player-id'] || attrs.value || 'field'}`;
    const element = elements[id] || createElement(id);
    element.tagName = 'INPUT';
    element.type = attrs.type || 'text';
    element.value = attrs.value || attrs['data-player-id'] || '';
    element.checked = Boolean(attrs.checked);
    element.disabled = /\sdisabled(?:\s|>|=)/i.test(match[0]);
    Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
    elements[id] = element;
  }
  const buttonPattern = /<button\b[^>]*>/gi;
  while ((match = buttonPattern.exec(source))) {
    const attrs = parseAttributes(match[0]);
    if (!attrs.id) continue;
    const element = elements[attrs.id] || createElement(attrs.id);
    element.tagName = 'BUTTON';
    element.disabled = /\sdisabled(?:\s|>|=)/i.test(match[0]);
    Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
    elements[attrs.id] = element;
  }
}

function elementsBodyHtml() {
  return Object.values(elements).map((element) => String(element.innerHTML || '')).join('\n')
    + '\n'
    + String(sandbox.document?.body?.innerHTML || '')
    + '\n'
    + String(sandbox.document?.body?.lastInsertedHTML || '');
}

const SCREEN_IDS = new Set(['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'playoffs', 'commissioner']);
const elements = Object.fromEntries([
  'hub',
  'roster',
  'matchup',
  'waiver',
  'trades',
  'standings',
  'playoffs',
  'commissioner',
  'hn',
  'rn',
  'mn',
  'wn',
  'tn',
  'stn',
  'pn',
  'hubLeagueName',
  'hubName',
  'hubRec',
  'hubCycleMeta',
  'hubFormat',
  'hubScoringType',
  'hubTeamCount',
  'hubOpp',
  'hubProj',
  'hubOppProj',
  'hubStreak',
  'hubOppLabel',
  'hubProjLabel',
  'hubOppProjLabel',
  'hubStreakLabel',
  'hubSettingsLink',
  'hubSettingsDivider',
  'hubLeagueTeamsButton',
  'hubPowerupsTitle',
  'hubTeamSettingsButton',
  'rbChatTitle',
  'rbOnlineCount',
  'rbChatPrompt',
  'rbMsgs',
  'hubMatchupsTitle',
  'hubMatchupActionTitle',
  'hubMatchupActionSub',
  'rosterScheduleChip',
  'matchupTitle',
  'matchupNote',
  'advBtn',
  'hubMatchups',
  'rWk',
  'rosterContent',
  'rosterPowerups',
  'mWk',
  'matchupContent',
  'matchupPowerups',
  'playoffsContent',
  'playoffsPowerups',
  'waiverContent',
  'waiverPowerups',
  'tradesContent',
  'tradesPowerups',
  'standingsContent',
  'standingsPowerups'
].map((id) => [id, createElement(id)]));

const sandboxConsole = {
  ...console,
  warn() {}
};

let persistedReason = null;
let completedDraftState = null;
let completedDraftClearCount = 0;
let completedDraftUpsertInput = null;
let completedDraftUpsertOptions = null;
let completedDraftUpsertError = null;
let createdSimulationAdapters = [];
let historicalSlotUpsertCalls = [];
let historicalSlotStateById = Object.create(null);
let demoInitCalls = 0;
let demoViewCalls = 0;
let demoToasts = [];
let lastEmptyState = null;
let simulationStubState = null;

function buildSimulationStubState(phase = 'regular_season') {
  const postseasonState = phase === 'regular_season'
    ? {
      phase: 'regular_season',
      currentRound: null,
      currentDay: 12,
      playIn: null,
      bracket: null,
      seriesById: {},
      currentDaySchedule: [],
      champion: null,
      runnerUp: null,
      completedAt: null
    }
    : phase === 'completed'
    ? {
      phase: 'completed',
      currentRound: 'finals',
      currentDay: 15,
      playIn: {
        east: {
          topSix: [
            { seed: 1, teamAbbr: 'BOS', teamName: 'Boston Celtics' },
            { seed: 2, teamAbbr: 'MIL', teamName: 'Milwaukee Bucks' }
          ],
          sevenEight: [
            { seed: 7, teamAbbr: 'IND', teamName: 'Indiana Pacers' },
            { seed: 8, teamAbbr: 'MIA', teamName: 'Miami Heat' }
          ],
          nineTen: [
            { seed: 9, teamAbbr: 'PHI', teamName: 'Philadelphia 76ers' },
            { seed: 10, teamAbbr: 'ATL', teamName: 'Atlanta Hawks' }
          ]
        },
        west: {
          topSix: [
            { seed: 1, teamAbbr: 'LAL', teamName: 'Los Angeles Lakers' },
            { seed: 2, teamAbbr: 'DEN', teamName: 'Denver Nuggets' }
          ],
          sevenEight: [
            { seed: 7, teamAbbr: 'DAL', teamName: 'Dallas Mavericks' },
            { seed: 8, teamAbbr: 'MIN', teamName: 'Minnesota Timberwolves' }
          ],
          nineTen: [
            { seed: 9, teamAbbr: 'GSW', teamName: 'Golden State Warriors' },
            { seed: 10, teamAbbr: 'SAC', teamName: 'Sacramento Kings' }
          ]
        }
      },
      bracket: {
        finals: { higherSeed: { teamAbbr: 'LAL' }, lowerSeed: { teamAbbr: 'BOS' } }
      },
      seriesById: {
        finals: {
          id: 'finals',
          conference: 'finals',
          round: 'finals',
          higherSeed: { seed: 1, teamAbbr: 'LAL', teamName: 'Los Angeles Lakers' },
          lowerSeed: { seed: 1, teamAbbr: 'BOS', teamName: 'Boston Celtics' },
          higherSeedWins: 4,
          lowerSeedWins: 2,
          targetWins: 4,
          winnerTeamAbbr: 'LAL',
          games: 6
        }
      },
      currentDaySchedule: [],
      champion: {
        teamAbbr: 'LAL',
        teamName: 'Los Angeles Lakers',
        seed: 1,
        conference: 'West'
      },
      runnerUp: {
        teamAbbr: 'BOS',
        teamName: 'Boston Celtics',
        seed: 1,
        conference: 'East'
      },
      completedAt: 1713916800000
    }
    : {
      phase,
      currentRound: 'play_in',
      currentDay: 13,
      playIn: {
        east: {
          topSix: [
            { seed: 1, teamAbbr: 'BOS', teamName: 'Boston Celtics' },
            { seed: 2, teamAbbr: 'MIL', teamName: 'Milwaukee Bucks' },
            { seed: 3, teamAbbr: 'CLE', teamName: 'Cleveland Cavaliers' },
            { seed: 4, teamAbbr: 'NYK', teamName: 'New York Knicks' },
            { seed: 5, teamAbbr: 'ORL', teamName: 'Orlando Magic' },
            { seed: 6, teamAbbr: 'MIA', teamName: 'Miami Heat' }
          ],
          sevenEight: [
            { seed: 7, teamAbbr: 'IND', teamName: 'Indiana Pacers' },
            { seed: 8, teamAbbr: 'PHI', teamName: 'Philadelphia 76ers' }
          ],
          nineTen: [
            { seed: 9, teamAbbr: 'ATL', teamName: 'Atlanta Hawks' },
            { seed: 10, teamAbbr: 'CHI', teamName: 'Chicago Bulls' }
          ]
        },
        west: {
          topSix: [
            { seed: 1, teamAbbr: 'LAL', teamName: 'Los Angeles Lakers' },
            { seed: 2, teamAbbr: 'DEN', teamName: 'Denver Nuggets' },
            { seed: 3, teamAbbr: 'PHX', teamName: 'Phoenix Suns' },
            { seed: 4, teamAbbr: 'OKC', teamName: 'Oklahoma City Thunder' },
            { seed: 5, teamAbbr: 'NOP', teamName: 'New Orleans Pelicans' },
            { seed: 6, teamAbbr: 'SAC', teamName: 'Sacramento Kings' }
          ],
          sevenEight: [
            { seed: 7, teamAbbr: 'DAL', teamName: 'Dallas Mavericks' },
            { seed: 8, teamAbbr: 'MIN', teamName: 'Minnesota Timberwolves' }
          ],
          nineTen: [
            { seed: 9, teamAbbr: 'GSW', teamName: 'Golden State Warriors' },
            { seed: 10, teamAbbr: 'HOU', teamName: 'Houston Rockets' }
          ]
        }
      },
      bracket: {
        east: {
          firstRound: [
            {
              id: 'east-playoffs-round-1-1',
              conference: 'east',
              round: 'playoffs_round_1',
              higherSeed: { seed: 1, teamAbbr: 'BOS', teamName: 'Boston Celtics' },
              lowerSeed: { seed: 8, teamAbbr: 'IND', teamName: 'Indiana Pacers' },
              targetWins: 4,
              higherSeedWins: 2,
              lowerSeedWins: 1,
              winnerTeamAbbr: null,
              games: 3
            }
          ],
          conferenceFinals: []
        },
        west: {
          firstRound: [
            {
              id: 'west-playoffs-round-1-1',
              conference: 'west',
              round: 'playoffs_round_1',
              higherSeed: { seed: 1, teamAbbr: 'LAL', teamName: 'Los Angeles Lakers' },
              lowerSeed: { seed: 8, teamAbbr: 'DAL', teamName: 'Dallas Mavericks' },
              targetWins: 4,
              higherSeedWins: 3,
              lowerSeedWins: 2,
              winnerTeamAbbr: null,
              games: 5
            }
          ],
          conferenceFinals: []
        },
        finals: {
          id: 'finals',
          conference: 'finals',
          round: 'finals',
          higherSeed: { seed: 1, teamAbbr: 'LAL', teamName: 'Los Angeles Lakers' },
          lowerSeed: { seed: 1, teamAbbr: 'BOS', teamName: 'Boston Celtics' },
          targetWins: 4,
          higherSeedWins: 0,
          lowerSeedWins: 0,
          winnerTeamAbbr: null,
          games: 0
        }
      },
      seriesById: {
        'east-play-in-7-8': {
          id: 'east-play-in-7-8',
          conference: 'east',
          round: 'play_in',
          higherSeed: { seed: 7, teamAbbr: 'IND', teamName: 'Indiana Pacers' },
          lowerSeed: { seed: 8, teamAbbr: 'PHI', teamName: 'Philadelphia 76ers' },
          targetWins: 1,
          higherSeedWins: 0,
          lowerSeedWins: 0,
          winnerTeamAbbr: null,
          games: 0
        },
        'west-play-in-7-8': {
          id: 'west-play-in-7-8',
          conference: 'west',
          round: 'play_in',
          higherSeed: { seed: 7, teamAbbr: 'DAL', teamName: 'Dallas Mavericks' },
          lowerSeed: { seed: 8, teamAbbr: 'MIN', teamName: 'Minnesota Timberwolves' },
          targetWins: 1,
          higherSeedWins: 0,
          lowerSeedWins: 0,
          winnerTeamAbbr: null,
          games: 0
        },
        'east-playoffs-round-1-1': {
          id: 'east-playoffs-round-1-1',
          conference: 'east',
          round: 'playoffs_round_1',
          higherSeed: { seed: 1, teamAbbr: 'BOS', teamName: 'Boston Celtics' },
          lowerSeed: { seed: 8, teamAbbr: 'IND', teamName: 'Indiana Pacers' },
          targetWins: 4,
          higherSeedWins: 2,
          lowerSeedWins: 1,
          winnerTeamAbbr: null,
          games: 3
        },
        'west-playoffs-round-1-1': {
          id: 'west-playoffs-round-1-1',
          conference: 'west',
          round: 'playoffs_round_1',
          higherSeed: { seed: 1, teamAbbr: 'LAL', teamName: 'Los Angeles Lakers' },
          lowerSeed: { seed: 8, teamAbbr: 'DAL', teamName: 'Dallas Mavericks' },
          targetWins: 4,
          higherSeedWins: 3,
          lowerSeedWins: 2,
          winnerTeamAbbr: null,
          games: 5
        },
        finals: {
          id: 'finals',
          conference: 'finals',
          round: 'finals',
          higherSeed: { seed: 1, teamAbbr: 'LAL', teamName: 'Los Angeles Lakers' },
          lowerSeed: { seed: 1, teamAbbr: 'BOS', teamName: 'Boston Celtics' },
          targetWins: 4,
          higherSeedWins: 0,
          lowerSeedWins: 0,
          winnerTeamAbbr: null,
          games: 0
        }
      },
      currentDaySchedule: [
        { day: 13, gameId: 'east-play-in-7-8-game-1', seriesId: 'east-play-in-7-8', conference: 'east', round: 'play_in', awayAbbr: 'PHI', homeAbbr: 'IND' },
        { day: 13, gameId: 'west-play-in-7-8-game-1', seriesId: 'west-play-in-7-8', conference: 'west', round: 'play_in', awayAbbr: 'MIN', homeAbbr: 'DAL' }
      ],
      champion: null,
      runnerUp: null,
      completedAt: null
    };

  return {
    simulationMode: 'nba_mixed_era_single_player_v1',
    historicalUniverseSlotId: 'sim-slot-1',
    leagueShell: { teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }] },
    draftState: {
      controlledTeamAbbr: 'LAL',
      rostersByTeam: {
        LAL: [
          { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C', fp: 55 },
          { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG', fp: 52 },
          { id: 101, name: 'Bench Guard', team: 'LAL', pos: 'PG', fp: 8 },
          { id: 102, name: 'Bench Wing', team: 'LAL', pos: 'SF', fp: 7 },
          { id: 'uuid-send-0', name: 'String Key Send', team: 'LAL', pos: 'G', fp: 20 }
        ],
        BOS: [
          { id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG', fp: 58 },
          { id: 99, name: 'Franchise Superstar', team: 'BOS', pos: 'SF', fp: 70 },
          { id: 'uuid-get-0', name: 'String Key Get', team: 'BOS', pos: 'F', fp: 21 }
        ],
        CHI: []
      },
      freeAgents: [
        { id: 33, name: 'Scottie Pippen', team: 'CHI', pos: 'SF', fp: 28 },
        { id: 91, name: 'Dennis Rodman', team: 'CHI', pos: 'PF', fp: 18 }
      ]
    },
    seasonState: {
      currentDay: phase === 'regular_season' ? 12 : 13,
      currentWeek: phase === 'regular_season' ? 2 : 3,
      standings: [
        { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
        { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 },
        { teamIdx: 2, teamAbbr: 'CHI', conference: 'East', division: 'Central', w: 5, l: 7, pf: 1180, pa: 1210 }
      ],
      lineupIdsByTeam: {
        LAL: [23],
        BOS: [30],
        CHI: []
      }
    },
    postseasonState
  };
}

function setSimulationStubPhase(phase) {
  simulationStubState = buildSimulationStubState(phase);
}

setSimulationStubPhase('regular_season');
const simulationAdapterStub = {
  getState() {
    return toPlain(simulationStubState);
  },
  replaceState(nextState) {
    simulationStubState = toPlain(nextState);
    this.lastReplacedState = toPlain(nextState);
    return this.getState();
  },
  getNavItems() {
    const statePhase = String(simulationStubState?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
    const navItems = [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Matchup' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' }
    ];
    if (statePhase !== 'regular_season') {
      navItems.push({ id: 'playoffs', label: 'Playoffs' });
    }
    return navItems;
  },
  getHubViewModel() {
    const currentWeek = Number(simulationStubState?.seasonState?.currentWeek || 2) || 2;
    const captainModeState = simulationStubState?.seasonState?.powerupsByWeek?.[currentWeek]?.captain_mode || null;
    return {
      leagueLabel: 'Mixed Era Local League',
      shellLabel: '1995-96 + 2015-16 Mixed Era Shell',
      controlledTeam: { abbr: 'LAL', name: 'Los Angeles Lakers' },
      userRow: { w: 9, l: 3, streak: 'W3' },
      recordLabel: '9-3',
      primaryAction: { label: 'Reveal Day 12 Results', shortLabel: 'Reveal Day', cadenceLabel: 'Day 12', shellTone: 'reveal' },
      summaryCards: [
        { label: 'Record', value: '9-3' },
        { label: 'Reveal Window', value: 'Day 12 - Week 2' },
        { label: 'Team', value: 'LAL' },
        { label: 'Era Pool', value: '1986-87 + 2 more' }
      ],
      sourceSeasonLabels: ['1986-87', '1995-96', '2015-16'],
      powerupCards: [
        {
          key: 'captain-mode',
          powerupId: 'captain_mode',
          label: 'Captain Mode',
          body: 'Flag a featured starter.',
          active: Boolean(captainModeState?.active),
          status: captainModeState?.active ? 'Active' : 'Available soon',
          actionLabel: captainModeState?.active ? 'Update Captain' : 'Activate Captain',
          targetLabel: 'Choose your captain',
          targetId: captainModeState?.targetId || 23,
          targetOptions: [
            { value: 23, label: 'Michael Jordan · SG' }
          ],
          disabled: false
        },
        {
          key: 'white-gloves',
          powerupId: 'white_gloves',
          label: 'White Gloves',
          body: 'Protect the floor for injured starters later.',
          active: false,
          status: 'Future unlock',
          actionLabel: 'Coming Soon',
          disabled: true,
    disabledReason: 'Future unlock for this local league.'
        },
        {
          key: 'bench-boost',
          powerupId: 'bench_boost',
          label: 'Bench Boost',
          body: 'Bench scoring boost will land later.',
          active: false,
          status: 'Future unlock',
          actionLabel: 'Coming Soon',
          disabled: true,
    disabledReason: 'Future unlock for this local league.'
        },
        {
          key: 'sunday-surge',
          powerupId: 'sunday_surge',
          label: 'Sunday Surge',
          body: 'Sunday timing boost will land later.',
          active: false,
          status: 'Future unlock',
          actionLabel: 'Coming Soon',
          disabled: true,
    disabledReason: 'Future unlock for this local league.'
        }
      ]
    };
  },
  getScheduleViewModel() {
    return {
      title: 'Matchup / Results',
      cycleLabel: 'Day 12 - Week 2',
      nextGame: {
        day: 12,
        home: false,
        awayAbbr: 'BOS',
        homeAbbr: 'LAL',
        opponentAbbr: 'LAL',
        opponentName: 'Los Angeles Lakers'
      },
      scheduleByDay: {
        12: [
          { awayAbbr: 'BOS', homeAbbr: 'LAL' },
          { awayAbbr: 'BOS', homeAbbr: 'DET' }
        ],
        13: [
          { day: 13, awayAbbr: 'NYK', homeAbbr: 'LAL', opponentAbbr: 'NYK', opponentName: 'New York Knicks' }
        ]
      },
      recentResults: [
        { awayAbbr: 'BOS', awayScore: 108, homeAbbr: 'LAL', homeScore: 112 }
      ]
    };
  },
  getRosterViewModel() {
    return {
    layoutMode: 'local-league-parity',
      summaryCards: [
        { label: 'Revealed Score', value: '112.0' }
      ],
      actionCards: [
        { title: 'Lineup Pulse', body: 'Jordan is locked in at SG.' }
      ],
      operations: {
        actions: [
          { id: 'set-lineup', label: 'Set Lineup' },
          { id: 'waivers', label: 'Waivers' }
        ]
      },
      tabs: [
        { id: 'stats', label: 'Stats', active: true },
        { id: 'schedule', label: 'Matchup', active: false }
      ],
      teamSummary: {
        name: 'Adapter Test Team',
        leagueLabel: 'Adapter League Label',
        waiverOrderLabel: 'Adapter Waiver Order',
        watchListLabel: 'Adapter Watch List',
        watchListEnabled: true,
        watchListDisabledCopy: '',
        waiverOrderEnabled: true,
        waiverOrderCopy: 'Open waivers to inspect the current claim order.',
        settingsLabel: 'Adapter Settings',
        settingsEnabled: true,
        settingsDisabledCopy: ''
      },
      sections: {
        starters: {
          rows: [
            {
              slot: 'SG',
              player: { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' },
              hasGame: true,
              opponentLabel: 'vs BOS',
              opponentName: 'Boston Celtics',
              timeLabel: 'Day 12'
            },
            {
              slot: 'PF',
              player: {
                id: 35,
                name: 'Charles Barkley',
                team: 'PHX',
                pos: 'PF',
                fp: 0,
                projectedFantasyPoints: 39.3,
                statValues: { TFP: 0, PTS: 0, REB: 0, AST: 0, STL: 0, BLK: 0, '3PM': 0 }
              },
              hasGame: true,
              opponentLabel: '@ MIL',
              opponentName: 'Milwaukee Bucks',
              timeLabel: '8:30 PM'
            }
          ]
        },
        bench: {
          rows: [
            { slot: 'BENCH', player: { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' } }
          ]
        }
      },
      starterSlots: ['PG', 'SG', 'SF', 'PF', 'C'],
      lineupSlots: {
        PG: { slot: 'PG', playerId: null, suggestedPlayerId: null },
        SG: { slot: 'SG', playerId: 23, suggestedPlayerId: 23 },
        SF: { slot: 'SF', playerId: null, suggestedPlayerId: null },
        PF: { slot: 'PF', playerId: null, suggestedPlayerId: null },
        C: { slot: 'C', playerId: null, suggestedPlayerId: 34 }
      },
      roster: [
        { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' },
        { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
      ],
      lineup: [
        { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
      ],
      bench: [
        { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' }
      ]
    };
  },
  getWaiverViewModel() {
    return {
    layoutMode: 'local-league-parity',
  claimTimingLabel: 'Processing next reveal window',
      teamSummary: {
        waiverOrderLabel: 'Waiver Order (1 of 30)',
        watchListLabel: 'Watch List'
      },
      pendingClaims: [
        {
          claimId: 'pending-1',
          playerId: 77,
          playerName: 'Grant Hill',
      timingLabel: 'Processing next reveal window',
          consequenceLabel: 'Adds Grant Hill and drops Hakeem Olajuwon if awarded.'
        }
      ],
      recentClaimResults: [
        {
          claimId: 'recent-1',
          playerId: 44,
          playerName: 'Chris Mullin',
          resolutionLabel: 'Resolved: added Chris Mullin after the previous waiver run.'
        }
      ],
      sections: {
        pending: {
          rows: [
            {
              claimId: 'pending-1',
              playerId: 77,
              playerName: 'Grant Hill',
      timingLabel: 'Processing next reveal window',
              consequenceLabel: 'Adds Grant Hill and drops Hakeem Olajuwon if awarded.'
            }
          ]
        },
        recent: {
          rows: [
            {
              claimId: 'recent-1',
              playerId: 44,
              playerName: 'Chris Mullin',
              resolutionLabel: 'Resolved: added Chris Mullin after the previous waiver run.'
            }
          ]
        },
        available: {
          rows: [
            {
              playerId: 33,
              player: {
                id: 33,
                name: 'Scottie Pippen',
                team: 'CHI',
                pos: 'SF',
                designation: 'GTD',
                statValues: { PTS: 18.2, REB: 6.4, AST: 5.9, TFP: 2500 }
              },
              submitLabel: 'Submit Claim',
              consequenceLabel: 'Adds Scottie Pippen and drops Hakeem Olajuwon if awarded.',
              suggestedDropPlayerId: 34,
              dropOptions: [
                { value: 34, label: 'Hakeem Olajuwon · C' },
                { value: 23, label: 'Michael Jordan · SG' }
              ]
            },
            {
              playerId: 91,
              player: { id: 91, name: 'Dennis Rodman', team: 'CHI', pos: 'PF' },
              submitLabel: 'Submit Claim',
              consequenceLabel: 'Open roster spot available',
              dropOptions: []
            }
          ]
        }
      },
      availablePlayers: [
        { id: 333, name: 'Legacy Waiver Fallback', team: 'LEG', pos: 'SG' }
      ]
    };
  },
  getTradeViewModel() {
    return {
      sections: {
        partners: {
          rows: [
            {
              team: { abbr: 'BOS', name: 'Boston Celtics' },
              incomingRoster: [
                { id: 30, name: 'Stephen Curry', choiceLabel: 'Stephen Curry - GSW - PG', fp: 58 },
                { id: 99, name: 'Franchise Superstar', choiceLabel: 'Franchise Superstar - BOS - SF', fp: 70 },
                { id: 'uuid-get-0', name: 'String Key Get', choiceLabel: 'String Key Get - BOS - F', fp: 21 }
              ],
              recordLabel: '7-5',
              topPlayerName: 'Stephen Curry',
              rosterCount: 13
            }
          ]
        }
      },
      tradePartners: [
        { abbr: 'LEG', name: 'Legacy Trade Fallback' }
      ],
      outgoingRoster: [
        { id: 34, name: 'Hakeem Olajuwon', choiceLabel: 'Hakeem Olajuwon - HOU - C', fp: 55 },
        { id: 101, name: 'Bench Guard', choiceLabel: 'Bench Guard - LAL - PG', fp: 8 },
        { id: 102, name: 'Bench Wing', choiceLabel: 'Bench Wing - LAL - SF', fp: 7 },
        { id: 'uuid-send-0', name: 'String Key Send', choiceLabel: 'String Key Send - LAL - G', fp: 20 }
      ],
      incomingRostersByTeam: {
        LEG: [
          { id: 404, name: 'Legacy Incoming' }
        ]
      }
    };
  },
  getStandingsViewModel() {
    return {
      rows: [
        { teamAbbr: 'LAL', w: 9, l: 3, pf: 1360, pa: 1288 },
        { teamAbbr: 'BOS', w: 7, l: 5, pf: 1299, pa: 1274 }
      ]
    };
  },
  getPlayoffsViewModel() {
    const postseasonState = simulationStubState?.postseasonState || {};
    return {
      phase: postseasonState.phase || 'regular_season',
      currentRound: postseasonState.currentRound || null,
      currentDay: Number(postseasonState.currentDay || simulationStubState?.seasonState?.currentDay || 1),
      playIn: toPlain(postseasonState.playIn || null),
      bracket: toPlain(postseasonState.bracket || null),
      seriesById: toPlain(postseasonState.seriesById || {}),
      currentDaySchedule: toPlain(postseasonState.currentDaySchedule || []),
      champion: toPlain(postseasonState.champion || null),
      runnerUp: toPlain(postseasonState.runnerUp || null),
      completedAt: postseasonState.completedAt || null
    };
  },
  claimFreeAgent(move) {
    this.lastClaim = move;
    return {};
  },
  submitWaiverClaim(move) {
    this.lastSubmittedWaiverClaim = move;
    return {};
  },
  cancelWaiverClaim(payload) {
    this.lastCancelledWaiverClaim = payload;
    return {};
  },
  applyTrade(trade) {
    this.lastTrade = trade;
    const fromTeamAbbr = String(trade?.fromTeamAbbr || '').trim().toUpperCase();
    const toTeamAbbr = String(trade?.toTeamAbbr || '').trim().toUpperCase();
    const outgoingIds = new Set((trade?.outgoingPlayerIds || []).map(Number));
    const incomingIds = new Set((trade?.incomingPlayerIds || []).map(Number));
    const fromRoster = simulationStubState.draftState.rostersByTeam[fromTeamAbbr] || [];
    const toRoster = simulationStubState.draftState.rostersByTeam[toTeamAbbr] || [];
    const outgoing = fromRoster.filter((player) => outgoingIds.has(Number(player.id)));
    const incoming = toRoster.filter((player) => incomingIds.has(Number(player.id)));
    if (outgoing.length && incoming.length) {
      simulationStubState = {
        ...simulationStubState,
        draftState: {
          ...simulationStubState.draftState,
          rostersByTeam: {
            ...simulationStubState.draftState.rostersByTeam,
            [fromTeamAbbr]: fromRoster.filter((player) => !outgoingIds.has(Number(player.id))).concat(incoming),
            [toTeamAbbr]: toRoster.filter((player) => !incomingIds.has(Number(player.id))).concat(outgoing)
          }
        }
      };
    }
    return this.getState();
  },
  activateSimulationPowerup(payload) {
    this.lastPowerup = payload;
    simulationStubState = {
      ...simulationStubState,
      seasonState: {
        ...simulationStubState.seasonState,
        powerupsByWeek: {
          ...(simulationStubState.seasonState?.powerupsByWeek || {}),
          2: {
            ...((simulationStubState.seasonState?.powerupsByWeek || {})[2] || {}),
            [payload.powerupId]: {
              active: true,
              targetId: payload.targetId,
              teamAbbr: payload.teamAbbr
            }
          }
        }
      }
    };
    return this.getState();
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return this.getState();
  },
  simulateNextDay() {
    this.simulateNextDayCalls = Number(this.simulateNextDayCalls || 0) + 1;
    const phase = String(simulationStubState?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
    if (phase === 'regular_season') {
      setSimulationStubPhase('postseason_ready');
    }
    return this.getState();
  }
};

const sandbox = {
  module: { exports: {} },
  exports: {},
  console: sandboxConsole,
  RB_SEASON_DEBUG: false,
  CURRENT_SPORT: 'nba',
  STARTERS: 5,
  SLOT_LABELS: ['PG', 'SG', 'SF', 'PF', 'C'],
  URLSearchParams,
  normalizeRosterbateSport(value) {
    return String(value || 'nba').trim().toLowerCase() || 'nba';
  },
  applySportContext() {},
  repairDraftLeagueShapeFromPicks() {
    return false;
  },
  ensureCpuTeamPersonalitiesByTeam() {},
  getRequestedLeagueId() {
    return null;
  },
  buildCpuManagedStarterIdsForDay(teamIdx, roster) {
    return Array.isArray(roster) ? roster.slice(0, 1).map((player) => player.id) : [];
  },
  getSeasonPlayerPool() {
    return [];
  },
  rebuildSeasonWaiverPool() {
    return [];
  },
  buildSched() {
    return [];
  },
  syncCalendarFromDay() {},
  maintainCpuLeagueRosters() {
    return {};
  },
  queueSharedSeasonSave() {},
  markSeasonSaving() {},
  markSeasonSaved() {},
  markSeasonSaveWarning() {},
  ensurePowerupState() {},
  ensureRosterbatePools() {
    return Promise.resolve();
  },
  ensureSeasonNbaReferenceContext() {
    return Promise.resolve();
  },
  rollWeeklyPowerupDrops() {},
  logActivity() {},
  awardRosterbateScore() {
    return Promise.resolve();
  },
  hideSeasonEmptyState() {
    lastEmptyState = 'hidden';
  },
  setSeasonEmptyState(value) {
    lastEmptyState = String(value || '');
  },
  getSeasonEmptyStateForTest() {
    return lastEmptyState;
  },
  shouldBootHistoricalDevSeason() {
    return false;
  },
  getSavedMultiplayerLobbyState() {
    return null;
  },
  persistHistoricalUniverseSlotSnapshot(reason) {
    persistedReason = reason;
  },
  localStorage: {
    setItem() {},
    getItem() { return null; }
  },
  getRosterbateDemoData() {
    return {
      sport: 'nba',
      leagueName: 'Demo League',
      leagueSize: 2,
      myPos: 0,
      teams: ['Demo A', 'Demo B'],
      allRosters: [
        [{ id: 1, name: 'Demo Player 1', team: 'AAA', pos: 'PG' }],
        [{ id: 2, name: 'Demo Player 2', team: 'BBB', pos: 'SG' }]
      ],
      ilRosters: [[], []],
      freeAgents: [],
      waiver: [],
      standings: [
        { teamIdx: 0, teamAbbr: 'AAA', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 1, teamAbbr: 'BBB', w: 0, l: 0, pf: 0, pa: 0 }
      ]
    };
  },
  initSeason() {
    demoInitCalls += 1;
    if (sandbox.module.exports.getActiveSeasonMode() === 'simulation' && !sandbox.module.exports.getSeasonModeAdapter()) {
      throw new Error('simulation adapter missing');
    }
  },
  applyRequestedSeasonView() {
    demoViewCalls += 1;
  },
  toast(message) {
    demoToasts.push(String(message || ''));
  },
  setTimeout(callback) {
    return typeof callback === 'function' ? callback() : 0;
  },
  document: {
    body: {
      lastInsertPosition: null,
      lastInsertedHTML: '',
      innerHTML: '',
      insertAdjacentHTML(position, markup) {
        this.lastInsertPosition = position;
        this.lastInsertedHTML = String(markup || '');
        this.innerHTML += this.lastInsertedHTML;
        registerMarkupElements(this.lastInsertedHTML);
        if (elements.simulationTradeBuilderModal) {
          elements.simulationTradeBuilderModal.innerHTML = this.lastInsertedHTML;
        }
        if (elements.localTradeBuilderModal) {
          elements.localTradeBuilderModal.innerHTML = this.lastInsertedHTML;
        }
      }
    },
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement(id);
      }
      return elements[id];
    },
    querySelectorAll(selector) {
      if (selector === '.screen') {
        return Object.values(elements).filter((element) => element?.classList?.contains('screen'));
      }
      if (selector === '.screen.active') {
        return Object.values(elements).filter((element) => element?.classList?.contains('screen') && element.classList.contains('active'));
      }
      if (selector === '[data-simulation-trade-builder-side]') {
        return Object.values(elements).filter((element) => element?.attributes?.['data-simulation-trade-builder-side']);
      }
      return [];
    }
  },
  window: {
    location: {
      search: '',
      href: 'rosterbate-season.html'
    },
    RosterBateHistoricalUniverseSlots: {
      getState(slotId) {
        const targetSlotId = String(slotId || '').trim();
        return targetSlotId && historicalSlotStateById[targetSlotId]
          ? toPlain(historicalSlotStateById[targetSlotId])
          : null;
      },
      upsertFromState(state, options) {
        historicalSlotUpsertCalls.push({
          state: toPlain(state),
          options: toPlain(options)
        });
        completedDraftUpsertInput = toPlain(state);
        completedDraftUpsertOptions = toPlain(options);
        if (completedDraftUpsertError) {
          throw completedDraftUpsertError;
        }
        return {
          slotId: 'sim-slot-from-completed-draft',
          state: {
            ...toPlain(state),
            historicalUniverseSlotId: 'sim-slot-from-completed-draft'
          }
        };
      },
      buildSeasonUrl(slot, sport) {
        return `rosterbate-season.html?sport=${encodeURIComponent(String(sport || 'nba'))}&simulation=nba_mixed_era&historicalUniverse=${encodeURIComponent(String(slot?.slotId || ''))}`;
      }
    },
    RosterBateSimulationModeRuntime: {
      readCompletedSimulationState() {
        return completedDraftState ? toPlain(completedDraftState) : null;
      },
      buildUnifiedSimulationSeasonState(state) {
        return {
          ...toPlain(state || {}),
          simulationMode: 'nba_mixed_era_single_player_v1',
          legacyHistoricalStatMode: false,
          leagueShell: {
            sport: 'nba',
            teams: [
              { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
              { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
            ]
          },
          draftState: {
            controlledTeamAbbr: 'LAL',
            rostersByTeam: {
              LAL: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
              BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
            },
            freeAgents: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }]
          },
          seasonState: {
            currentDay: Number(state?.currentDay || state?.seasonState?.currentDay || 12),
            currentWeek: Number(state?.currentWeek || state?.seasonState?.currentWeek || 2),
            standings: toPlain(state?.standings || state?.seasonState?.standings || [
              { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
              { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
            ]),
            activityLog: []
          },
          postseasonState: {
            phase: 'regular_season',
            playIn: null,
            bracket: null,
            champion: null
          }
        };
      },
      clearCompletedSimulationState() {
        completedDraftClearCount += 1;
        completedDraftState = null;
        return true;
      },
      activateSimulationPowerup(state, payload) {
        const nextState = toPlain(state || {});
        const currentWeek = Number(nextState?.seasonState?.currentWeek || 1) || 1;
        nextState.seasonState = nextState.seasonState || {};
        nextState.seasonState.powerupsByWeek = nextState.seasonState.powerupsByWeek || {};
        nextState.seasonState.powerupsByWeek[currentWeek] = nextState.seasonState.powerupsByWeek[currentWeek] || {};
        nextState.seasonState.powerupsByWeek[currentWeek][payload.powerupId] = {
          active: true,
          targetId: payload.targetId == null ? null : Number(payload.targetId),
          teamAbbr: payload.teamAbbr || null
        };
        return nextState;
      }
    },
    RosterBateSimulationSeasonAdapter: {
      isSupportedSimulationSeasonState(state) {
        return String(state?.simulationMode || '').trim().toLowerCase() === 'nba_mixed_era_single_player_v1';
      },
      createSimulationSeasonAdapter(options) {
        createdSimulationAdapters.push(toPlain(options));
        return simulationAdapterStub;
      }
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(harnessSource, sandbox, { filename: 'season-shared-simulation-helpers.vm.js' });

const api = sandbox.module.exports;

assert.deepStrictEqual(
  toPlain(api.normalizeTradePackageIds(['34', 34, '', null, 'uuid-send-0', 'uuid-send-0', '  me-star  '])),
  ['34', 'uuid-send-0', 'me-star'],
  'shared trade package ids should preserve string ids while removing blanks and duplicate keys'
);
const sharedHelperRoster = [
  { id: '34', name: 'String Center', fp: 21 },
  { id: 'uuid-send-0', name: 'Stable Key Wing', fp: 18 },
  { id: 'me-star', name: 'String Star', fp: 44 }
];
assert.deepStrictEqual(
  toPlain(api.resolveTradePackagePlayers(['34', 34, 'missing', 'uuid-send-0'], sharedHelperRoster).map((player) => player.name)),
  ['String Center', 'Stable Key Wing'],
  'shared trade package resolution should use stable string-key matching against rosters'
);
const helperPreviewModel = api.buildTradePackagePreviewModel({
  outgoingIds: ['34', 'uuid-send-0'],
  incomingIds: ['me-star'],
  outgoingRoster: sharedHelperRoster,
  incomingRoster: sharedHelperRoster,
  valueFn: (player) => Number(player?.fp || 0),
  replacementRead: () => ({ player: { id: 'waiver-fill', name: 'Waiver Fill' }, label: 'Waiver Fill', value: 12 })
});
assert.deepStrictEqual(
  {
    outgoingIds: toPlain(helperPreviewModel.outgoingIds),
    incomingIds: toPlain(helperPreviewModel.incomingIds),
    outgoingTotal: helperPreviewModel.outgoingTotal,
    incomingTotal: helperPreviewModel.incomingTotal,
    netValue: helperPreviewModel.netValue,
    isOverLimit: helperPreviewModel.isOverLimit,
    replacementLabel: helperPreviewModel.replacement?.label,
    context: helperPreviewModel.replacementContext
  },
  {
    outgoingIds: ['34', 'uuid-send-0'],
    incomingIds: ['me-star'],
    outgoingTotal: 39,
    incomingTotal: 44,
    netValue: 5,
    isOverLimit: false,
    replacementLabel: 'Waiver Fill',
    context: 'Replacement context: Waiver Fill can fill the opened roster spot at 12.0 FP.'
  },
  'shared trade package preview model should centralize totals, net value, limits, and replacement copy'
);

assert.match(html, /simulation-season-adapter\.js/, 'season shell should load the simulation adapter');
assert.match(html, /function renderSimulationHubInSharedShell\(/, 'season shell should add a simulation hub renderer');
assert.match(html, /function renderSimulationRosterInSharedShell\(/, 'season shell should add a simulation roster renderer');
assert.match(html, /function renderSimulationScheduleInSharedShell\(/, 'season shell should add a simulation schedule renderer');
assert.match(html, /function renderSimulationPlayoffsInSharedShell\(/, 'season shell should add a simulation playoffs renderer');
assert.match(html, /function renderSimulationWaiverInSharedShell\(/, 'season shell should add a simulation waiver renderer');
assert.match(html, /function renderSimulationTradesInSharedShell\(/, 'season shell should add a simulation trade renderer');
assert.match(html, /function openSimulationTradeBuilderModal\(partnerAbbr\)/, 'simulation Trade Desk should expose a trade builder modal opener');
assert.match(html, /function closeSimulationTradeBuilderModal\(\)/, 'simulation Trade Desk should expose a trade builder modal closer');
assert.match(html, /function renderSimulationTradeBuilderPlayerOption\(player, side, partnerAbbr\)/, 'simulation Trade Desk should render modal player checkbox options');
const simulationTradeBuilderOptionBody = html.slice(
  html.indexOf('function renderSimulationTradeBuilderPlayerOption(player, side, partnerAbbr)'),
  html.indexOf('function renderSimulationTradeBuilderModal(partnerAbbr)')
);
assert.match(simulationTradeBuilderOptionBody, /renderTeamInitialAvatar\(/, 'simulation trade builder options should render shared player portraits');
assert.match(html, /function renderSimulationTradeBuilderModal\(partnerAbbr\)/, 'simulation Trade Desk should render a package trade modal');
assert.match(html, /function getSimulationTradeBuilderSelectedIds\(partnerAbbr, side\)/, 'simulation Trade Desk should read selected package players from the modal');
assert.match(html, /function getSimulationTradeBuilderPlayerById\(id\)/, 'simulation Trade Desk should safely resolve package preview players');
assert.match(html, /function updateSimulationTradeBuilderPreview\(partnerAbbr\)/, 'simulation Trade Desk should update package preview from modal selections');
assert.match(html, /function applySimulationTradeBuilderPackage\(partnerAbbr\)/, 'simulation Trade Desk should apply package trades from the modal');
assert.match(html, /Build Trade/i, 'simulation Trade Desk partner cards should expose Build Trade instead of inline-only selectors');
assert.match(html, /function renderSimulationStandingsInSharedShell\(/, 'season shell should add a simulation standings renderer');
assert.match(html, /season-subbar-title">Waivers<\/div>[\s\S]*season-subbar-copy">Claim targets, watch list, and pending waiver moves<\/div>/, 'waiver page chrome should keep waiver-first page framing');
assert.match(html, /hub-action-title">Waivers<\/div><div id="hubWC" class="hub-action-sub">/, 'simulation hub should keep waiver-first action-rail framing');
assert.match(html, /goPage\('waiver'\)">Open Waivers<\/button>/, 'simulation hub should keep waiver-first runner actions');
assert.match(html, /function applySimulationSuggestedLineupFromShell\(/, 'season shell should expose a simulation lineup action helper');
assert.match(html, /SEASON_MODE_ADAPTER\.setLineup\(/, 'simulation lineup action should flow through the adapter');
assert.match(html, /persistSimulationSeasonState\('simulation_lineup'\)/, 'simulation lineup action should persist shared state');
assert.match(html, /simulation-nfl-2014-schedule\.js/, 'season shell should load the nfl 2014 schedule helper before the shared simulation engine');
assert.match(adapterSource, /RosterBateSimulationModeRuntime\.claimSimulationFreeAgent/, 'adapter should explicitly bind browser waiver mutations to RosterBateSimulationModeRuntime.claimSimulationFreeAgent');
assert.match(adapterSource, /RosterBateSimulationModeRuntime\.applySimulationTrade/, 'adapter should explicitly bind browser trade mutations to RosterBateSimulationModeRuntime.applySimulationTrade');
assert.match(adapterSource, /RosterBateSimulationModeRuntime\.activateSimulationPowerup/, 'adapter should explicitly bind browser powerup mutations to RosterBateSimulationModeRuntime.activateSimulationPowerup');
assert.match(adapterSource, /RosterBateSimulationModeRuntime\.setSimulationLineup/, 'adapter should explicitly bind browser lineup mutations to RosterBateSimulationModeRuntime.setSimulationLineup');
assert.match(html, /function renderActiveSeasonScreen\(/, 'season shell should centralize mode-aware screen rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationHubInSharedShell\(\);/, 'renderHub should branch into simulation rendering');
assert.doesNotMatch(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationRosterInSharedShell\(\);/, 'renderRoster should no longer short-circuit into the legacy simulation-only roster layout');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationScheduleInSharedShell\(\);/, 'renderMatchup should branch into simulation rendering');
assert.match(html, /function renderWaiver\(\)\{\s*if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationWaiverInSharedShell\(\);/, 'renderWaiver should branch into simulation rendering before fantasy waiver logic');
assert.match(html, /SEASON_MODE_ADAPTER\.simulateNextDay\(\)/, 'Sim Day should flow through the adapter');
assert.match(html, /id="hubOppLabel"/, 'hub markup should expose a label node for the first simulation stat');
assert.match(html, /id="hubProjLabel"/, 'hub markup should expose a label node for the second simulation stat');
assert.match(html, /id="hubOppProjLabel"/, 'hub markup should expose a label node for the third simulation stat');
assert.match(html, /id="hubSettingsLink"/, 'hub markup should expose a settings link node for mode-specific behavior');
assert.match(html, /id="hubLeagueTeamsButton"/, 'hub markup should expose the league teams button for mode-specific behavior');
assert.match(html, /id="hubMatchupsTitle"/, 'hub markup should expose the matchup results card title');
assert.match(html, /id="hubMatchupActionTitle"/, 'hub markup should expose the hub matchup action title');
assert.match(html, /id="rosterScheduleChip"/, 'roster markup should expose the schedule chip for mode-specific copy');
assert.match(html, /id="matchupTitle"/, 'schedule screen title should be targetable for simulation mode');
assert.match(html, /id="playoffsContent"/, 'playoffs markup should expose a dedicated content mount');
assert.match(html, /id="playoffsPowerups"/, 'playoffs markup should expose a dedicated powerups mount');
assert.doesNotMatch(html, /Postseason bracket, play-in races, and the champion path/, 'shared shell playoffs header copy should not promise active playoff simulation for every sport path');
assert.doesNotMatch(html, /This screen reflects adapter-driven postseason state as the season rolls into the play-in and playoffs\./, 'shared shell playoffs note should not imply active playoff simulation flow by default');
assert.doesNotMatch(html, /This screen reflects adapter-driven postseason state, including postseason-ready handoff views when a league stops short of live playoff simulation\./, 'shared shell playoffs note should avoid adapter-facing implementation language');
assert.match(html, /Follow the bracket, round pressure, and title path here, including handoff seasons that stop short of live playoff play\./, 'shared shell playoffs note should use local-league postseason framing');
assert.doesNotMatch(html, /The shared shell reads directly from the adapter's postseason snapshot\./, 'playoffs summary copy should avoid adapter-facing implementation language');
assert.doesNotMatch(html, /Current adapter slate for the active postseason day\./, 'playoffs slate copy should avoid adapter-facing implementation language');
assert.match(html, /Track the playoff picture, current round, and final title chase from one league view\./, 'playoffs summary copy should use league-facing framing');

const params = new URLSearchParams('?simulation=NBA_Mixed_Era&historicalUniverse=sim-slot-1');
assert.equal(api.getRequestedSimulationMode(params), 'nba_mixed_era', 'simulation query param should normalize to lowercase');
assert.equal(
  api.getRequestedHistoricalUniverseSlotId(new URLSearchParams('?slot=legacy-slot')),
  'legacy-slot',
  'historical slot helper should support slot alias fallback'
);
assert.match(html, /function resolveCompletedSimulationDraftSeasonBoot\(/, 'season shell should expose a completed-draft handoff helper');
assert.match(html, /const completedSimulationDraftBoot = resolveCompletedSimulationDraftSeasonBoot\(urlParams, requestedSport\);/, 'season shell should check runtime completed-draft handoffs during boot');
assert.match(html, /function consumeCompletedSimulationDraftFallbackBoot\(/, 'season shell should expose a fallback-handoff consumption helper');
assert.match(html, /function\s+[A-Za-z0-9_]*SeasonBackend\(/, 'single-player replacement boot should expose an explicit season-backend resolver helper');
assert.match(html, /[A-Za-z0-9_]+\s*=\s*[A-Za-z0-9_]*SeasonBackend\(/, 'single-player replacement boot should explicitly resolve the backend before season init');
assert.match(html, /function getActiveSeasonBackend\(/, 'season shell should expose an active-season backend helper');
assert.match(html, /if \(getActiveSeasonBackend\(\) === 'simulation' && SEASON_MODE_ADAPTER\)/, 'advanceWeek should route simulation backends through the adapter instead of presentation mode alone');
assert.doesNotMatch(
  html,
  /mode==='historical_box_score'/,
  'season shell runtime helpers should not keep the legacy historical_box_score alias as a live simulation universe mode'
);
assert.equal(
  api.getResolvedSeasonBackend(new URLSearchParams(''), {
    sport: 'nba',
    leagueName: 'Legacy Single Player League',
    teams: ['Los Angeles Lakers', 'Boston Celtics'],
    allRosters: [
      [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    ],
    waiver: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }],
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', w: 7, l: 5, pf: 1299, pa: 1274 }
    ]
  })?.backend,
  'simulation',
  'legacy non-demo single-player saves should resolve the simulation backend'
);
assert.deepEqual(
  toPlain(api.getResolvedSeasonBackend(new URLSearchParams(''), {
    sport: 'nba',
    leagueName: 'Explicit Simulation Backend League',
    activeSeasonBackend: 'simulation'
  })),
  {
    backend: 'simulation',
    activeSeasonMode: 'simulation',
    sharedSimulationSeason: false,
    normalizeToUnifiedSimulation: true,
    useSimulationAdapter: true
  },
  'simulation-backed saves should stay on the unified simulation backend even when they are not classified as shared sim requests or legacy local leagues'
);
assert.deepEqual(
  toPlain(api.getResolvedSeasonBackend(new URLSearchParams(''), {
    sport: 'nba',
    leagueName: 'Explicit Simulation Local League',
    activeSeasonBackend: 'simulation',
    historicalEntryMode: 'simulation_season',
    teams: ['Los Angeles Lakers', 'Boston Celtics'],
    allRosters: [
      [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    ],
    waiver: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }],
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', w: 7, l: 5, pf: 1299, pa: 1274 }
    ]
  })),
  {
    backend: 'simulation',
    activeSeasonMode: 'fantasy',
    sharedSimulationSeason: false,
    normalizeToUnifiedSimulation: true,
    useSimulationAdapter: true
  },
  'simulation-backed local league saves should keep the polished fantasy presentation shell while still using the unified simulation backend'
);
assert.deepEqual(
  toPlain(api.normalizeLocalLeagueDraftSnapshot({
    sport: 'nba',
    leagueName: 'Legacy Local League',
    teams: ['Los Angeles Lakers', 'Boston Celtics'],
    allRosters: [
      [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    ],
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', w: 7, l: 5, pf: 1299, pa: 1274 }
    ]
  })),
  {
    sport: 'nba',
    leagueName: 'Legacy Local League',
    teams: ['Los Angeles Lakers', 'Boston Celtics'],
    allRosters: [
      [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    ],
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', w: 7, l: 5, pf: 1299, pa: 1274 }
    ],
    activeSeasonBackend: 'simulation',
    historicalEntryMode: 'simulation_season',
    legacyHistoricalStatMode: false
  },
  'local league snapshot normalization should explicitly stamp simulation metadata onto legacy local league-shaped saves'
);
assert.equal(
  api.normalizeLocalLeagueDraftSnapshot({
    leagueName: 'Live Multiplayer League',
    multiplayer: true,
    teams: ['A', 'B'],
    allRosters: [[], []],
    standings: [{ teamIdx: 0 }, { teamIdx: 1 }]
  }).multiplayer,
  true,
  'local league snapshot normalization should leave multiplayer saves untouched'
);

api.setSeasonModeAdapter(simulationAdapterStub);
api.setActiveSeasonMode('simulation');
setSimulationStubPhase('regular_season');
api.setData({
  leagueName: 'Conflicting League Name',
  leagueShell: {
    teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }]
  },
  draftState: {
    controlledTeamAbbr: 'LAL'
  }
});
api.setGame({ day: 12, week: 2 });
api.renderSimulationRosterInSharedShell();
assertSharedSinglePlayerRosterMarkers(
  elements.rosterContent.innerHTML,
  'simulation roster'
);
assertSimulationParityMeta(elements.rosterContent.innerHTML, 'simulation roster');
assert.match(elements.rosterContent.innerHTML, /Adapter League Label/, 'simulation roster header should prefer the adapter-provided league label');
assert.match(elements.rosterContent.innerHTML, /Adapter Waiver Order/, 'simulation roster header should prefer the adapter-provided waiver-order label');
assert.match(elements.rosterContent.innerHTML, /Customize Team/, 'simulation roster should preserve the old customize-team hero action');
assert.doesNotMatch(elements.rosterContent.innerHTML, /Conflicting League Name/, 'simulation roster header should avoid falling back to unrelated page-global league copy when the VM provides it');

const fixture = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    sport: 'nba',
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    },
    freeAgents: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
    ],
    activityLog: [{ type: 'trade', summary: 'Fixture log entry' }]
  }
};
completedDraftState = fixture;
completedDraftClearCount = 0;
completedDraftUpsertInput = null;
completedDraftUpsertOptions = null;
completedDraftUpsertError = null;
assert.equal(
  toPlain(api.readCompletedSimulationDraftState())?.draftState?.controlledTeamAbbr,
  'LAL',
  'completed-draft handoff reader should accept canonical simulation-native payloads from runtime storage'
);
completedDraftState = {
  activeSeasonBackend: 'simulation',
  sport: 'nba',
  leagueShell: fixture.leagueShell,
  draftState: fixture.draftState,
  seasonState: fixture.seasonState
};
assert.equal(
  toPlain(api.readCompletedSimulationDraftState())?.activeSeasonBackend,
  'simulation',
  'completed-draft handoff reader should also accept explicit simulation-backed payloads even when older mode ids are absent'
);
completedDraftState = fixture;

const completedDraftRedirect = toPlain(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era'), 'nba')
);

assert.equal(completedDraftRedirect.redirected, true, 'completed-draft handoff should prefer a canonical slot-backed redirect');
assert.equal(completedDraftRedirect.slotId, 'sim-slot-from-completed-draft', 'completed-draft handoff should capture the created slot id');
assert.equal(
  completedDraftRedirect.redirectUrl,
  'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=sim-slot-from-completed-draft',
  'completed-draft handoff should produce the canonical season-shell URL'
);
assert.equal(completedDraftClearCount, 1, 'completed-draft handoff should clear the one-shot runtime payload after slot persistence succeeds');
assert.equal(completedDraftUpsertOptions.reason, 'simulation_completed_draft_handoff', 'completed-draft handoff should label the slot write reason');
assert.equal(completedDraftUpsertInput.draftState.controlledTeamAbbr, 'LAL', 'completed-draft handoff should persist the completed simulation state');

completedDraftState = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    sport: 'nba',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    },
    freeAgents: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
    ]
  }
};
completedDraftClearCount = 0;
completedDraftUpsertInput = null;
completedDraftUpsertOptions = null;
completedDraftUpsertError = new Error('quota exceeded');

const completedDraftFallback = toPlain(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era'), 'nba')
);

assert.equal(completedDraftFallback.redirected, false, 'completed-draft handoff should fall back to direct boot when slot persistence fails');
assert.equal(completedDraftFallback.redirectUrl, '', 'fallback handoff should skip redirecting when slot persistence fails');
assert.equal(completedDraftFallback.shouldConsumeAfterBoot, true, 'fallback handoff should mark the completed draft payload for one-shot consumption after a successful boot');
assert.equal(completedDraftFallback.slotId, null, 'fallback handoff should boot without a slot when no slot could be created');
assert.equal(completedDraftFallback.state.seasonId, 'simulation:shared-season', 'fallback handoff should normalize the raw simulation state into the shared shell boot shape');
assert.equal(completedDraftFallback.state.allRosters[0][0].name, 'Michael Jordan', 'fallback handoff should preserve completed-draft rosters');
assert.equal(completedDraftClearCount, 1, 'fallback handoff should clear once before the quota retry path restores the runtime payload');
assert.equal(
  api.consumeCompletedSimulationDraftFallbackBoot(completedDraftFallback),
  true,
  'fallback handoff should be clearable after the season shell establishes its own resume state'
);
assert.equal(completedDraftClearCount, 2, 'fallback handoff consumption should clear the restored one-shot runtime payload after a successful boot');
assert.equal(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era'), 'nba'),
  null,
  'a consumed fallback handoff should not win on a second visit'
);

assert.equal(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era&historicalUniverse=existing-slot'), 'nba'),
  null,
  'completed-draft handoff should not override an explicit historical universe slot'
);

historicalSlotStateById = {
  'sim-slot-mixed-era': {
    simulationMode: 'nba_mixed_era_single_player_v1',
    leagueShell: {
      sport: 'nba',
      teams: [
        { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
        { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'LAL',
      rostersByTeam: {
        LAL: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
        BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
      },
      freeAgents: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }]
    },
    seasonState: {
      currentDay: 12,
      currentWeek: 2,
      standings: [
        { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
        { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
      ]
    }
  }
};
sandbox.CURRENT_SPORT = 'mlb';
const reopenedMixedEraSlot = toPlain(api.loadHistoricalUniverseSlotState('sim-slot-mixed-era', 'nba'));
assert.equal(
  reopenedMixedEraSlot?.leagueShell?.sport,
  'nba',
  'shared mixed-era slots should reopen from their persisted simulation sport even when the current global sport differs'
);
sandbox.CURRENT_SPORT = 'nba';
historicalSlotStateById = Object.create(null);

api.setActiveSeasonMode('fantasy');
api.setSeasonModeAdapter(null);
assert.deepEqual(
  toPlain(api.getActiveSeasonPages()),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'commissioner'],
  'fantasy mode should keep the legacy season pages'
);
assert.equal(api.getActiveSeasonLabels().matchup, 'Matchup', 'fantasy mode should keep the legacy matchup label');

api.setActiveSeasonMode('simulation');
api.setSeasonModeAdapter(null);
assert.deepEqual(
  toPlain(api.getActiveSeasonPages()),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings'],
  'simulation mode should hide commissioner by default'
);
assert.equal(api.getActiveSeasonLabels().matchup, 'Schedule', 'simulation mode should rename matchup to schedule');

api.setSeasonModeAdapter({
  getNavItems() {
    return [
      { id: 'hub', label: 'Overview' },
      { id: 'roster', label: 'Lineups' },
  { id: 'matchup', label: 'Matchup' }
    ];
  }
});
assert.deepEqual(
  toPlain(api.getActiveSeasonPages()),
  ['hub', 'roster', 'matchup'],
  'season pages should defer to adapter nav items when available'
);
assert.deepEqual(
  toPlain(api.getActiveSeasonLabels()),
  { hub: 'Overview', roster: 'Lineups', matchup: 'Matchup' },
  'season labels should be derived from adapter nav items when available'
);

api.setSeasonModeAdapter(simulationAdapterStub);
api.setActiveSeasonMode('simulation');
setSimulationStubPhase('regular_season');
api.setData({
  leagueShell: {
    teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }]
  },
  draftState: {
    controlledTeamAbbr: 'LAL'
  }
});
api.setGame({ day: 12, week: 2 });

assert.ok(!api.getActiveSeasonPages().includes('playoffs'), 'regular-season nav should not show Playoffs');

api.renderSimulationHubInSharedShell();
assert.equal(elements.hubLeagueName.textContent, 'Mixed Era Local League');
assert.equal(elements.hubFormat.textContent, 'Mixed Era');
assert.equal(elements.hubScoringType.textContent, 'Head to Head Points');
assert.equal(elements.hubTeamCount.textContent, '3');
assert.equal(elements.hubRec.textContent, '9-3 | 1360.0 PF | 1288.0 PA');
assert.equal(elements.hubTeamMeta.textContent, 'Reveal Day 12 · 3 source seasons');
assert.equal(elements.hubOpp.textContent, '9-3');
assert.equal(elements.hubOppLabel.textContent, 'Record');
assert.equal(elements.hubProj.textContent, 'LAL');
assert.equal(elements.hubProjLabel.textContent, 'Team');
assert.equal(elements.hubOppProj.textContent, '1986-87 + 2 more');
assert.equal(elements.hubOppProjLabel.textContent, 'Era Pool');
assert.equal(elements.hubSettingsLink.textContent, 'Settings');
assert.equal(elements.hubSettingsLink.style.display, '');
assert.equal(elements.hubSettingsDivider.style.display, '');
assert.equal(elements.hubLeagueTeamsButton.style.display, '');
assert.equal(elements.hubMatchupsTitle.textContent, "This Week's Matchups");
assert.equal(elements.hubMatchupActionTitle.textContent, 'Matchup');
assert.match(elements.hubMatchupActionSub.textContent, /head-to-head box score/i);
assert.match(elements.hubMatchups.innerHTML, /CHI[\s\S]*vs[\s\S]*LAL|BOS[\s\S]*vs[\s\S]*LAL|BOS[\s\S]*vs[\s\S]*CHI/i);
assert.match(elements.hubStandingsMini.innerHTML, /LAL/, 'simulation hub should render the mini standings board');
assert.match(elements.hubStandingsMini.innerHTML, /hub-standings-team/, 'simulation hub standings should render richer team identity treatment');
assert.match(elements.hubStandingsMini.innerHTML, /PF/, 'simulation hub should include the fuller points-for context on the mini standings board');
assert.match(elements.hubStandingsMini.innerHTML, /PA/, 'simulation hub should include the fuller points-against context on the mini standings board');
assert.match(elements.hubNowBand.innerHTML, /Watch List|Trade Desk/, 'simulation hub should render the live now-band cards');
assert.match(elements.hubActivity.innerHTML, /League update|League moves will show up here/, 'simulation hub should render the league activity feed');
assert.match(html, /Trades, waivers, reveal windows, and league moves in one running feed\./, 'hub activity rail should use local-league activity framing');
assert.doesNotMatch(elements.hubActivity.innerHTML, /Sim log/, 'simulation hub activity feed should not fall back to the old hardcoded simulation-only meta label');
if (!/League moves will show up here/.test(elements.hubActivity.innerHTML)) {
  assert.match(elements.hubActivity.innerHTML, /Just now|ago|Live now/, 'simulation hub activity feed should render polished age-aware or live activity metadata when entries exist');
}
assert.match(elements.hubSimRunnerCard.innerHTML, /Reveal Runner|Reveal Day 12 Results|Reveal Ready/, 'simulation hub should render the upgraded center-lane runner card for nba seasons');
assert.match(elements.hubSimRunnerCard.innerHTML, /Era Pool/, 'simulation hub runner should frame mixed-era source context with an era-pool label');
assert.match(elements.hubSimRunnerCard.innerHTML, /1986-87 \+ 2 more/, 'simulation hub runner should keep mixed-era source context compact');
assert.match(elements.hubRevealReportCard.innerHTML, /Reveal reports will appear here|League reports will appear here|Open Report|Day \d+ Is Official/, 'simulation hub should render the reveal-report lane');
assert.match(elements.hubCycleMeta.textContent, /Local League .* Reveal Day 12 Ready/, 'simulation hub should surface the polished reveal-ready cycle copy for nba seasons');
assert.equal(elements.rbChatTitle.textContent, 'League Notes', 'simulation hub should repurpose the side thread as a local-league notes surface');
assert.match(elements.rbOnlineCount.textContent, /local league/i, 'simulation hub should avoid multiplayer thread copy in the side notes surface');
assert.match(elements.rbChatPrompt.textContent, /trade ideas|roster plans|reveal windows/i, 'simulation hub should give the side notes surface local-league planning copy');
assert.equal(elements.hubPowerupsTitle.textContent, 'Reveal Powerups', 'nba simulation hub should title the side rail with reveal-first cadence');
assert.match(elements.hubPowerups.innerHTML, /White Gloves/, 'simulation hub should include the familiar white-gloves parity card');
assert.match(elements.hubPowerups.innerHTML, /Bench Boost/, 'simulation hub should include the familiar bench-boost parity card');
assert.match(elements.hubPowerups.innerHTML, /Sunday Surge/, 'simulation hub should include the familiar sunday-surge parity card');
assert.match(elements.hubActions.innerHTML, /Watch List/, 'simulation hub should surface the watch-list action card');
assert.match(elements.hubActions.innerHTML, /Trade Desk/, 'simulation hub should surface the trade-desk action card');
assert.match(elements.hubActions.innerHTML, /Open the league trade desk|incoming offer|pending sent offer/, 'simulation hub trade card should keep live trade context');
assert.match(elements.hubDataStamp.innerHTML, /openWatchList\(\)/, 'simulation hub should keep the watch-list meta action live');
assert.match(elements.hubDataStamp.innerHTML, /openTeamSettings\(\)/, 'simulation hub should keep the team-settings meta action live');
assert.equal(elements.hubTeamSettingsButton.style.display, 'none', 'simulation hub should hide the duplicate side-card team-settings button when meta links are present');
assert.match(elements.hubDataStamp.innerHTML, /Record:\s*9-3/, 'simulation hub should keep the record summary pill');
assert.match(elements.hubDataStamp.innerHTML, /Reveal Window:\s*Day 12 - Week 2/, 'simulation hub should use polished reveal-window pill wording for nba seasons');
assert.match(elements.hubDataStamp.innerHTML, /Era Pool:\s*1986-87 \+ 2 more/, 'simulation hub should keep the summary pill era pool compact');
assert.match(elements.hubPowerups.innerHTML, /Michael Jordan/, 'simulation hub should render the adapter-approved captain target');
assert.doesNotMatch(elements.hubPowerups.innerHTML, /Hakeem Olajuwon/, 'simulation hub should not rebuild captain targets from non-starter roster players');

api.renderSimulationRosterInSharedShell();
assert.equal(elements.rosterPowerups.style.display, 'none');
assert.equal(elements.rosterPowerups._shell.style.gridTemplateColumns, 'minmax(0,1fr)');
assert.equal(elements.rosterScheduleChip.textContent, 'Matchup');
assertSharedSinglePlayerRosterMarkers(
  elements.rosterContent.innerHTML,
  'simulation roster'
);
assert.match(elements.rosterContent.innerHTML, /Use Suggested Starters/);
assert.match(elements.rosterContent.innerHTML, /Set starters, tune your bench, and manage roster moves from one local-league room\./);
assert.match(elements.rosterContent.innerHTML, /Customize Team/, 'simulation roster should keep the old avatar-led team-room affordance');
assert.match(elements.rosterContent.innerHTML, /Roster Space/, 'simulation roster should keep the old roster-space command card');
assert.match(elements.rosterContent.innerHTML, /Bench Desk|Depth Desk/, 'simulation roster should keep the old bench/depth command card');
assert.match(elements.rosterContent.innerHTML, />Matchup</);
assert.match(elements.rosterContent.innerHTML, /Starters/);
assert.match(elements.rosterContent.innerHTML, /bench/i);
assert.match(elements.rosterContent.innerHTML, /Bench ready/);
assert.match(elements.rosterContent.innerHTML, /Michael Jordan/);
assert.match(elements.rosterContent.innerHTML, /Charles Barkley/);
assert.match(elements.rosterContent.innerHTML, /39\.3/, 'simulation roster should show projected FP for a scheduled player with no completed season stat line');
assert.match(elements.rosterContent.innerHTML, />Move</, 'simulation roster should use the original move-mode action instead of direct clear-only controls');
assert.doesNotMatch(elements.rosterContent.innerHTML, />Clear</, 'simulation roster should avoid awkward clear-only starter controls');
assert.match(elements.rosterContent.innerHTML, /openWatchList\(\)/, 'simulation roster should keep the watch-list action live');
assert.match(elements.rosterContent.innerHTML, /openTeamSettings\(\)/, 'simulation roster should keep the team-settings action live');
assert.match(elements.rosterContent.innerHTML, /No starters locked in yet|Michael Jordan/);
assert.match(elements.rosterContent.innerHTML, /vs BOS/, 'simulation roster rows should show the current opponent in the OPP column');
assert.match(elements.rosterContent.innerHTML, /Day 12/, 'simulation roster rows should show the current matchup day in the time column');
assert.match(elements.rosterContent.innerHTML, /Game today/i, 'simulation roster rows should explain when a starter has a game on the selected day');
sandbox.setSimulationRosterNavigationValue(13);
api.renderSimulationRosterInSharedShell();
assert.match(elements.rosterContent.innerHTML, /Day 13/, 'simulation roster should expose future day navigation in My Team');
assert.match(elements.rosterContent.innerHTML, /(?:vs|@) NYK|New York Knicks/, 'simulation roster rows should update the OPP column when a future day is selected');
sandbox.setSimulationRosterNavigationValue(12);

api.goPage('roster');
demoToasts = [];
simulationAdapterStub.lastLineupIds = null;
api.handleRosterAction('matchup');
assert.equal(api.getActiveSeasonPageId(), 'matchup', 'simulation matchup actions should route through goPage(matchup)');
api.goPage('roster');
api.handleRosterAction('schedule');
assert.equal(api.getActiveSeasonPageId(), 'matchup', 'simulation schedule actions should route through goPage(matchup)');
api.goPage('roster');
api.handleRosterAction('add');
assert.equal(api.getActiveSeasonPageId(), 'waiver', 'simulation add actions should route through goPage(waiver)');
api.goPage('roster');
api.handleRosterAction('waivers');
assert.equal(api.getActiveSeasonPageId(), 'waiver', 'simulation waivers actions should route through goPage(waiver)');
api.goPage('roster');
api.handleRosterAction('trades');
assert.equal(api.getActiveSeasonPageId(), 'trades', 'simulation trades actions should route through goPage(trades)');
api.goPage('roster');
api.handleRosterAction('set-lineup');
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastLineupIds),
  [null, 23, null, null, 34],
  'simulation set-lineup actions should route through slot-aware applySimulationSuggestedLineupFromShell'
);
demoToasts = [];
api.handleRosterAction('il');
api.handleRosterAction('drop');
assert.deepStrictEqual(
  demoToasts,
  [
    'That roster action is not available for this local league yet.',
    'That roster action is not available for this local league yet.'
  ],
  'simulation il/drop actions should surface the unavailable-flow toast instead of touching fantasy-only state'
);

historicalSlotUpsertCalls = [];
api.applySimulationSuggestedLineupFromShell();
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastLineupIds),
  [null, 23, null, null, 34],
  'partial shared-shell simulation lineups should keep players in eligible starter slots'
);

const freshRosterAdapterStub = {
  ...simulationAdapterStub,
  lastLineupIds: null,
  getRosterViewModel() {
    return {
      starterSlots: ['PG', 'SG', 'SF', 'PF', 'C'],
      roster: [
        { id: 1, name: 'Player 1', team: 'AAA', pos: 'PG' },
        { id: 2, name: 'Player 2', team: 'AAA', pos: 'SG' },
        { id: 3, name: 'Player 3', team: 'AAA', pos: 'SF' },
        { id: 4, name: 'Player 4', team: 'AAA', pos: 'PF' },
        { id: 5, name: 'Player 5', team: 'AAA', pos: 'C' },
        { id: 6, name: 'Player 6', team: 'AAA', pos: 'G' }
      ],
      lineup: [],
      bench: [
        { id: 1, name: 'Player 1', team: 'AAA', pos: 'PG' },
        { id: 2, name: 'Player 2', team: 'AAA', pos: 'SG' },
        { id: 3, name: 'Player 3', team: 'AAA', pos: 'SF' },
        { id: 4, name: 'Player 4', team: 'AAA', pos: 'PF' },
        { id: 5, name: 'Player 5', team: 'AAA', pos: 'C' },
        { id: 6, name: 'Player 6', team: 'AAA', pos: 'G' }
      ]
    };
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return this.getState();
  }
};

historicalSlotUpsertCalls = [];
api.setSeasonModeAdapter(freshRosterAdapterStub);
api.applySimulationSuggestedLineupFromShell();
assert.deepStrictEqual(
  toPlain(freshRosterAdapterStub.lastLineupIds),
  [1, 2, 3, 4, 5],
  'fresh shared-shell simulation teams should get a five-player suggested lineup'
);

const gameAwareRosterAdapterStub = {
  ...freshRosterAdapterStub,
  lastLineupIds: null,
  getScheduleViewModel() {
    return {
      scheduleByDay: {
        12: [
          { day: 12, awayAbbr: 'BBB', homeAbbr: 'CCC', time: '7:00 PM' },
          { day: 12, awayAbbr: 'DDD', homeAbbr: 'EEE', time: '8:30 PM' }
        ]
      },
      nextGame: { day: 12 }
    };
  },
  getRosterViewModel() {
    return {
      starterSlots: ['PG', 'SG', 'SF', 'PF', 'C'],
      roster: [
        { id: 101, name: 'Off Day Point God', team: 'AAA', pos: 'PG', fp: 80 },
        { id: 102, name: 'Playing Point Guard', team: 'BBB', pos: 'PG', fp: 30 },
        { id: 103, name: 'Playing Shooting Guard', team: 'DDD', pos: 'SG', fp: 28 },
        { id: 104, name: 'Playing Small Forward', team: 'EEE', pos: 'SF', fp: 27 },
        { id: 105, name: 'Playing Power Forward', team: 'CCC', pos: 'PF', fp: 26 },
        { id: 106, name: 'Playing Center', team: 'BBB', pos: 'C', fp: 25 }
      ],
      lineup: [],
      bench: []
    };
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return this.getState();
  }
};

historicalSlotUpsertCalls = [];
api.setSeasonModeAdapter(gameAwareRosterAdapterStub);
sandbox.setSimulationRosterNavigationValue(12);
api.applySimulationSuggestedLineupFromShell();
assert.deepStrictEqual(
  toPlain(gameAwareRosterAdapterStub.lastLineupIds),
  [102, 103, 104, 105, 106],
  'nba suggested starters should prefer players whose teams play on the selected lineup day'
);

const utilAwareRosterAdapterStub = {
  ...freshRosterAdapterStub,
  lastLineupIds: null,
  getScheduleViewModel() {
    return {
      scheduleByDay: {
        12: [
          { day: 12, awayAbbr: 'ACT', homeAbbr: 'LIV', time: '9:00 PM' }
        ]
      },
      nextGame: { day: 12 }
    };
  },
  getRosterViewModel() {
    return {
      starterSlots: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'UTIL', 'UTIL'],
      roster: [
        { id: 201, name: 'Active PG', team: 'ACT', pos: 'PG', fp: 32 },
        { id: 202, name: 'Active SG', team: 'ACT', pos: 'SG', fp: 31 },
        { id: 203, name: 'Active SF', team: 'LIV', pos: 'SF', fp: 30 },
        { id: 204, name: 'Active PF', team: 'LIV', pos: 'PF', fp: 29 },
        { id: 205, name: 'Active C', team: 'ACT', pos: 'C', fp: 28 },
        { id: 206, name: 'Active Bench Guard', team: 'ACT', pos: 'PG', fp: 27 },
        { id: 207, name: 'Active Bench Forward', team: 'LIV', pos: 'SF', fp: 26 },
        { id: 208, name: 'Active Utility One', team: 'ACT', pos: 'SG', fp: 25 },
        { id: 209, name: 'Active Utility Two', team: 'LIV', pos: 'PF', fp: 24 },
        { id: 210, name: 'Active Utility Three', team: 'ACT', pos: 'C', fp: 23 },
        { id: 211, name: 'Off Day Superstar', team: 'OFF', pos: 'PG', fp: 99 }
      ],
      lineup: [],
      bench: []
    };
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return this.getState();
  }
};

historicalSlotUpsertCalls = [];
api.setSeasonModeAdapter(utilAwareRosterAdapterStub);
sandbox.setSimulationRosterNavigationValue(12);
api.applySimulationSuggestedLineupFromShell();
assert.deepStrictEqual(
  toPlain(utilAwareRosterAdapterStub.lastLineupIds),
  [201, 202, 203, 204, 205, 206, 207, 208, 209, 210],
  'nba suggested starters should fill G/F/UTIL with remaining players who play on the selected day before off-day stars'
);

api.setSeasonModeAdapter({
  ...utilAwareRosterAdapterStub,
  getRosterViewModel() {
    return {
      layoutMode: 'local-league-parity',
      starterSlots: ['PG'],
      lineupSlots: {
        PG: { slot: 'PG', playerId: 301, suggestedPlayerId: 302 }
      },
      sections: {
        starters: {
          rows: [
            { slot: 'PG', playerId: 301, player: { id: 301, name: 'Off Day Guard', team: 'OFF', pos: 'PG' } }
          ]
        },
        bench: {
          rows: [
            { slot: 'BENCH', playerId: 302, player: { id: 302, name: 'Active Guard', team: 'ACT', pos: 'PG' } }
          ]
        }
      },
      nbaTeamScheduleByDay: {
        12: [
          { day: 12, awayAbbr: 'ACT', homeAbbr: 'LIV', time: '9:00 PM' }
        ]
      },
      roster: [
        { id: 301, name: 'Off Day Guard', team: 'OFF', pos: 'PG' },
        { id: 302, name: 'Active Guard', team: 'ACT', pos: 'PG' }
      ],
      lineup: [{ id: 301, name: 'Off Day Guard', team: 'OFF', pos: 'PG' }],
      bench: [{ id: 302, name: 'Active Guard', team: 'ACT', pos: 'PG' }]
    };
  }
});
sandbox.setSimulationRosterNavigationValue(12);
api.renderSimulationRosterInSharedShell();
assert.match(elements.rosterContent.innerHTML, /No game today/i, 'simulation roster rows should explain off-day players on the selected day');
assert.match(elements.rosterContent.innerHTML, /Game today/i, 'simulation roster rows should explain active bench options on the selected day');
api.setSeasonModeAdapter(simulationAdapterStub);

api.renderSimulationWaiverInSharedShell();
assert.match(elements.waiverContent.innerHTML, /Free Agents Control Room/i, 'simulation waiver desk should reuse the pre-simulation free-agent control room framing');
assert.match(elements.waiverContent.innerHTML, /Waiver Radar/i, 'simulation waiver desk should keep the old waiver radar surface');
assert.match(elements.waiverContent.innerHTML, /Pending Claims/i, 'simulation waiver desk should render a pending-claims section');
assert.match(elements.waiverContent.innerHTML, /GTD/i, 'simulation waiver desk should surface player health status on available-player rows');
assert.match(elements.waiverContent.innerHTML, /PTS 18\.2|REB 6\.4|AST 5\.9|TFP 2500/i, 'simulation waiver desk should surface player stat chips on available-player rows');
assert.match(elements.waiverContent.innerHTML, /Processing next reveal window|Processing next weekly window/i, 'simulation waiver desk should show delayed pending-claim timing');
assert.match(elements.waiverContent.innerHTML, /Submit Claim/i, 'simulation waiver desk should expose an explicit submit-claim action');
assert.doesNotMatch(elements.waiverContent.innerHTML, /claim resolves immediately/i, 'simulation waiver desk should not imply immediate claim resolution');

api.renderSimulationScheduleInSharedShell();
assert.equal(elements.matchupPowerups.style.display, 'none');
assert.equal(elements.matchupPowerups._shell.style.gridTemplateColumns, 'minmax(0,1fr)');
assert.equal(elements.matchupTitle.textContent, 'Matchup');
assert.match(elements.matchupNote.textContent, /head-to-head|matchup actions/i);
assert.match(elements.matchupContent.innerHTML, /Current Matchup|Schedule \/ Results/);
assert.match(elements.matchupContent.innerHTML, /BOS 108 at LAL 112/);
assert.match(elements.matchupContent.innerHTML, /season-hero-card|Current Matchup/, 'simulation matchup should reuse the single-player matchup framing');
assert.match(elements.matchupContent.innerHTML, /Current Matchup|Matchup Room/, 'simulation matchup should expose richer matchup hero framing');
assert.match(elements.matchupContent.innerHTML, /Open My Team|My Team/i, 'simulation matchup should expose a direct path back to the shared roster room');
assert.match(elements.matchupContent.innerHTML, /Open Waivers|Waivers/i, 'simulation matchup should expose a direct path into waivers');
assert.match(elements.matchupContent.innerHTML, /Review Matchup/, 'simulation matchup should keep matchup-first action wording');
assert.match(elements.matchupContent.innerHTML, /Previous Matchup|Recent Results/i, 'simulation matchup should expose historical matchup context instead of only a flat schedule list');
assert.match(elements.matchupContent.innerHTML, /Michael Jordan|Los Angeles Lakers|Boston Celtics/, 'simulation matchup should render richer side-by-side team context');
assert.match(elements.matchupContent.innerHTML, /setSimulationMatchupNavigationValue/, 'simulation matchup navigation should route through a live shared-shell navigation handler');

api.setSeasonModeAdapter({
  ...simulationAdapterStub,
  getScheduleViewModel() {
    return {
      title: 'Matchup / Results',
      cycleLabel: 'Day 12 - Week 2',
      detailCards: [
        { key: 'cycle', label: 'Season Cycle', value: 'Day 12 - Week 2' },
        { key: 'next-game', label: 'Current Matchup', value: 'vs Boston Celtics' }
      ],
      navigation: {
        mode: 'day',
        items: [
          { id: 'day-12', label: 'Day 12', active: true, cycleValue: 12 },
          { id: 'day-13', label: 'Day 13', active: false, cycleValue: 13 }
        ]
      },
      currentMatchup: { day: 12, home: true, opponentAbbr: 'BOS', opponentName: 'Boston Celtics' },
      recentResults: [
        { awayAbbr: 'BOS', awayScore: 108, homeAbbr: 'LAL', homeScore: 112 }
      ],
      actionCards: [
        { id: 'review-schedule', label: 'Review Matchup', targetPage: 'matchup', body: 'Scout Boston Celtics.' }
      ],
      scheduleByDay: {
        12: [{ awayAbbr: 'BOS', awayScore: 108, homeAbbr: 'LAL', homeScore: 112, home: true, opponentAbbr: 'BOS', opponentName: 'Boston Celtics' }],
        13: [{ day: 13, away: 3, awayAbbr: 'NYK', home: 0, homeAbbr: 'LAL', opponentAbbr: 'NYK', opponentName: 'New York Knicks' }]
      }
    };
  }
});
api.setData({
  ...api.getData(),
  leagueShell: {
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers' },
      { abbr: 'BOS', name: 'Boston Celtics' },
      { abbr: 'CHI', name: 'Chicago Bulls' },
      { abbr: 'NYK', name: 'New York Knicks' }
    ]
  },
  draftState: {
    ...(api.getData().draftState || {}),
    controlledTeamAbbr: 'LAL'
  },
  seasonState: {
    ...(api.getData().seasonState || {}),
    completedGameLogs: [
      { day: 13, home: 0, away: 3, homeScore: 99, awayScore: 101, outcomeSource: 'simulation_engine' }
    ]
  }
});
sandbox.setSimulationMatchupNavigationValue(13);
api.renderSimulationScheduleInSharedShell();
assert.match(elements.matchupContent.innerHTML, /New York Knicks|NYK/, 'simulation matchup navigation should swap the displayed opponent context when a new day is selected');
assert.match(elements.matchupContent.innerHTML, /Day 13/, 'simulation matchup navigation should update the displayed navigation window');
assert.match(elements.matchupContent.innerHTML, /(?:vs|@) New York Knicks|(?:vs|@) NYK/, 'simulation matchup navigation should keep the matchup detail cards in sync with the selected opponent');
assert.match(elements.matchupContent.innerHTML, /NYK 101 at LAL 99/, 'simulation matchup navigation should show selected completed-game scores when the schedule shell has no score fields');
assert.doesNotMatch(elements.matchupContent.innerHTML, /NYK -- at LAL --/, 'completed simulation matchups should not look like unrevealed scoreless schedule rows');
assert.match(elements.matchupContent.innerHTML, /Review the completed result against New York Knicks\./, 'selected completed matchups should not keep stale scout copy for the next opponent');
api.setSeasonModeAdapter(simulationAdapterStub);
sandbox.setSimulationMatchupNavigationValue(12);

api.goPage('waiver');
const waiverSearchInput = sandbox.document.getElementById('wSrch');
const waiverPosInput = sandbox.document.getElementById('wPos');
waiverSearchInput.value = 'Scottie';
waiverPosInput.value = 'SF';
api.renderSimulationWaiverInSharedShell();
assert.match(elements.waiverContent.innerHTML, /Scottie Pippen/, 'simulation waiver renderer should show matching searched players');
assert.doesNotMatch(elements.waiverContent.innerHTML, /Dennis Rodman/, 'simulation waiver renderer should exclude non-matching players before the advance');
assert.match(elements.waiverContent.innerHTML, /Watch List|Waiver Order/, 'simulation waivers should expose parity meta affordances');
api.advanceWeek();
assert.ok(api.getActiveSeasonPages().includes('playoffs'), 'nav should expose Playoffs after the adapter enters postseason');
assert.match(elements.hn.innerHTML, /Playoffs/, 'advanceWeek should rebuild hub nav when playoffs become available');
assert.equal(api.getActiveSeasonPageId(), 'waiver', 'simulation advance should preserve the active page when it remains valid');
assert.equal(waiverSearchInput.value, 'Scottie', 'simulation advance should preserve the waiver search input');
assert.equal(waiverPosInput.value, 'SF', 'simulation advance should preserve the waiver position filter');
assert.match(elements.waiverContent.innerHTML, /Scottie Pippen/, 'simulation advance should preserve the filtered waiver match');
assert.doesNotMatch(elements.waiverContent.innerHTML, /Dennis Rodman/, 'simulation advance should preserve the filtered waiver exclusion');

api.goPage('playoffs');
assert.equal(elements.playoffsPowerups.style.display, 'none');
assert.equal(elements.playoffsPowerups._shell.style.gridTemplateColumns, 'minmax(0,1fr)');
assert.match(elements.playoffsContent.innerHTML, /Play-In/i);
assert.match(elements.playoffsContent.innerHTML, /Indiana Pacers/);
assert.match(elements.playoffsContent.innerHTML, /Dallas Mavericks/);
assert.match(elements.playoffsContent.innerHTML, /BOS/);
assert.match(elements.playoffsContent.innerHTML, /LAL/);
assert.match(elements.playoffsContent.innerHTML, /3-2|2-1/);
assert.match(elements.playoffsContent.innerHTML, /Finals|Round 1|Playoffs Round 1/i);
const activePlayoffsContentBeforeAdvance = elements.playoffsContent.innerHTML;

setSimulationStubPhase('completed');
assert.equal(api.getActiveSeasonPageId(), 'playoffs', 'playoffs should remain the active screen before the rerender advance');
assert.equal(elements.playoffsContent.innerHTML, activePlayoffsContentBeforeAdvance, 'changing the adapter state alone should not refresh the active playoffs screen');
api.advanceWeek();
assert.equal(api.getActiveSeasonPageId(), 'playoffs', 'playoffs should stay active while advanceWeek rerenders it in place');
assert.notEqual(elements.playoffsContent.innerHTML, activePlayoffsContentBeforeAdvance, 'advanceWeek should replace the active playoffs screen content when adapter postseason state changes');
assert.match(elements.playoffsContent.innerHTML, /NBA Champions/i);
assert.match(elements.playoffsContent.innerHTML, /Los Angeles Lakers/);
assert.match(elements.playoffsContent.innerHTML, /Completed/i, 'active-screen rerender should surface the updated completed-phase playoffs state');

api.setSeasonModeAdapter({
  ...simulationAdapterStub,
  getScheduleViewModel() {
    return {
      sport: 'nba',
      hero: { controlledTeamAbbr: 'LAL' },
      scheduleByDay: {
        12: [
          { day: 12, awayAbbr: 'SAS', homeAbbr: 'LAL' },
          { day: 12, awayAbbr: 'BOS', homeAbbr: 'CHI' }
        ]
      }
    };
  },
  prepareLiveMatchup({ homeAbbr, awayAbbr }) {
    const key = `${String(awayAbbr || '').toUpperCase()}@${String(homeAbbr || '').toUpperCase()}`;
    if (key === 'SAS@LAL') {
      return {
        gameLog: {
          awayTotal: 89.2,
          homeTotal: 0,
          awayEntries: [{ finalScore: 48.5 }],
          homeEntries: []
        }
      };
    }
    return {
      gameLog: {
        awayTotal: 104.4,
        homeTotal: 99.8,
        awayEntries: [{ finalScore: 54.1 }],
        homeEntries: [{ finalScore: 46.6 }]
      }
    };
  }
});
api.setData({
  sport: 'nba',
  activeSeasonBackend: 'simulation',
  draftState: { controlledTeamAbbr: 'LAL' },
  seasonState: { currentDay: 12, completedGameLogs: [] }
});
const liveRevealShowcase = api.findSimulationRevealLiveMatchup();
assert.deepStrictEqual(
  toPlain({ awayAbbr: liveRevealShowcase?.awayAbbr, homeAbbr: liveRevealShowcase?.homeAbbr }),
  { awayAbbr: 'BOS', homeAbbr: 'CHI' },
  'league-home live reveal should skip a controlled-team matchup when one side has no active fantasy scoring and pick a playable showcase instead'
);
api.setSeasonModeAdapter(simulationAdapterStub);

api.renderSimulationWaiverInSharedShell();
assert.match(elements.waiverContent.innerHTML, /Scottie Pippen/);
assert.match(elements.waiverContent.innerHTML, /Free Agents Control Room/i, 'simulation waiver desk should still use the control room shell after state advances');
assert.match(elements.waiverContent.innerHTML, /Watch List Snapshot/i, 'simulation waiver desk should preserve the old watch-list snapshot area');
assert.match(elements.waiverContent.innerHTML, /Submit Claim/i, 'simulation waiver desk should switch from immediate adds to claim submission copy');
assert.match(elements.waiverContent.innerHTML, /Pending Claims/i, 'simulation waiver desk should reserve space for pending claims instead of immediate roster mutation');
assert.match(elements.waiverContent.innerHTML, /Recent Waiver Results/i, 'simulation waiver desk should surface recent claim outcomes alongside pending claims');
assert.match(elements.waiverContent.innerHTML, /Grant Hill/, 'simulation waiver desk should render pending claim rows from the adapter view model');
assert.match(elements.waiverContent.innerHTML, /Chris Mullin/, 'simulation waiver desk should render recent claim-result rows from the adapter view model');
assert.match(elements.waiverContent.innerHTML, /Drop Player/i, 'simulation waiver desk should show drop consequences before submitting a full-roster claim');
assert.match(elements.waiverContent.innerHTML, /submitSimulationWaiverClaimFromShell\(/, 'simulation waiver desk should route claim submission through a dedicated pending-claim shell helper');
assert.doesNotMatch(elements.waiverContent.innerHTML, /claimSimulationFreeAgentFromShell\(/, 'simulation waiver desk should stop wiring add buttons directly to the legacy immediate-claim helper');
simulationAdapterStub.lastSubmittedWaiverClaim = null;
simulationAdapterStub.lastCancelledWaiverClaim = null;
historicalSlotUpsertCalls = [];
api.submitSimulationWaiverClaimFromShell(33);
assert.equal(simulationAdapterStub.lastSubmittedWaiverClaim, null, 'simulation waiver submit helper should require an explicit drop selection when the roster is full');
assert.equal(historicalSlotUpsertCalls.length, 0, 'simulation waiver submit helper should not persist until the claim is valid');
elements['simulation-waiver-drop-select-33'].value = '34';
api.submitSimulationWaiverClaimFromShell(33);
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastSubmittedWaiverClaim),
  {
    teamAbbr: 'LAL',
    addPlayerId: 33,
    dropPlayerId: 34
  },
  'simulation waiver submit helper should pass add/drop claim details through the adapter'
);
api.cancelSimulationWaiverClaimFromShell('pending-1');
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastCancelledWaiverClaim),
  { claimId: 'pending-1' },
  'simulation waiver cancel helper should route claim cancellation through the adapter'
);

const fallbackWaiverAdapter = {
  ...simulationAdapterStub,
  getWaiverViewModel() {
    return {
    claimTimingLabel: 'Processing next reveal window',
      availablePlayers: [
        {
          id: 333,
          name: 'Legacy Waiver Fallback',
          team: 'LEG',
          pos: 'SG',
          dropOptions: [
            { value: 34, label: 'Hakeem Olajuwon · C' }
          ],
          suggestedDropPlayerId: 34
        }
      ]
    };
  }
};
api.setSeasonModeAdapter(fallbackWaiverAdapter);
fallbackWaiverAdapter.lastSubmittedWaiverClaim = null;
elements.wSrch.value = '';
elements.wPos.value = 'ALL';
api.renderSimulationWaiverInSharedShell();
assert.match(elements.waiverContent.innerHTML, /Legacy Waiver Fallback/, 'simulation waiver desk should continue rendering compatibility fallback players');
assert.match(elements.waiverContent.innerHTML, /simulation-waiver-drop-select-333/, 'simulation waiver desk should key fallback drop selectors from plain player ids too');
api.submitSimulationWaiverClaimFromShell(333);
assert.equal(fallbackWaiverAdapter.lastSubmittedWaiverClaim, null, 'simulation waiver submit helper should still require a drop selection for fallback players when one is needed');
elements['simulation-waiver-drop-select-333'].value = '34';
api.submitSimulationWaiverClaimFromShell(333);
assert.deepStrictEqual(
  toPlain(fallbackWaiverAdapter.lastSubmittedWaiverClaim),
  {
    teamAbbr: 'LAL',
    addPlayerId: 333,
    dropPlayerId: 34
  },
  'simulation waiver submit helper should support compatibility fallback players rendered from availablePlayers'
);
api.setSeasonModeAdapter(simulationAdapterStub);

api.setGame({
  ...api.getGame(),
  tradeOffers: [
    { fromTeam: 1, toTeam: 0, give: [30], get: [34], status: 'pending' },
    { fromTeam: 0, toTeam: 1, give: [34], get: [30], status: 'pending' }
  ]
});
api.renderSimulationTradesInSharedShell();
assert.match(elements.tradesContent.innerHTML, /Boston Celtics/);
assert.match(elements.tradesContent.innerHTML, /openSimulationTradeBuilderModal\('BOS'\)/);
assert.match(elements.tradesContent.innerHTML, /Build Trade/i);
assert.doesNotMatch(elements.tradesContent.innerHTML, /applySimulationTradeFromShell\('BOS'\)/, 'simulation trades should retire the legacy quick-trade apply path now that modal apply is wired');
assert.doesNotMatch(elements.tradesContent.innerHTML, /simulation-trade-outgoing-select-BOS/, 'simulation trades should not render the old outgoing quick-trade select');
assert.doesNotMatch(elements.tradesContent.innerHTML, /simulation-trade-incoming-select-BOS/, 'simulation trades should not render the old incoming quick-trade select');
assert.match(elements.tradesContent.innerHTML, /Trade Desk|Pending Offers/, 'simulation trades should feel like the single-player trade desk');
assert.match(elements.tradesContent.innerHTML, /Incoming Offers/i, 'simulation trades should render an incoming-offers lane');
assert.match(elements.tradesContent.innerHTML, /Sent Offers/i, 'simulation trades should render a sent-offers lane');
assert.match(elements.tradesContent.innerHTML, /Open A Conversation/i, 'simulation trades should render the richer conversation section');
assert.match(elements.tradesContent.innerHTML, /Review incoming offers, test one-for-one swaps, and track league trade pressure\./, 'simulation trades should use product-facing trade desk framing');
assert.match(elements.tradesContent.innerHTML, /Pick a partner, then build anything from a quick one-for-one to a five-player package\./, 'simulation trades should describe package building from partner cards');
assert.match(elements.tradesContent.innerHTML, /7-5/, 'simulation trades should surface partner record context');
assert.match(elements.tradesContent.innerHTML, /Top asset: Stephen Curry/, 'simulation trades should surface partner top-player context');
assert.match(elements.tradesContent.innerHTML, /13 players/, 'simulation trades should surface partner roster counts');
assert.doesNotMatch(elements.tradesContent.innerHTML, /Optional package player/i, 'simulation trades should keep package player selection inside the modal');
assert.match(elements.tradesContent.innerHTML, /Replacement value/i, 'simulation trades should explain that uneven deals are judged against the waiver wire');
assert.doesNotMatch(elements.tradesContent.innerHTML, /simulation-trade-preview-BOS/, 'simulation trades should not render the legacy inline preview panel');
assert.doesNotMatch(elements.tradesContent.innerHTML, /updateSimulationTradePreviewFromShell\('BOS'\)/, 'simulation trades should move live preview updates into the modal builder');
assert.match(elements.tradesContent.innerHTML, /best waiver fill-in/i, 'simulation trade desk should tell managers uneven trades may require a waiver fill-in');

delete elements.simulationTradeBuilderModal;
delete elements.simulationTradeBuilderPreview;
sandbox.document.body.lastInsertedHTML = '';
api.openSimulationTradeBuilderModal('BOS');
assert.equal(sandbox.document.body.lastInsertPosition, 'beforeend', 'trade builder modal opener should insert the shell into document body');
assert.match(sandbox.document.body.lastInsertedHTML, /id="simulationTradeBuilderModal"/, 'trade builder modal opener should insert the modal backdrop');
assert.match(sandbox.document.body.lastInsertedHTML, /Trade With Boston Celtics/, 'trade builder modal should include partner context');
assert.match(elementsBodyHtml(), /Trade With Boston/i, 'trade builder modal should open for the selected partner');
assert.match(elementsBodyHtml(), /You Send/i, 'trade builder modal should render outgoing side');
assert.match(elementsBodyHtml(), /You Get/i, 'trade builder modal should render incoming side');
assert.match(sandbox.document.body.lastInsertedHTML, /id="simulationTradeBuilderApply"[^>]*disabled/, 'trade builder modal apply button should start disabled');
assert.match(sandbox.document.body.lastInsertedHTML, /onclick="applySimulationTradeBuilderPackage\('BOS'\)"/, 'trade builder modal apply button should use the package helper contract');
assert.match(sandbox.document.body.lastInsertedHTML, /data-simulation-trade-builder-side="outgoing"/, 'trade builder modal should render outgoing player checkboxes');
assert.match(sandbox.document.body.lastInsertedHTML, /data-simulation-trade-builder-side="incoming"/, 'trade builder modal should render incoming player checkboxes');
assert.match(sandbox.document.body.lastInsertedHTML, /id="simulationTradeBuilderPreview"/, 'trade builder modal should include the real preview mount in inserted markup');
assert.match(elements.simulationTradeBuilderPreview.innerHTML, /Choose at least one player on both sides/i, 'trade builder modal should render the stub preview state into the real preview mount');
assert.match(elementsBodyHtml(), /Choose at least one player on both sides/i, 'trade builder preview should explain empty selections');
const tradeBuilderInputs = sandbox.document.querySelectorAll('[data-simulation-trade-builder-side]');
const outgoingTradeBuilderInput = tradeBuilderInputs.find((input) => (
  input.getAttribute('data-simulation-trade-builder-partner') === 'BOS'
    && input.getAttribute('data-simulation-trade-builder-side') === 'outgoing'
    && input.getAttribute('data-player-id') === '34'
));
const incomingTradeBuilderInput = tradeBuilderInputs.find((input) => (
  input.getAttribute('data-simulation-trade-builder-partner') === 'BOS'
    && input.getAttribute('data-simulation-trade-builder-side') === 'incoming'
    && input.getAttribute('data-player-id') === '30'
));
const lowOutgoingTradeBuilderInput = tradeBuilderInputs.find((input) => (
  input.getAttribute('data-simulation-trade-builder-partner') === 'BOS'
    && input.getAttribute('data-simulation-trade-builder-side') === 'outgoing'
    && input.getAttribute('data-player-id') === '101'
));
const extraLowOutgoingTradeBuilderInput = tradeBuilderInputs.find((input) => (
  input.getAttribute('data-simulation-trade-builder-partner') === 'BOS'
    && input.getAttribute('data-simulation-trade-builder-side') === 'outgoing'
    && input.getAttribute('data-player-id') === '102'
));
const superstarIncomingTradeBuilderInput = tradeBuilderInputs.find((input) => (
  input.getAttribute('data-simulation-trade-builder-partner') === 'BOS'
    && input.getAttribute('data-simulation-trade-builder-side') === 'incoming'
    && input.getAttribute('data-player-id') === '99'
));
const stringOutgoingTradeBuilderInput = tradeBuilderInputs.find((input) => (
  input.getAttribute('data-simulation-trade-builder-partner') === 'BOS'
    && input.getAttribute('data-simulation-trade-builder-side') === 'outgoing'
    && input.getAttribute('data-player-id') === 'uuid-send-0'
));
const stringIncomingTradeBuilderInput = tradeBuilderInputs.find((input) => (
  input.getAttribute('data-simulation-trade-builder-partner') === 'BOS'
    && input.getAttribute('data-simulation-trade-builder-side') === 'incoming'
    && input.getAttribute('data-player-id') === 'uuid-get-0'
));
assert.ok(outgoingTradeBuilderInput, 'trade builder modal should expose a real outgoing checkbox in inserted markup');
assert.ok(incomingTradeBuilderInput, 'trade builder modal should expose a real incoming checkbox in inserted markup');
assert.ok(lowOutgoingTradeBuilderInput, 'trade builder modal should expose bench outgoing checkbox in inserted markup');
assert.ok(extraLowOutgoingTradeBuilderInput, 'trade builder modal should expose second bench outgoing checkbox in inserted markup');
assert.ok(superstarIncomingTradeBuilderInput, 'trade builder modal should expose superstar incoming checkbox in inserted markup');
assert.ok(stringOutgoingTradeBuilderInput, 'trade builder modal should expose string-id outgoing checkbox in inserted markup');
assert.ok(stringIncomingTradeBuilderInput, 'trade builder modal should expose string-id incoming checkbox in inserted markup');
outgoingTradeBuilderInput.checked = true;
incomingTradeBuilderInput.checked = true;
api.updateSimulationTradeBuilderPreview('BOS');
assert.equal(elements.simulationTradeBuilderApply.disabled, false, 'trade builder apply button should enable after both sides are selected');
assert.match(
  elements.simulationTradeBuilderPreview.innerHTML,
  /You give[\s\S]*Hakeem Olajuwon[\s\S]*You get[\s\S]*Stephen Curry[\s\S]*(Package read|Fairness check)/i,
  'trade builder preview should show selected packages and fairness language'
);
assert.match(
  elements.simulationTradeBuilderPreview.innerHTML,
  /55\.0 FP[\s\S]*58\.0 FP/i,
  'trade builder preview should show total outgoing and incoming value'
);
incomingTradeBuilderInput.checked = false;
api.updateSimulationTradeBuilderPreview('BOS');
assert.equal(elements.simulationTradeBuilderApply.disabled, true, 'trade builder apply button should disable again when one side is empty');
assert.match(elements.simulationTradeBuilderPreview.innerHTML, /Choose at least one player on both sides/i, 'trade builder preview should return to validation copy when one side is empty');
outgoingTradeBuilderInput.checked = false;
lowOutgoingTradeBuilderInput.checked = true;
extraLowOutgoingTradeBuilderInput.checked = true;
superstarIncomingTradeBuilderInput.checked = true;
api.updateSimulationTradeBuilderPreview('BOS');
assert.equal(elements.simulationTradeBuilderApply.disabled, true, 'trade builder apply button should stay disabled when fairness blocks the selected package');
assert.match(elements.simulationTradeBuilderPreview.innerHTML, /Block[\s\S]*giving up too much|giving up too much[\s\S]*Block/i, 'trade builder preview should show the blocked fairness verdict for lopsided packages');
lowOutgoingTradeBuilderInput.checked = false;
extraLowOutgoingTradeBuilderInput.checked = false;
superstarIncomingTradeBuilderInput.checked = false;
stringOutgoingTradeBuilderInput.checked = true;
stringIncomingTradeBuilderInput.checked = true;
api.updateSimulationTradeBuilderPreview('BOS');
assert.deepStrictEqual(
  toPlain(api.getSimulationTradeBuilderSelectedIds('BOS', 'outgoing')),
  ['uuid-send-0'],
  'trade builder selected ids should preserve stable string keys'
);
assert.equal(elements.simulationTradeBuilderApply.disabled, false, 'trade builder apply button should enable for valid string-id selections');
assert.match(
  elements.simulationTradeBuilderPreview.innerHTML,
  /String Key Send[\s\S]*String Key Get[\s\S]*(Package read|Fairness check)/i,
  'trade builder preview should resolve and render non-numeric player ids'
);
api.closeSimulationTradeBuilderModal();
assert.equal(elements.simulationTradeBuilderModal, undefined, 'trade builder modal closer should remove the inserted modal element');

api.openSimulationTradeBuilderModal('BOS');
const blockedTradeBuilderInputs = sandbox.document.querySelectorAll('[data-simulation-trade-builder-side]');
blockedTradeBuilderInputs.forEach((input) => { input.checked = false; });
blockedTradeBuilderInputs.find((input) => input.getAttribute('data-player-id') === '101').checked = true;
blockedTradeBuilderInputs.find((input) => input.getAttribute('data-player-id') === '102').checked = true;
blockedTradeBuilderInputs.find((input) => input.getAttribute('data-player-id') === '99').checked = true;
demoToasts = [];
simulationAdapterStub.lastTrade = null;
const blockedRosterSnapshot = toPlain(simulationAdapterStub.getState().draftState.rostersByTeam);
api.applySimulationTradeBuilderPackage('BOS');
assert.equal(simulationAdapterStub.lastTrade, null, 'trade builder apply should not call the adapter when fairness blocks the package');
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.getState().draftState.rostersByTeam),
  blockedRosterSnapshot,
  'blocked trade builder package should not mutate either roster'
);
assert.deepStrictEqual(
  demoToasts,
  ['Trade blocked: Boston Celtics would be giving up too much after replacement value.'],
  'blocked trade builder package should explain the fairness rejection'
);
assert.ok(elements.simulationTradeBuilderModal, 'blocked trade builder package should leave the modal open for editing');
assert.match(elements.tradesContent.innerHTML, /waiver replacement/i, 'blocked trade builder package should refresh Trade Desk feedback');
api.closeSimulationTradeBuilderModal();

setSimulationStubPhase('regular_season');
api.setSeasonModeAdapter(simulationAdapterStub);
api.setData({
  ...(api.getData() || {}),
  draftState: {
    ...((api.getData() || {}).draftState || {}),
    controlledTeamAbbr: 'LAL'
  }
});
api.renderSimulationTradesInSharedShell();
api.openSimulationTradeBuilderModal('BOS');
const validTradeBuilderInputs = sandbox.document.querySelectorAll('[data-simulation-trade-builder-side]');
validTradeBuilderInputs.forEach((input) => { input.checked = false; });
validTradeBuilderInputs.find((input) => input.getAttribute('data-player-id') === '34').checked = true;
validTradeBuilderInputs.find((input) => input.getAttribute('data-player-id') === '30').checked = true;
demoToasts = [];
historicalSlotUpsertCalls = [];
simulationAdapterStub.lastTrade = null;
api.applySimulationTradeBuilderPackage('BOS');
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastTrade),
  {
    fromTeamAbbr: 'LAL',
    toTeamAbbr: 'BOS',
    outgoingPlayerIds: [34],
    incomingPlayerIds: [30]
  },
  'trade builder apply should send the selected modal package through the adapter trade path'
);
assert.equal(elements.simulationTradeBuilderModal, undefined, 'trade builder apply should close the modal after a successful package');
assert.deepStrictEqual(
  demoToasts,
  ['Trade applied: Hakeem Olajuwon for Stephen Curry.'],
  'trade builder apply should confirm a successful package trade'
);
assert.match(
  elements.tradesContent.innerHTML,
  /Trade applied: Hakeem Olajuwon for Stephen Curry\./,
  'trade builder apply should refresh Trade Desk content with success feedback'
);
assert.ok(
  simulationAdapterStub.getState().draftState.rostersByTeam.LAL.some((player) => Number(player.id) === 30),
  'trade builder apply should move the incoming player onto the controlled roster'
);
assert.ok(
  simulationAdapterStub.getState().draftState.rostersByTeam.BOS.some((player) => Number(player.id) === 34),
  'trade builder apply should move every outgoing player onto the partner roster'
);

setSimulationStubPhase('regular_season');
api.setSeasonModeAdapter(simulationAdapterStub);
api.renderSimulationTradesInSharedShell();
api.openSimulationTradeBuilderModal('BOS');
const fairTwoForOneInputs = sandbox.document.querySelectorAll('[data-simulation-trade-builder-side]');
fairTwoForOneInputs.forEach((input) => { input.checked = false; });
fairTwoForOneInputs.find((input) => input.getAttribute('data-player-id') === '34').checked = true;
fairTwoForOneInputs.find((input) => input.getAttribute('data-player-id') === '102').checked = true;
fairTwoForOneInputs.find((input) => input.getAttribute('data-player-id') === '30').checked = true;
demoToasts = [];
historicalSlotUpsertCalls = [];
simulationAdapterStub.lastTrade = null;
api.updateSimulationTradeBuilderPreview('BOS');
assert.equal(elements.simulationTradeBuilderApply.disabled, false, 'trade builder apply button should enable for a fair 2-for-1 package');
assert.match(
  elements.simulationTradeBuilderPreview.innerHTML,
  /62\.0 FP[\s\S]*58\.0 FP/i,
  'trade builder preview should total a selected 2-for-1 package inside the modal'
);
assert.doesNotMatch(
  elements.simulationTradeBuilderPreview.innerHTML,
  /Package Fairness/i,
  'trade builder preview should not stack a second conflicting fairness model under the main preview'
);
assert.match(
  elements.simulationTradeBuilderPreview.innerHTML,
  /Replacement context/i,
  'trade builder preview should explain the uneven-package replacement context once'
);
api.applySimulationTradeBuilderPackage('BOS');
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastTrade),
  {
    fromTeamAbbr: 'LAL',
    toTeamAbbr: 'BOS',
    outgoingPlayerIds: [34, 102],
    incomingPlayerIds: [30]
  },
  'trade builder apply should send both selected outgoing players for a fair 2-for-1 package'
);
assert.equal(elements.simulationTradeBuilderModal, undefined, 'trade builder apply should close the modal after a fair 2-for-1 package');
assert.deepStrictEqual(
  demoToasts,
  ['Trade applied: Hakeem Olajuwon + Bench Wing for Stephen Curry.'],
  'trade builder apply should name both outgoing players when a fair 2-for-1 package applies'
);
assert.ok(
  simulationAdapterStub.getState().draftState.rostersByTeam.BOS.some((player) => Number(player.id) === 102),
  'fair 2-for-1 package should move the optional package player to the partner roster'
);

api.setData({
  sport: 'nba',
  leagueName: 'Local Trade Modal QA',
  myPos: 0,
  teams: ['QA Hawks', 'Rim Rockers'],
  multiplayer: true,
  isCommissioner: true,
  tradeConversations: {}
});
api.setGame({
  day: 1,
  week: 1,
  rosters: [
    [
      { id: 'me-star', name: 'String Star', team: 'ATL', pos: 'PG', fp: 44 },
      { id: 'me-depth', name: 'String Depth', team: 'ATL', pos: 'SG', fp: 18 }
    ],
    [
      { id: 'them-good', name: 'Partner Good', team: 'BOS', pos: 'SF', fp: 43 },
      { id: 'them-low', name: 'Partner Low', team: 'BOS', pos: 'PF', fp: 8 }
    ]
  ],
  starters: [['me-star'], ['them-good']],
  tradeOffers: [],
  waiver: [{ id: 'waiver-fill', name: 'Waiver Fill', team: 'FA', pos: 'G', fp: 20 }],
  standings: [
    { teamIdx: 0, teamAbbr: 'ATL', w: 0, l: 0, pf: 0, pa: 0 },
    { teamIdx: 1, teamAbbr: 'BOS', w: 0, l: 0, pf: 0, pa: 0 }
  ]
});
elements.tradeBuilderMount = createElement('tradeBuilderMount');
demoToasts = [];
sandbox.document.body.lastInsertedHTML = '';
api.renderTrades();
assert.match(elements.tradesContent.innerHTML, /data-trade-team="1"/, 'local trade desk should render partner cards for modal entry');
assert.match(elements.tradesContent.innerHTML, /onclick="openTrade\(1\)"/, 'local trade partner cards should directly open the canonical modal builder');
api.openTrade(1);
assert.ok(elements.localTradeBuilderModal, 'local trade builder should open in a modal for the selected partner');
assert.match(elementsBodyHtml(), /Build Trade With Rim Rockers/, 'local trade builder modal should name the selected partner');
assert.equal(elements.tradeBuilderMount.innerHTML, '', 'local trade builder should not render the old inline builder');
api.toggleTr('give', 'me-star');
api.toggleTr('get', 'them-low');
assert.match(elements.localTradeBuilderModal.innerHTML, /44\.0 FP outgoing total/i, 'local trade builder summary should show the outgoing side total');
assert.match(elements.localTradeBuilderModal.innerHTML, /8\.0 FP incoming total/i, 'local trade builder summary should show the incoming side total');
assert.match(elements.localTradeBuilderModal.innerHTML, /Blocked/, 'local trade builder modal should show blocked state for unfair packages');
api.submitTrade();
assert.ok(elements.localTradeBuilderModal, 'blocked local trade package should leave the modal open for edits');
assert.equal(api.getGame().tradeOffers.length, 0, 'local trade builder should not create offers for blocked packages');
assert.match(demoToasts.at(-1), /Trade blocked|giving up too much|blocked/i, 'local trade builder should explain blocked packages');

demoToasts = [];
api.toggleTr('get', 'them-low');
api.toggleTr('get', 'them-good');
assert.doesNotMatch(elements.localTradeBuilderModal.innerHTML, /Blocked/, 'local trade builder should clear blocked state after a fair string-id package');
api.submitTrade();
assert.equal(api.getGame().tradeOffers.length, 1, 'local trade builder should create a pending offer for valid packages');
assert.deepStrictEqual(
  toPlain(api.getGame().tradeOffers[0].give),
  ['me-star'],
  'local trade builder should preserve string outgoing ids when sending offers'
);
assert.deepStrictEqual(
  toPlain(api.getGame().tradeOffers[0].get),
  ['them-good'],
  'local trade builder should preserve string incoming ids when sending offers'
);
assert.ok(!elements.localTradeBuilderModal, 'successful local trade send should close the modal');
assert.match(demoToasts.at(-1), /Trade sent to Rim Rockers/, 'local trade builder should show success feedback after sending');

api.renderSimulationStandingsInSharedShell();
assert.match(elements.standingsContent.innerHTML, /(Los Angeles Lakers|LAL)/);
assert.match(elements.standingsContent.innerHTML, /LAL/);
assert.match(elements.standingsContent.innerHTML, />9</);
assert.match(elements.standingsContent.innerHTML, />3</);
assert.match(elements.standingsContent.innerHTML, /1360\.0/);
assert.match(elements.standingsContent.innerHTML, /1288\.0/);
assert.match(elements.standingsContent.innerHTML, /Track conference races, division pressure, and full league positioning from one local-league board\./);
assert.match(elements.standingsContent.innerHTML, /season-hero-card|Standings/, 'simulation standings should reuse the single-player standings framing');

api.setSeasonModeAdapter({
  getStandingsViewModel() {
    return {
      sport: 'nba',
      rows: [],
      sections: []
    };
  }
});
api.renderSimulationStandingsInSharedShell();
assert.match(elements.standingsContent.innerHTML, /No standings available\./, 'shared simulation standings should preserve the empty-state message when no rows are available');
api.setSeasonModeAdapter(simulationAdapterStub);

const normalized = toPlain(api.normalizeSharedSimulationSeasonBootState(fixture, 'sim-slot-1'));

assert.equal(normalized.sport, 'nba', 'boot normalization should preserve sport');
assert.equal(normalized.historicalUniverseSlotId, 'sim-slot-1', 'boot normalization should preserve the slot id');
assert.equal(normalized.seasonId, 'simulation:sim-slot-1', 'boot normalization should create a stable season id');
assert.equal(normalized.leagueSize, 2, 'boot normalization should derive the league size from the simulation teams');
assert.equal(normalized.currentDay, 12, 'boot normalization should copy the current day');
assert.equal(normalized.currentWeek, 2, 'boot normalization should copy the current week');
assert.ok(
  normalized.seasonState,
  'single-player replacement boot normalization should preserve simulation-native seasonState for unified engine handoff'
);
assert.equal(
  normalized.legacyHistoricalStatMode ?? false,
  false,
  'single-player replacement boot normalization should not advertise legacy stat-replay mode'
);
assert.deepEqual(
  normalized.teams,
  ['Los Angeles Lakers', 'Boston Celtics'],
  'boot normalization should expose team names in the legacy shell format'
);
assert.ok(Array.isArray(normalized.allRosters), 'boot normalization should always define allRosters');
assert.equal(normalized.allRosters.length, 2, 'boot normalization should create one roster per team');
assert.equal(normalized.allRosters[0][0].name, 'Michael Jordan', 'boot normalization should map controlled-team rosters into allRosters');
assert.equal(normalized.allRosters[1][0].name, 'Stephen Curry', 'boot normalization should map opponent rosters into allRosters');
assert.ok(Array.isArray(normalized.freeAgents), 'boot normalization should expose the simulation free agents');
assert.equal(normalized.freeAgents[0].name, 'Hakeem Olajuwon', 'boot normalization should preserve the waiver pool');
assert.ok(Array.isArray(normalized.waiver), 'boot normalization should provide a legacy-safe waiver array');
assert.ok(Array.isArray(normalized.standings), 'boot normalization should provide standings for initSeason');
assert.equal(normalized.standings[0].teamIdx, 0, 'boot normalization should align standings rows to legacy team indexes');

const progressedShell = {
  ...normalized,
  currentDay: 19,
  currentWeek: 3,
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 11, l: 4, pf: 1540, pa: 1412 },
    { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 7, pf: 1460, pa: 1494 }
  ],
  freeAgents: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }]
};

const progressedGame = {
  week: 3,
  day: 19,
  rosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }, { id: 33, name: 'Scottie Pippen', pos: 'SF' }],
    [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
  ],
  waiver: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }],
  standings: progressedShell.standings,
  starters: [
    [23, 33],
    [30]
  ]
};

const fallbackSimulationState = {
  simulationMode: fixture.simulationMode,
  historicalUniverseSlotId: 'sim-slot-1',
  leagueShell: fixture.leagueShell,
  draftState: {
    controlledTeamAbbr: 'LAL'
  },
  seasonState: {
    activityLog: [{ type: 'sim_day', summary: 'Fallback fixture log entry' }]
  }
};

const persistedSimulationState = toPlain(
  api.buildSharedSimulationPersistenceState(fallbackSimulationState, progressedShell, progressedGame)
);

assert.equal(
  persistedSimulationState.seasonState.currentDay,
  19,
  'simulation persistence should carry the updated current day into seasonState'
);
assert.equal(
  persistedSimulationState.seasonState.currentWeek,
  3,
  'simulation persistence should carry the updated current week into seasonState'
);
assert.equal(
  persistedSimulationState.seasonState.standings[0].w,
  11,
  'simulation persistence should carry updated standings into seasonState'
);
assert.equal(
  persistedSimulationState.draftState.rostersByTeam.LAL[1].name,
  'Scottie Pippen',
  'simulation persistence should map legacy rosters back into draftState.rostersByTeam'
);
assert.equal(
  persistedSimulationState.draftState.freeAgents[0].name,
  'Tim Duncan',
  'simulation persistence should map the current waiver pool back into draftState.freeAgents'
);
assert.deepEqual(
  persistedSimulationState.seasonState.lineupIdsByTeam,
  {
    LAL: [23, 33],
    BOS: [30]
  },
  'simulation persistence should align starter ids back into seasonState.lineupIdsByTeam by team abbr'
);

const updatedAdapterState = {
  ...fixture,
  draftState: {
    ...fixture.draftState,
    rostersByTeam: {
      LAL: [
        { id: 33, name: 'Scottie Pippen', pos: 'SF' },
        { id: 34, name: 'Hakeem Olajuwon', pos: 'C' }
      ],
      BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    },
    freeAgents: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }]
  },
  seasonState: {
    ...fixture.seasonState,
    currentDay: 21,
    currentWeek: 4,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 12, l: 4, pf: 1601, pa: 1450 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 8, pf: 1492, pa: 1510 }
    ],
    lineupIdsByTeam: {
      LAL: [33, 34],
      BOS: [30]
    }
  },
  processed: ['legacy-processed-flag'],
  dayResults: { 21: { stale: true } },
  revealedDays: { 21: true },
  settledWeeks: { 4: true },
  dailyRevealReports: { 21: { headline: 'Stale reveal report' } },
  simulationLogsByDay: { 21: { engineVersion: 'legacy-shell' } },
  lastRevealedDay: 21
};

const staleLegacyShell = {
  ...progressedShell,
  currentDay: 18,
  currentWeek: 3,
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 10, l: 4, pf: 1500, pa: 1410 },
    { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 6, pf: 1450, pa: 1480 }
  ],
  freeAgents: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }]
};

const staleLegacyGame = {
  week: 3,
  day: 18,
  rosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
  ],
  waiver: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }],
  standings: staleLegacyShell.standings,
  starters: [
    [23],
    [30]
  ],
  processed: ['legacy-processed-flag'],
  dayResults: { 18: { stale: true } },
  revealedDays: { 18: true },
  settledWeeks: { 3: true },
  dailyRevealReports: { 18: { headline: 'Stale reveal report' } }
};

const rawPreferredPersistenceState = toPlain(
  api.buildSharedSimulationPersistenceState(updatedAdapterState, staleLegacyShell, staleLegacyGame)
);

assert.equal(
  rawPreferredPersistenceState.seasonState.currentDay,
  21,
  'simulation persistence should prefer adapter current day over stale legacy game state'
);
assert.equal(
  rawPreferredPersistenceState.seasonState.currentWeek,
  4,
  'simulation persistence should prefer adapter current week over stale legacy game state'
);
assert.equal(
  rawPreferredPersistenceState.seasonState.standings[0].w,
  12,
  'simulation persistence should prefer adapter standings over stale legacy standings'
);
assert.equal(
  rawPreferredPersistenceState.draftState.rostersByTeam.LAL[0].name,
  'Scottie Pippen',
  'simulation persistence should prefer adapter rosters over stale legacy rosters'
);
assert.equal(
  rawPreferredPersistenceState.draftState.freeAgents[0].name,
  'Michael Jordan',
  'simulation persistence should prefer adapter free agents over stale legacy waiver state'
);
assert.deepEqual(
  rawPreferredPersistenceState.seasonState.lineupIdsByTeam,
  {
    LAL: [33, 34],
    BOS: [30]
  },
  'simulation persistence should prefer adapter lineup ids over stale legacy starters'
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rawPreferredPersistenceState, 'processed'),
  false,
  'simulation persistence should drop stale processed markers from the raw persistence state'
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rawPreferredPersistenceState, 'dayResults'),
  false,
  'simulation persistence should drop stale reveal-day caches from the raw persistence state'
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rawPreferredPersistenceState, 'revealedDays'),
  false,
  'simulation persistence should drop stale revealed-day markers from the raw persistence state'
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rawPreferredPersistenceState, 'settledWeeks'),
  false,
  'simulation persistence should drop stale settled-week caches from the raw persistence state'
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rawPreferredPersistenceState, 'dailyRevealReports'),
  false,
  'simulation persistence should drop stale reveal reports from the raw persistence state'
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rawPreferredPersistenceState, 'simulationLogsByDay'),
  false,
  'simulation persistence should drop stale simulation day logs from the raw persistence state'
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rawPreferredPersistenceState, 'lastRevealedDay'),
  false,
  'simulation persistence should drop stale last-revealed markers from the raw persistence state'
);
assert.equal(
  rawPreferredPersistenceState.activeSeasonBackend,
  'simulation',
  'simulation persistence should stamp an explicit simulation backend onto the raw persistence state'
);
assert.equal(
  rawPreferredPersistenceState.legacyHistoricalStatMode,
  false,
  'simulation persistence should explicitly clear any stale legacy stat-replay flag from the raw persistence state'
);

const normalizedStreakFixture = toPlain({
  ...fixture,
  seasonState: {
    ...fixture.seasonState,
    standings: [
      { ...fixture.seasonState.standings[0], streak: 'W3' },
      { ...fixture.seasonState.standings[1], streak: 'L1' }
    ]
  }
});
const normalizedStreakState = toPlain(api.normalizeSharedSimulationSeasonBootState(normalizedStreakFixture, null));
assert.equal(
  normalizedStreakState.standings[0].streak,
  'W3',
  'shared simulation boot should preserve string streak labels instead of coercing them away'
);
assert.equal(
  normalizedStreakState.standings[0].streakW,
  true,
  'shared simulation boot should infer a win-direction flag from preserved W-prefixed streak labels when streakW is omitted'
);
assert.equal(
  normalizedStreakState.standings[1].streakW,
  false,
  'shared simulation boot should infer a loss-direction flag from preserved L-prefixed streak labels when streakW is omitted'
);
const normalizedLegacyReplayFlagState = toPlain(api.normalizeSharedSimulationSeasonBootState({
  ...fixture,
  legacyHistoricalStatMode: true
}, null));
assert.equal(
  normalizedLegacyReplayFlagState.legacyHistoricalStatMode,
  false,
  'shared simulation boot should explicitly clear any stale legacy stat-replay flag carried by older saves'
);

const postseasonPersistenceState = toPlain(
  api.buildSharedSimulationPersistenceState(
    {
      ...updatedAdapterState,
      postseasonState: {
        phase: 'completed',
        seriesById: {
          finals: {
            id: 'finals',
            higherSeedWins: 4,
            lowerSeedWins: 2
          }
        }
      }
    },
    staleLegacyShell,
    staleLegacyGame
  )
);

assert.equal(
  postseasonPersistenceState.postseasonState.phase,
  'completed',
  'simulation persistence should preserve postseason phase'
);
assert.equal(
  postseasonPersistenceState.postseasonState.seriesById.finals.higherSeedWins,
  4,
  'simulation persistence should preserve postseason series state'
);

const legacyHistoricalSimulation = {
  historicalEntryMode: 'simulation_season',
  simulationMode: 'historical_box_score',
  historicalPackId: 'nba_1996_full_season_v1',
  teams: ['Chicago Bulls', 'Seattle SuperSonics'],
  allRosters: [
    [{ id: 23, name: 'Michael Jordan' }],
    [{ id: 20, name: 'Gary Payton' }]
  ],
  standings: [
    { teamIdx: 0, teamAbbr: 'CHI', w: 10, l: 2, pf: 1300, pa: 1180 },
    { teamIdx: 1, teamAbbr: 'SEA', w: 8, l: 4, pf: 1210, pa: 1198 }
  ]
};

assert.equal(
  api.shouldPersistSharedSimulationState(fixture),
  true,
  'shared-shell mixed-era simulation should opt into the shared simulation persistence serializer'
);
assert.equal(
  api.shouldPersistSharedSimulationState(legacyHistoricalSimulation),
  false,
  'legacy historical simulations should not be claimed by the shared simulation persistence serializer'
);
api.setSeasonModeAdapter(null);
api.setActiveSeasonMode('fantasy');
api.setData(toPlain(legacyHistoricalSimulation));
assert.equal(
  api.getActiveSeasonBackend(),
  'simulation',
  'legacy simulation-season saves should still resolve the active backend to simulation even without an explicit backend flag'
);

createdSimulationAdapters = [];
const localResume = toPlain(api.resolveLocalSavedSeasonAutoLoad({
  ...fixture,
  historicalUniverseSlotId: 'sim-slot-local'
}, 'nba'));

assert.equal(localResume.activeSeasonMode, 'simulation', 'local auto-load should detect shared simulation seasons from raw persisted state');
assert.equal(localResume.sport, 'nba', 'local auto-load should derive sport from the raw simulation state');
assert.equal(localResume.state.historicalUniverseSlotId, 'sim-slot-local', 'local auto-load should preserve the raw simulation slot id');
assert.equal(localResume.state.seasonId, 'simulation:sim-slot-local', 'local auto-load should normalize raw simulation state before boot');
assert.equal(createdSimulationAdapters.length, 1, 'local auto-load should rebuild the shared simulation adapter from raw state');
assert.equal(createdSimulationAdapters[0].slotId, 'sim-slot-local', 'local auto-load should seed the adapter with the persisted slot id');
assert.equal(
  createdSimulationAdapters[0].state.draftState.controlledTeamAbbr,
  'LAL',
  'local auto-load should rebuild the adapter from the raw simulation payload'
);

createdSimulationAdapters = [];
const compactLocalDraftResume = toPlain(api.resolveSeasonManagerLeagueDataLoad({
  sport: 'nba',
  seasonId: 'local_draft_reload',
  leagueName: 'Compact Reload League',
  activeSeasonBackend: 'simulation',
  historicalEntryMode: 'simulation_season',
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    sport: 'nba',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers' },
      { abbr: 'BOS', name: 'Boston Celtics' }
    ]
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [{ id: 23, name: 'Michael Jordan', pos: 'SG', team: 'CHI', fp: 54 }],
      BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG', team: 'GSW', fp: 48 }]
    },
    freeAgents: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', fp: 47 }]
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    standings: [
      { teamAbbr: 'LAL', teamName: 'Los Angeles Lakers', wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 },
      { teamAbbr: 'BOS', teamName: 'Boston Celtics', wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }
    ]
  }
}, 'nba'));

assert.equal(compactLocalDraftResume.activeSeasonMode, 'simulation', 'league URL reloads should resolve compact simulation draft saves into simulation mode');
assert.equal(compactLocalDraftResume.backend, 'simulation', 'league URL reloads should keep compact simulation drafts on the simulation backend');
assert.equal(compactLocalDraftResume.state.allRosters.length, 2, 'league URL reloads should hydrate top-level rosters from compact draftState rosters');
assert.equal(compactLocalDraftResume.state.allRosters[0][0].name, 'Michael Jordan', 'league URL reloads should keep roster players during hydration');
assert.equal(compactLocalDraftResume.state.localLeagueId, 'local_draft_reload', 'league URL reloads should preserve the original local draft league id as a resume alias');
assert.equal(createdSimulationAdapters.length, 1, 'league URL reloads should rebuild a simulation adapter for compact draft saves');

const compactCompleteLocalLeague = {
  seasonId: 'local_draft_reload',
  leagueSize: 10,
  draftState: {
    rostersByTeam: {
      ATL: [{ id: 1 }],
      BOS: [{ id: 2 }],
      CHI: [{ id: 3 }]
    }
  },
  updatedAt: 1000
};
const staleCloudLeague = {
  seasonId: 'local_draft_reload',
  leagueSize: 10,
  teams: Array.from({ length: 10 }, (_, idx) => `Team ${idx + 1}`),
  allRosters: Array.from({ length: 10 }, () => []),
  updatedAt: 5000
};
assert.equal(api.getLeagueTeamCount(compactCompleteLocalLeague), 10, 'league team count should include compact local league size');
assert.equal(api.getLeagueRosteredPlayerCount(compactCompleteLocalLeague), 3, 'league roster count should include compact draftState rosters');
assert.equal(
  api.doesSavedSeasonMatchRequestedLeague({ seasonId: 'season_53' }, 'local_draft_reload'),
  false,
  'league URL fallback should not auto-load a different saved league id'
);
assert.equal(
  api.doesSavedSeasonMatchRequestedLeague({ leagueId: 'local_draft_reload' }, 'local_draft_reload'),
  true,
  'league URL fallback should auto-load matching local league ids'
);
assert.equal(
  api.doesSavedSeasonMatchRequestedLeague({ seasonId: 'simulation:shared-season', localLeagueId: 'local_draft_reload' }, 'local_draft_reload'),
  true,
  'league URL fallback should accept simulation-normalized states that preserve the original local draft id'
);
assert.equal(
  api.shouldPreferLocalLeagueData(compactCompleteLocalLeague, staleCloudLeague, 'local_draft_reload'),
  true,
  'reload should prefer complete local draft rosters over a newer but empty cloud snapshot'
);

createdSimulationAdapters = [];
const legacySinglePlayerResume = toPlain(api.resolveLocalSavedSeasonAutoLoad({
  sport: 'nba',
  leagueName: 'Legacy Single Player League',
  teams: ['Los Angeles Lakers', 'Boston Celtics'],
  allRosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
  ],
  waiver: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }],
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
    { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
  ],
  currentDay: 12,
  currentWeek: 2
}, 'nba'));

assert.equal(legacySinglePlayerResume.activeSeasonMode, 'fantasy', 'legacy single-player saves should keep fantasy presentation mode for now');
assert.equal(legacySinglePlayerResume.backend, 'simulation', 'legacy single-player saves should resolve onto the unified simulation backend');
assert.ok(legacySinglePlayerResume.state.seasonState, 'legacy single-player local auto-load should land in unified simulation-native state');
assert.equal(legacySinglePlayerResume.state.simulationMode, 'nba_mixed_era_single_player_v1', 'legacy single-player local auto-load should normalize into a simulation-native mode id');
assert.equal(createdSimulationAdapters.length, 1, 'legacy single-player local auto-load should still build a simulation adapter');
assert.equal(api.getActiveSeasonBackend(), 'simulation', 'legacy single-player local auto-load should expose a simulation backend even while presentation stays fantasy');

createdSimulationAdapters = [];
const legacyHistoricalBoxScoreResume = toPlain(api.resolveLocalSavedSeasonAutoLoad({
  sport: 'nba',
  leagueName: 'Legacy Historical Simulation',
  historicalEntryMode: 'simulation_season',
  simulationMode: 'historical_box_score',
  teams: ['Chicago Bulls', 'Seattle SuperSonics'],
  allRosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
    [{ id: 20, name: 'Gary Payton', pos: 'PG' }]
  ],
  standings: [
    { teamIdx: 0, teamAbbr: 'CHI', conference: 'East', division: 'Central', w: 8, l: 4, pf: 1210, pa: 1188 },
    { teamIdx: 1, teamAbbr: 'SEA', conference: 'West', division: 'Pacific', w: 7, l: 5, pf: 1199, pa: 1174 }
  ],
  currentDay: 12,
  currentWeek: 2
}, 'nba'));

assert.equal(legacyHistoricalBoxScoreResume.backend, 'simulation', 'persisted historical_box_score saves should still resolve onto the simulation backend');
assert.equal(legacyHistoricalBoxScoreResume.activeSeasonMode, 'fantasy', 'persisted historical_box_score saves should keep fantasy presentation mode during the replacement transition');
assert.ok(legacyHistoricalBoxScoreResume.state.seasonState, 'persisted historical_box_score saves should still normalize into simulation-native state');
assert.equal(legacyHistoricalBoxScoreResume.state.simulationMode, 'nba_mixed_era_single_player_v1', 'persisted historical_box_score saves should normalize forward into the canonical simulation mode id');
assert.equal(createdSimulationAdapters.length, 1, 'persisted historical_box_score saves should still build a simulation adapter through the shell load path');

simulationAdapterStub.simulateNextDayCalls = 0;
historicalSlotUpsertCalls = [];
vm.runInContext('HISTORICAL_SLOT_QUOTA_BLOCKED = false;', sandbox);
api.setActiveSeasonMode('fantasy');
api.setSeasonModeAdapter(simulationAdapterStub);
api.setData({
  activeSeasonBackend: 'simulation',
  historicalUniverseSlotId: 'legacy-unified-slot',
  leagueShell: {
    sport: 'nba',
    teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }]
  },
  draftState: {
    controlledTeamAbbr: 'LAL'
  }
});
api.setGame({
  day: 12,
  week: 2,
  isSeasonComplete: false,
  rosters: [[], [], []],
  waiver: [],
  standings: [],
  processed: ['legacy-processed-flag'],
  dayResults: { 12: { stale: true } },
  settledWeeks: {},
  revealedDays: { 12: true },
  dailyRevealReports: { 12: { headline: 'Stale reveal report' } },
  simulationLogsByDay: { 12: { engineVersion: 'legacy-shell' } },
  recentDrops: [{ playerId: 999 }],
  moneyBallLocks: { 2: { PG: 23 } },
  cpuTradeMarketDaysProcessed: { 12: true }
});
const originalRevealDay = sandbox.revealDay;
const originalSetActiveSeasonScreen = sandbox.setActiveSeasonScreen;
const originalRebuildActiveSeasonNav = sandbox.rebuildActiveSeasonNav;
let adapterBackedRenderSnapshot = null;
const captureAdapterBackedRender = () => {
  adapterBackedRenderSnapshot = {
    gameDay: api.getGame().day,
    stateDay: api.getData().seasonState?.currentDay,
    rosterCount: Array.isArray(api.getGame().rosters) ? api.getGame().rosters.length : 0
  };
};
sandbox.revealDay = () => {
  throw new Error('legacy reveal path should not run for unified simulation backends');
};
sandbox.renderHub = captureAdapterBackedRender;
sandbox.renderRoster = captureAdapterBackedRender;
sandbox.renderMatchup = captureAdapterBackedRender;
sandbox.renderWaiver = captureAdapterBackedRender;
sandbox.renderTrades = captureAdapterBackedRender;
sandbox.renderStandings = captureAdapterBackedRender;
sandbox.renderCommissioner = captureAdapterBackedRender;
sandbox.setActiveSeasonScreen = () => {};
sandbox.rebuildActiveSeasonNav = () => {};
api.advanceWeek();
sandbox.revealDay = originalRevealDay;
sandbox.setActiveSeasonScreen = originalSetActiveSeasonScreen;
sandbox.rebuildActiveSeasonNav = originalRebuildActiveSeasonNav;
assert.equal(simulationAdapterStub.simulateNextDayCalls, 1, 'fantasy-presented unified single-player seasons should advance through the simulation adapter');
assert.equal(api.getGame().day, 13, 'adapter-backed unified progression should rehydrate the fantasy shell from the advanced simulation state');
assert.equal(api.getData().seasonState?.currentDay, 13, 'adapter-backed unified progression should keep D synchronized with the advanced simulation state');
assert.equal(api.getData().activeSeasonBackend, 'simulation', 'adapter-backed unified progression should keep D explicitly marked as simulation-backed');
assert.equal(api.getData().legacyHistoricalStatMode, false, 'adapter-backed unified progression should keep replay-era legacy flags cleared on persisted simulation state');
assert.equal(Object.prototype.toString.call(api.getGame().processed), '[object Set]', 'adapter-backed unified progression should preserve the legacy processed tracker as a Set');
assert.deepStrictEqual(Array.from(api.getGame().processed), [], 'adapter-backed unified progression should clear stale legacy processed markers when the adapter state does not carry them forward');
assert.deepStrictEqual(toPlain(api.getGame().dayResults), {}, 'adapter-backed unified progression should clear stale legacy reveal-day caches');
assert.deepStrictEqual(toPlain(api.getGame().revealedDays), {}, 'adapter-backed unified progression should clear stale revealed-day state after adapter rehydration');
assert.deepStrictEqual(toPlain(api.getGame().dailyRevealReports), {}, 'adapter-backed unified progression should clear stale reveal reports after adapter rehydration');
assert.deepStrictEqual(toPlain(api.getGame().simulationLogsByDay), {}, 'adapter-backed unified progression should clear stale legacy simulation log caches after adapter rehydration');
assert.deepStrictEqual(toPlain(api.getGame().recentDrops), [], 'adapter-backed unified progression should clear stale drop history when the adapter state does not carry it forward');
assert.deepStrictEqual(toPlain(api.getGame().moneyBallLocks), {}, 'adapter-backed unified progression should clear stale money-ball lock state when the adapter state does not carry it forward');
assert.deepStrictEqual(toPlain(api.getGame().cpuTradeMarketDaysProcessed), {}, 'adapter-backed unified progression should clear stale CPU trade market progress when the adapter state does not carry it forward');
adapterBackedRenderSnapshot = null;
sandbox.renderActiveSeasonScreen('hub');
assert.deepStrictEqual(adapterBackedRenderSnapshot, { gameDay: 13, stateDay: 13, rosterCount: 3 }, 'adapter-backed unified progression should still reach the fantasy render dispatch with rehydrated shell state');
assert.equal(historicalSlotUpsertCalls.length, 1, 'adapter-backed unified progression should still persist the updated simulation state');

api.setActiveSeasonMode('fantasy');
api.setSeasonModeAdapter(simulationAdapterStub);
api.setData({
  activeSeasonBackend: 'simulation',
  sport: 'nba',
  leagueName: 'Init Resume League',
  teams: ['Los Angeles Lakers', 'Boston Celtics', 'Chicago Bulls'],
  myPos: 0,
  currentWeek: 2,
  currentDay: 12,
  isSeasonComplete: false,
  allRosters: [
    [{ id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' }],
    [{ id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' }]
  ],
  ilRosters: [[], [], []],
  starters: [[23], [30], [34]],
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', w: 9, l: 3, pf: 1360, pa: 1288 },
    { teamIdx: 1, teamAbbr: 'BOS', w: 7, l: 5, pf: 1299, pa: 1274 },
    { teamIdx: 2, teamAbbr: 'CHI', w: 5, l: 7, pf: 1180, pa: 1210 }
  ],
  processed: ['legacy-processed-flag'],
  dayResults: { 12: { stale: true } },
  revealedDays: { 12: true },
  settledWeeks: { 1: true },
  dailyRevealReports: { 12: { headline: 'Stale reveal report' } },
  simulationLogsByDay: { 12: { engineVersion: 'legacy-shell' } },
  recentDrops: [{ playerId: 999 }],
  moneyBallLocks: { 2: { PG: 23 } },
  lastRevealedDay: 18,
  activityLog: [{ id: 'waiver-1', type: 'waiver', title: 'Added depth', text: 'Synthetic resume activity', ts: 250 }],
  dailyLineups: {},
  dailyLineupsByTeam: {},
  tradeOffers: [],
  waiver: [],
  freeAgents: [],
  cpuTradeMarketDaysProcessed: { 12: true }
});
api.setGame({
  week: 99,
  day: 99,
  totalWeeks: 17,
  rosters: [],
  ilByTeam: [],
  starters: [],
  dailyLineups: {},
  waiver: [],
  schedule: [],
  standings: [],
  tradeOffers: [],
  processed: new Set(['bad-cache']),
  powerupsByWeek: {},
  dayResults: { 99: { stale: true } },
  revealedDays: { 99: true },
  settledWeeks: { 99: true },
  isSeasonComplete: false,
  activityLog: [],
  recentDrops: [],
  moneyBallLocks: {},
  dailyRevealReports: { 99: { headline: 'bad-cache' } },
  simulationLogsByDay: { 99: { engineVersion: 'bad-cache' } },
  cpuTradeMarketDaysProcessed: {}
});
api.initSeason();
assert.equal(api.getGame().week, 2, 'initSeason should restore simulation-backed resume week from canonical state');
assert.equal(api.getGame().day, 12, 'initSeason should restore simulation-backed resume day from canonical state');
assert.equal(Object.prototype.toString.call(api.getGame().processed), '[object Set]', 'initSeason should normalize processed markers into a Set');
assert.deepStrictEqual(Array.from(api.getGame().processed), [], 'initSeason should clear stale processed markers for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getGame().dayResults), {}, 'initSeason should not revive stale reveal-day caches for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getGame().revealedDays), {}, 'initSeason should not revive stale revealed-day markers for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getGame().settledWeeks), {}, 'initSeason should not revive stale settled-week caches for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getGame().dailyRevealReports), {}, 'initSeason should not revive stale reveal reports for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getGame().simulationLogsByDay), {}, 'initSeason should not revive stale simulation log caches for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getData().dayResults), {}, 'initSeason should clear stale persisted reveal-day caches for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getData().revealedDays), {}, 'initSeason should clear stale persisted revealed-day markers for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getData().settledWeeks), {}, 'initSeason should clear stale persisted settled-week caches for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getData().dailyRevealReports), {}, 'initSeason should clear stale persisted reveal reports for unified simulation resumes');
assert.deepStrictEqual(toPlain(api.getData().simulationLogsByDay), {}, 'initSeason should clear stale persisted simulation log caches for unified simulation resumes');
assert.equal(api.getData().lastRevealedDay, 0, 'initSeason should reset stale last-revealed bookkeeping for unified simulation resumes');

api.setData({
  activeSeasonBackend: 'simulation',
  currentWeek: 4,
  currentDay: 21,
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', w: 12, l: 4, pf: 1601, pa: 1450 },
    { teamIdx: 1, teamAbbr: 'BOS', w: 8, l: 8, pf: 1492, pa: 1510 }
  ],
  dayResults: { 20: { stale: true } },
  revealedDays: { 20: true },
  settledWeeks: { 3: true },
  processed: ['legacy-processed-flag'],
  dailyRevealReports: { 20: { headline: 'stale report' } },
  simulationLogsByDay: { 20: { engineVersion: 'legacy-shell' } },
  allRosters: [
    [{ id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' }]
  ]
});
api.setGame({
  week: 4,
  day: 21,
  rosters: [
    [{ id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' }]
  ],
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', w: 12, l: 4, pf: 1601, pa: 1450 },
    { teamIdx: 1, teamAbbr: 'BOS', w: 8, l: 8, pf: 1492, pa: 1510 }
  ],
  dayResults: { 21: { stale: true } },
  revealedDays: { 21: true },
  settledWeeks: { 4: true },
  processed: new Set(['legacy-processed-flag']),
  dailyRevealReports: { 21: { headline: 'stale report' } },
  simulationLogsByDay: { 21: { engineVersion: 'legacy-shell' } },
  activityLog: [],
  tradeOffers: [],
  waiver: []
});
api.syncGameStateToD();
assert.deepStrictEqual(toPlain(api.getData().dayResults), {}, 'syncGameStateToD should not persist reveal-day caches for unified simulation seasons');
assert.deepStrictEqual(toPlain(api.getData().revealedDays), {}, 'syncGameStateToD should not persist revealed-day markers for unified simulation seasons');
assert.deepStrictEqual(toPlain(api.getData().settledWeeks), {}, 'syncGameStateToD should not persist settled-week caches for unified simulation seasons');
assert.deepStrictEqual(toPlain(api.getData().processed), [], 'syncGameStateToD should not persist processed markers for unified simulation seasons');
assert.deepStrictEqual(toPlain(api.getData().dailyRevealReports), {}, 'syncGameStateToD should not persist reveal reports for unified simulation seasons');
assert.deepStrictEqual(toPlain(api.getData().simulationLogsByDay), {}, 'syncGameStateToD should not persist simulation day logs for unified simulation seasons');
assert.equal(api.getData().lastRevealedDay, 0, 'syncGameStateToD should zero last-revealed bookkeeping for unified simulation seasons');

api.setActiveSeasonMode('fantasy');
api.setData({
  activeSeasonBackend: 'simulation',
  leagueShell: {
    sport: 'nba',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers' },
      { abbr: 'BOS', name: 'Boston Celtics' }
    ]
  },
  seasonState: {
    currentDay: 13,
    currentWeek: 2,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', w: 10, l: 3, pf: 1402.4, pa: 1290.1 },
      { teamIdx: 1, teamAbbr: 'BOS', w: 7, l: 6, pf: 1328.1, pa: 1333.4 }
    ],
    completedGameLogs: [
      {
        day: 11,
        week: 2,
        home: 1,
        away: 0,
        homeScore: 94.2,
        awayScore: 90.5,
        outcomeSource: 'simulation_engine'
      },
      {
        day: 12,
        week: 2,
        home: 0,
        away: 1,
        homeScore: 102.4,
        awayScore: 98.1,
        outcomeSource: 'simulation_engine'
      }
    ]
  }
});
api.setGame({
  day: 13,
  week: 2,
  totalWeeks: 17,
  schedule: [{ week: 2, home: 0, away: 1 }],
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', w: 0, l: 0, pf: 0, pa: 0 },
    { teamIdx: 1, teamAbbr: 'BOS', w: 0, l: 0, pf: 0, pa: 0 }
  ],
  activityLog: [
    { id: 'waiver-1', type: 'waiver', title: 'Added depth', text: 'Synthetic resume activity', ts: 250 }
  ],
  dayResults: {},
  revealedDays: {},
  settledWeeks: {}
});
sandbox.DAYS_PER_WEEK = 7;
sandbox.TOTAL_DAYS = () => 17;
sandbox.weekGames = (week) => (api.getGame().schedule || []).filter((game) => Number(game?.week || 0) === Number(week || 0));

assert.equal(api.isDayRevealed(12), true, 'unified simulation backends should treat completed engine logs as revealed days for the fantasy shell');
assert.deepStrictEqual(
  toPlain(api.getDayResult(0, 12)),
  {
    total: 102.4,
    entries: [],
    statSource: 'simulation_engine_generated',
    outcomeSource: 'simulation_engine'
  },
  'unified simulation backends should synthesize revealed day totals from completed engine logs'
);
assert.equal(api.getTeamWeekRevealedScore(0, 2), 192.9, 'unified simulation backends should aggregate week totals from completed engine logs');
assert.deepStrictEqual(
  toPlain(api.getLiveStandingsSnapshot()),
  toPlain(api.getData().seasonState.standings),
  'unified simulation backends should use canonical simulation standings instead of replay-era derived standings'
);
assert.equal(api.getLatestRevealReportDay(), 12, 'unified simulation backends should treat completed engine logs as the latest reveal window when no legacy report cache exists');
assert.equal(
  toPlain(api.getSimulationDayLog(12))?.gameLogs?.length,
  1,
  'unified simulation backends should synthesize simulation day logs from authoritative completed engine logs'
);
const synthesizedRevealReport = toPlain(api.getDailyRevealReport(12));
assert.equal(
  synthesizedRevealReport?.simulationMeta?.gameCount,
  1,
  'unified simulation backends should synthesize reveal reports from completed engine logs when legacy report caches are empty'
);
assert.equal(
  synthesizedRevealReport?.totalTransactions,
  0,
  'synthesized reveal reports should avoid inventing multi-day transaction windows when no cached legacy report boundary exists'
);
assert.match(
  [
    synthesizedRevealReport?.story?.headline,
    synthesizedRevealReport?.story?.subheadline,
    synthesizedRevealReport?.matchups?.[0]?.homeName,
    synthesizedRevealReport?.matchups?.[0]?.awayName
  ].join(' '),
  /Los Angeles Lakers|Boston Celtics/,
  'synthesized reveal reports should use simulation franchise names instead of generic Team labels'
);
assert.doesNotMatch(
  [
    synthesizedRevealReport?.story?.headline,
    synthesizedRevealReport?.story?.subheadline,
    synthesizedRevealReport?.matchups?.[0]?.homeName,
    synthesizedRevealReport?.matchups?.[0]?.awayName
  ].join(' '),
  /\bTeam \d+\b/,
  'synthesized reveal reports should not expose generic Team labels for simulation-backed leagues'
);
const originalRunHistoricalSimulationDay = sandbox.runHistoricalSimulationDay;
let revealFallbackCalled = false;
sandbox.runHistoricalSimulationDay = () => {
  revealFallbackCalled = true;
  throw new Error('legacy historical simulation day path should not run for unified simulation backends');
};
api.setData({
  ...api.getData(),
  activeSeasonBackend: 'simulation',
  historicalEntryMode: 'simulation_season'
});
api.setGame({
  ...api.getGame(),
  day: 13,
  dayResults: {},
  revealedDays: {},
  dailyRevealReports: {},
  simulationLogsByDay: {}
});
api.revealDay(13);
sandbox.runHistoricalSimulationDay = originalRunHistoricalSimulationDay;
assert.equal(revealFallbackCalled, false, 'revealDay should not fall back to the legacy historical simulation path for unified simulation backends');
assert.deepStrictEqual(toPlain(api.getGame().dayResults), {}, 'simulation-backed revealDay compatibility shims should not repopulate legacy day result caches');
assert.equal(api.settleWeek(2), true, 'settleWeek should recognize completed simulation weeks without replay-era mutation');
assert.deepStrictEqual(
  toPlain(api.getGame().standings),
  [
    { teamIdx: 0, teamAbbr: 'LAL', w: 0, l: 0, pf: 0, pa: 0 },
    { teamIdx: 1, teamAbbr: 'BOS', w: 0, l: 0, pf: 0, pa: 0 }
  ],
  'settleWeek should not mutate stale fantasy-shell standings when the simulation backend is already authoritative'
);

const originalUnifiedBuilder = sandbox.window.RosterBateSimulationModeRuntime.buildUnifiedSimulationSeasonState;
delete sandbox.window.RosterBateSimulationModeRuntime.buildUnifiedSimulationSeasonState;
createdSimulationAdapters = [];
const legacySinglePlayerResumeWithoutRuntimeBuilder = toPlain(api.resolveLocalSavedSeasonAutoLoad({
  sport: 'nba',
  leagueName: 'Legacy Single Player League',
  teams: ['Los Angeles Lakers', 'Boston Celtics'],
  allRosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
  ],
  waiver: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }],
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
    { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
  ],
  currentDay: 12,
  currentWeek: 2
}, 'nba'));
sandbox.window.RosterBateSimulationModeRuntime.buildUnifiedSimulationSeasonState = originalUnifiedBuilder;

assert.equal(legacySinglePlayerResumeWithoutRuntimeBuilder.backend, 'simulation', 'legacy single-player saves should still resolve to the simulation backend when the runtime builder is unavailable');
assert.ok(legacySinglePlayerResumeWithoutRuntimeBuilder.state.seasonState, 'legacy single-player saves should still synthesize simulation-native seasonState when the runtime builder is unavailable');
assert.equal(legacySinglePlayerResumeWithoutRuntimeBuilder.state.leagueShell?.teams?.[0]?.abbr, 'LAL', 'legacy single-player fallback synthesis should preserve team identity for the adapter boot path');
assert.equal(legacySinglePlayerResumeWithoutRuntimeBuilder.state.draftState?.rostersByTeam?.LAL?.[0]?.name, 'Michael Jordan', 'legacy single-player fallback synthesis should preserve roster assignments for the adapter boot path');
assert.equal(createdSimulationAdapters.length, 1, 'legacy single-player fallback synthesis should still build a simulation adapter');

createdSimulationAdapters = [];
delete sandbox.window.RosterBateSimulationModeRuntime.buildUnifiedSimulationSeasonState;
const legacySinglePlayerResumeWithReorderedStandings = toPlain(api.resolveLocalSavedSeasonAutoLoad({
  sport: 'nba',
  leagueName: 'Legacy Single Player League',
  teams: ['Los Angeles Lakers', 'Boston Celtics'],
  allRosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
  ],
  standings: [
    { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 },
    { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 }
  ],
  currentDay: 12,
  currentWeek: 2
}, 'nba'));
sandbox.window.RosterBateSimulationModeRuntime.buildUnifiedSimulationSeasonState = originalUnifiedBuilder;

assert.equal(legacySinglePlayerResumeWithReorderedStandings.state.leagueShell?.teams?.[0]?.abbr, 'LAL', 'legacy single-player fallback synthesis should respect stable teamIdx values instead of standings array order');
assert.equal(legacySinglePlayerResumeWithReorderedStandings.state.leagueShell?.teams?.[1]?.abbr, 'BOS', 'legacy single-player fallback synthesis should keep the reordered standings rows attached to the correct teams');
assert.equal(legacySinglePlayerResumeWithReorderedStandings.state.draftState?.rostersByTeam?.LAL?.[0]?.name, 'Michael Jordan', 'legacy single-player fallback synthesis should keep the LAL roster keyed to LAL after standings reorder');
assert.equal(legacySinglePlayerResumeWithReorderedStandings.state.draftState?.rostersByTeam?.BOS?.[0]?.name, 'Stephen Curry', 'legacy single-player fallback synthesis should keep the BOS roster keyed to BOS after standings reorder');
assert.equal(createdSimulationAdapters.length, 1, 'legacy single-player fallback synthesis should still build an adapter when standings are reordered');

historicalSlotUpsertCalls = [];
completedDraftUpsertError = null;
const fallbackBootState = toPlain(api.normalizeSharedSimulationSeasonBootState(fixture, null));
const fallbackBootAdapter = {
  currentState: toPlain(fixture),
  getState() {
    return toPlain(this.currentState);
  },
  replaceState(nextState) {
    this.currentState = toPlain(nextState);
    return this.getState();
  }
};
api.setSeasonModeAdapter(fallbackBootAdapter);
api.setData(fallbackBootState);
api.setGame({
  week: fallbackBootState.currentWeek,
  day: fallbackBootState.currentDay,
  rosters: toPlain(fallbackBootState.allRosters),
  waiver: toPlain(fallbackBootState.waiver),
  standings: toPlain(fallbackBootState.standings),
  starters: [
    [23],
    [30]
  ]
});
api.persistHistoricalUniverseSlotSnapshot('simulation_claim');
api.persistSimulationSeasonState('simulation_lineup');
assert.equal(
  historicalSlotUpsertCalls.length,
  0,
  'fallback shared-shell saves should stay paused for the rest of the page session after a quota-blocked fallback path'
);
assert.equal(
  fallbackBootAdapter.getState().historicalUniverseSlotId ?? null,
  null,
  'fallback shared-shell adapters should not gain a slot id while session-level slot saves remain paused'
);

assert.match(
  adapterSource,
  /nfl_mixed_era_single_player_v1/,
  'shared shell adapter should support nfl simulation mode'
);

api.setSeasonModeAdapter({
  getHubViewModel() {
    return {
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      controlledTeam: { abbr: 'DAL', name: 'Dallas Cowboys' },
      userRow: { w: 0, l: 0, streak: 'EVEN' },
      recordLabel: '0-0',
        primaryAction: { id: 'sim-day', label: 'Sim Week 1', shortLabel: 'Sim Week', cadenceLabel: 'Week 1', shellTone: 'sim-week' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Week 1',
      recentResults: [{ awayAbbr: 'GB', awayScore: 24, homeAbbr: 'SEA', homeScore: 27 }],
      nextGame: { day: 1, opponentAbbr: 'SF', opponentName: 'San Francisco 49ers' }
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
      starterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'],
      roster: [
        { id: 9, name: 'Tony Romo', team: 'DAL', pos: 'QB' },
        { id: 29, name: 'DeMarco Murray', team: 'DAL', pos: 'RB' },
        { id: 9001, name: 'Dallas DST', team: 'DAL', pos: 'DST' }
      ],
      lineup: [
        { id: 9, name: 'Tony Romo', team: 'DAL', pos: 'QB' },
        { id: 29, name: 'DeMarco Murray', team: 'DAL', pos: 'RB' }
      ],
      bench: [
        { id: 9001, name: 'Dallas DST', team: 'DAL', pos: 'DST' }
      ]
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0 },
        { teamAbbr: 'PHI', conference: 'NFC', division: 'East', w: 0, l: 0 }
      ],
      userRow: { teamAbbr: 'DAL', w: 0, l: 0 },
      postseasonPhase: 'regular_season',
      sections: [
        {
          title: 'NFC East',
          rows: [
            { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0 },
            { teamAbbr: 'PHI', conference: 'NFC', division: 'East', w: 0, l: 0 }
          ]
        }
      ]
    };
  },
  getPlayoffsViewModel() {
    return {
      sport: 'nfl',
      phase: 'postseason_ready',
      playoffPicture: {
        afc: [{ teamAbbr: 'NE', w: 12, l: 4 }],
        nfc: [{ teamAbbr: 'DAL', w: 12, l: 4 }]
      }
    };
  },
  setLineup() {
    return null;
  },
  claimFreeAgent() {
    return null;
  },
  applyTrade() {
    return null;
  }
});
api.setData({
  leagueShell: {
    sport: 'nfl',
    teams: new Array(32).fill(null).map((_, index) => ({ abbr: `T${index}`, name: `Team ${index}` }))
  },
  draftState: {
    controlledTeamAbbr: 'DAL'
  }
});

api.renderSimulationHubInSharedShell();
assert.match(elements.advBtn.innerHTML, /Sim Week 1/, 'nfl hub should expose a weekly simulation action');
assert.match(elements.advBtn.innerHTML, /Advance the week and publish results/, 'nfl hub CTA should carry the polished local-league subcopy');
assert.equal(elements.hubScoringType.textContent, 'Head to Head Points', 'nfl hub should keep the polished local-league fantasy scoring copy');
assert.equal(elements.advBtn.disabled, false, 'nfl hub sim CTA should remain enabled during regular season');
assert.match(elements.hubRevealReportCard.innerHTML, /Weekly reports will appear here/i, 'nfl hub should use cadence-aware weekly report framing in the reveal lane');
assert.doesNotMatch(elements.hubRevealReportCard.innerHTML, /Sim day reports/i, 'nfl hub should not fall back to day-based report copy');

simulationStubState.postseasonState = { phase: 'postseason_ready' };
api.setSeasonModeAdapter({
  getModeId() {
    return 'nfl_mixed_era_single_player_v1';
  },
  getNavItems() {
    return [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Matchup' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' },
      { id: 'playoffs', label: 'Playoffs' }
    ];
  },
  getState() {
    return {};
  },
  getHubViewModel() {
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      controlledTeam: { abbr: 'DAL', name: 'Dallas Cowboys' },
      userRow: { w: 12, l: 4, streak: 'W3' },
      recordLabel: '12-4',
      primaryAction: { id: 'review-playoffs', label: 'Review Playoffs' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Week 18',
      recentResults: [
        { awayAbbr: 'PHI', awayScore: 20, homeAbbr: 'DAL', homeScore: 27 }
      ],
      nextGame: null
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
      starterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'],
      roster: [],
      lineup: [],
      bench: []
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [],
      userRow: null,
      sections: []
    };
  },
  getPlayoffsViewModel() {
    return {
      sport: 'nfl',
      phase: 'postseason_ready',
      playoffPicture: {
        afc: [{ teamAbbr: 'NE', w: 12, l: 4 }],
        nfc: [{ teamAbbr: 'DAL', w: 12, l: 4 }]
      }
    };
  },
  setLineup() { return null; },
  claimFreeAgent() { return null; },
  applyTrade() { return null; }
});

api.renderSimulationHubInSharedShell();
assert.match(elements.advBtn.innerHTML, /Review Playoffs/, 'nfl hub should relabel the CTA once the playoff picture is ready');
assert.match(elements.advBtn.innerHTML, /Open the postseason picture/, 'review-playoffs CTA should explain the next action');
assert.equal(elements.advBtn.disabled, false, 'review-playoffs CTA should stay usable');
assert.equal(elements.advBtn.onclick, "goPage('playoffs')", 'review-playoffs CTA should navigate to the playoffs tab instead of calling advanceWeek');

api.renderSimulationPlayoffsInSharedShell();
assert.match(elements.playoffsContent.innerHTML, /Playoff Picture/i, 'nfl playoffs screen should frame postseason-ready state as a playoff picture review');
assert.doesNotMatch(elements.playoffsContent.innerHTML, /Play-In/i, 'nfl phase-1 playoffs screen should not imply active play-in simulation');

api.setSeasonModeAdapter({
  getModeId() {
    return 'nfl_mixed_era_single_player_v1';
  },
  getState() {
    return {
      leagueShell: {
        sport: 'nfl',
        anchorSeasonLabel: '2014 NFL'
      },
      postseasonState: {
        phase: 'regular_season'
      }
    };
  },
  getNavItems() {
    return [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Matchup' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' }
    ];
  },
  getHubViewModel() {
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      controlledTeam: { abbr: 'DAL', name: 'Dallas Cowboys' },
      userRow: { w: 0, l: 0, streak: 'EVEN' },
      recordLabel: '0-0',
      primaryAction: { id: 'fix-lineup', label: 'Fix Lineup' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Week 1',
      recentResults: [],
      nextGame: null
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
      starterSlots: ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
      roster: [],
      lineup: [],
      bench: []
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [],
      userRow: null,
      sections: []
    };
  },
  getPlayoffsViewModel() {
    return {
      sport: 'nfl',
      phase: 'regular_season',
      playoffPicture: null
    };
  },
  setLineup() { return null; },
  claimFreeAgent() { return null; },
  applyTrade() { return null; }
});

api.renderSimulationHubInSharedShell();
assert.match(elements.advBtn.innerHTML, /Fix Lineup/, 'nfl hub should surface the fix-lineup CTA when the weekly lineup is invalid');
assert.match(elements.advBtn.innerHTML, /Set a legal lineup before the next league window/, 'fix-lineup CTA should explain the blocking issue');
assert.equal(elements.advBtn.disabled, false, 'fix-lineup CTA should stay actionable from the hub');
assert.equal(elements.advBtn.onclick, "goPage('roster')", 'fix-lineup CTA should route the user straight to the roster tab');

api.setSeasonModeAdapter({
  getModeId() {
    return 'nfl_mixed_era_single_player_v1';
  },
  getState() {
    return {
      leagueShell: {
        sport: 'nfl',
        anchorSeasonLabel: '2014 NFL'
      },
      postseasonState: {
        phase: 'wild_card'
      }
    };
  },
  getNavItems() {
    return [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Matchup' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' },
      { id: 'playoffs', label: 'Playoffs' }
    ];
  },
  getHubViewModel() {
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      controlledTeam: { abbr: 'DAL', name: 'Dallas Cowboys' },
      userRow: { w: 12, l: 4, streak: 'W2' },
      recordLabel: '12-4',
        primaryAction: { id: 'sim-day', label: 'Sim Week 1', shortLabel: 'Sim Week', cadenceLabel: 'Week 1', shellTone: 'sim-week' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Wild Card Weekend',
      recentResults: [],
      nextGame: null
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
      starterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'],
      roster: [],
      lineup: [],
      bench: []
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [],
      userRow: null,
      sections: []
    };
  },
  getPlayoffsViewModel() {
    return {
      sport: 'nfl',
      phase: 'wild_card',
      currentRound: 'wild_card',
      shellLabel: '2014 NFL',
      playoffPicture: {
        afc: [
          { seed: 1, teamAbbr: 'NE', teamName: 'Patriots', w: 12, l: 4, berth: 'division_winner', bye: true },
          { seed: 2, teamAbbr: 'DEN', teamName: 'Broncos', w: 12, l: 4, berth: 'division_winner', bye: true },
          { seed: 3, teamAbbr: 'IND', teamName: 'Colts', w: 11, l: 5, berth: 'division_winner' },
          { seed: 4, teamAbbr: 'PIT', teamName: 'Steelers', w: 11, l: 5, berth: 'division_winner' },
          { seed: 5, teamAbbr: 'CIN', teamName: 'Bengals', w: 10, l: 5, berth: 'wild_card' },
          { seed: 6, teamAbbr: 'BAL', teamName: 'Ravens', w: 10, l: 6, berth: 'wild_card' }
        ],
        nfc: [
          { seed: 1, teamAbbr: 'SEA', teamName: 'Seahawks', w: 12, l: 4, berth: 'division_winner', bye: true },
          { seed: 2, teamAbbr: 'GB', teamName: 'Packers', w: 12, l: 4, berth: 'division_winner', bye: true },
          { seed: 3, teamAbbr: 'DAL', teamName: 'Cowboys', w: 12, l: 4, berth: 'division_winner' },
          { seed: 4, teamAbbr: 'CAR', teamName: 'Panthers', w: 7, l: 8, berth: 'division_winner' },
          { seed: 5, teamAbbr: 'ARI', teamName: 'Cardinals', w: 11, l: 5, berth: 'wild_card' },
          { seed: 6, teamAbbr: 'DET', teamName: 'Lions', w: 11, l: 5, berth: 'wild_card' }
        ]
      },
      currentWeekSchedule: [
        { awayAbbr: 'BAL', homeAbbr: 'IND' },
        { awayAbbr: 'CIN', homeAbbr: 'PIT' },
        { awayAbbr: 'DET', homeAbbr: 'DAL' },
        { awayAbbr: 'ARI', homeAbbr: 'CAR' }
      ]
    };
  },
  setLineup() { return null; },
  claimFreeAgent() { return null; },
  applyTrade() { return null; }
});

api.renderSimulationPlayoffsInSharedShell();
assert.match(elements.playoffsContent.innerHTML, /Wild Card/i, 'nfl playoffs screen should call out the current wild card round');
assert.match(elements.playoffsContent.innerHTML, /First-Round Bye/i, 'nfl playoffs screen should show bye language for the top two seeds');
assert.match(elements.playoffsContent.innerHTML, /Super Bowl XLIX/i, 'nfl playoffs screen should use the 2014 championship title');
assert.match(elements.playoffsContent.innerHTML, /BAL\s*@\s*IND/i, 'nfl playoffs screen should render afc matchup abbreviations');
assert.match(elements.playoffsContent.innerHTML, /DET\s*@\s*DAL/i, 'nfl playoffs screen should render nfc matchup abbreviations');
api.renderSimulationHubInSharedShell();
assert.match(elements.advBtn.innerHTML, /Sim Week 1/, 'active nfl postseason hub states should keep the Sim Week CTA available');
assert.equal(elements.advBtn.onclick, 'advanceWeek()', 'active nfl postseason hub CTA should keep advancing the bracket');

api.setSeasonModeAdapter({
  getModeId() {
    return 'nfl_mixed_era_single_player_v1';
  },
  getState() {
    return {
      leagueShell: {
        sport: 'nfl',
        anchorSeasonLabel: '2014 NFL'
      },
      postseasonState: {
        phase: 'completed'
      }
    };
  },
  getNavItems() {
    return [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Matchup' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' },
      { id: 'playoffs', label: 'Playoffs' }
    ];
  },
  getHubViewModel() {
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      controlledTeam: { abbr: 'NE', name: 'New England Patriots' },
      userRow: { w: 12, l: 4, streak: 'W1' },
      recordLabel: '12-4',
      primaryAction: { id: 'season-complete', label: 'Season Complete' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Season Complete',
      recentResults: [],
      nextGame: null
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
      starterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'],
      roster: [],
      lineup: [],
      bench: []
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [],
      userRow: null,
      sections: []
    };
  },
  getPlayoffsViewModel() {
    return {
      sport: 'nfl',
      phase: 'completed',
      currentRound: 'super_bowl',
      shellLabel: '2014 NFL',
      champion: { teamAbbr: 'NE', teamName: 'New England Patriots' },
      runnerUp: { teamAbbr: 'SEA', teamName: 'Seattle Seahawks' },
      playoffPicture: {
        afc: [{ seed: 1, teamAbbr: 'NE', teamName: 'Patriots', w: 12, l: 4, berth: 'division_winner', bye: true }],
        nfc: [{ seed: 1, teamAbbr: 'SEA', teamName: 'Seahawks', w: 12, l: 4, berth: 'division_winner', bye: true }]
      },
      currentWeekSchedule: [
        { awayAbbr: 'SEA', homeAbbr: 'NE', round: 'super_bowl', conference: 'league' }
      ]
    };
  },
  setLineup() { return null; },
  claimFreeAgent() { return null; },
  applyTrade() { return null; }
});

api.renderSimulationPlayoffsInSharedShell();
assert.match(elements.playoffsContent.innerHTML, /New England Patriots/i, 'nfl completed playoffs screen should show the champion');
assert.match(elements.playoffsContent.innerHTML, /Seattle Seahawks/i, 'nfl completed playoffs screen should show the runner-up');
assert.match(elements.playoffsContent.innerHTML, /Super Bowl XLIX Complete/i, 'nfl completed playoffs screen should keep the 2014 championship completion framing');
assert.doesNotMatch(elements.playoffsContent.innerHTML, /SEA\s*@\s*NE/i, 'completed nfl playoffs screen should not keep rendering a live Super Bowl slate');
api.renderSimulationHubInSharedShell();
assert.match(elements.advBtn.innerHTML, /Season Complete/, 'completed nfl seasons should keep the done-state CTA label');
assert.match(elements.advBtn.innerHTML, /League history locked in/, 'completed nfl seasons should keep the polished done-state subcopy');
assert.equal(elements.advBtn.onclick, "goPage('playoffs')", 'completed nfl seasons should still let the user reopen the playoffs summary from the hub');

api.setSeasonModeAdapter({
  getModeId() {
    return 'nfl_mixed_era_single_player_v1';
  },
  getState() {
    return {
      leagueShell: {
        sport: 'nfl'
      }
    };
  },
  getNavItems() {
    return [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Matchup' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' }
    ];
  },
  getHubViewModel() {
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      controlledTeam: { abbr: 'DAL', name: 'Dallas Cowboys' },
      userRow: { w: 0, l: 0, streak: 'EVEN' },
      recordLabel: '0-0',
      primaryAction: { id: 'sim-day', label: 'Sim Week' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Week 1',
      recentResults: [
        { awayAbbr: 'PHI', awayScore: 17, homeAbbr: 'DAL', homeScore: 24 }
      ],
      nextGame: { day: 1, home: true, opponentAbbr: 'PHI', opponentName: 'Philadelphia Eagles' }
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
    layoutMode: 'local-league-parity',
      summaryCards: [
        { label: 'Week Outlook', value: 'Fix 2 slots' }
      ],
      actionCards: [
        { title: 'Opponent Scout', body: 'Dallas hosts Philadelphia.' }
      ],
      operations: {
        actions: [
          { id: 'set-lineup', label: 'Set Lineup' },
          { id: 'waivers', label: 'Waivers' }
        ]
      },
      tabs: [
        { id: 'stats', label: 'Stats', active: true },
        { id: 'schedule', label: 'Matchup', active: false }
      ],
      teamSummary: {
        name: 'Dallas Cowboys',
        leagueLabel: '2014 NFL Simulation',
        watchListLabel: 'Watch List',
        watchListEnabled: false,
        watchListDisabledCopy: 'Simulation watch list tracking is not available yet.',
        waiverOrderLabel: 'Waiver Order (3 of 12)',
        waiverOrderEnabled: true,
        waiverOrderCopy: 'Open waivers to inspect the current claim order.',
        settingsLabel: 'Team Settings',
        settingsEnabled: false,
  settingsDisabledCopy: 'Local league team settings stay read-only for now.'
      },
      sections: {
        starters: {
          title: 'Weekly Starters',
          rows: [
            { slot: 'QB', player: { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL' } }
          ]
        },
        bench: {
          title: 'Bench / Depth',
          rows: [
            { slot: 'BENCH', player: { id: 81, name: 'Andrew Quarless', pos: 'TE', team: 'GB' } }
          ]
        }
      },
      readyLabel: '2 lineup issues to fix',
      recommendationSummary: 'Suggested fixes are available below.',
      validation: {
        valid: false,
        issues: [
          { slot: 'TE', message: 'TE is empty.' },
          { slot: 'DST', message: 'DST is empty.' }
        ]
      },
      starterSlots: ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
      lineupSlots: {
        QB: {
          slot: 'QB',
          playerId: 9,
          player: { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL' },
          suggestedPlayerId: null
        },
        RB1: {
          slot: 'RB1',
          playerId: 29,
          player: { id: 29, name: 'DeMarco Murray', pos: 'RB', team: 'DAL' },
          suggestedPlayerId: null
        },
        RB2: {
          slot: 'RB2',
          playerId: 21,
          player: { id: 21, name: 'Joseph Randle', pos: 'RB', team: 'DAL' },
          suggestedPlayerId: null
        },
        WR1: {
          slot: 'WR1',
          playerId: 88,
          player: { id: 88, name: 'Dez Bryant', pos: 'WR', team: 'DAL' },
          suggestedPlayerId: null
        },
        WR2: {
          slot: 'WR2',
          playerId: 11,
          player: { id: 11, name: 'Cole Beasley', pos: 'WR', team: 'DAL' },
          suggestedPlayerId: null
        },
        TE: {
          slot: 'TE',
          playerId: null,
          player: null,
          suggestedPlayerId: 81
        },
        FLEX: {
          slot: 'FLEX',
          playerId: 83,
          player: { id: 83, name: 'Terrance Williams', pos: 'WR', team: 'DAL' },
          suggestedPlayerId: null
        },
        K: {
          slot: 'K',
          playerId: 5,
          player: { id: 5, name: 'Dan Bailey', pos: 'K', team: 'DAL' },
          suggestedPlayerId: null
        },
        DST: {
          slot: 'DST',
          playerId: null,
          player: null,
          suggestedPlayerId: 9002
        }
      },
      roster: [
        { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL' },
        { id: 29, name: 'DeMarco Murray', pos: 'RB', team: 'DAL' },
        { id: 88, name: 'Dez Bryant', pos: 'WR', team: 'DAL' },
        { id: 21, name: 'Joseph Randle', pos: 'RB', team: 'DAL' },
        { id: 11, name: 'Cole Beasley', pos: 'WR', team: 'DAL' },
        { id: 83, name: 'Terrance Williams', pos: 'WR', team: 'DAL' },
        { id: 81, name: 'Andrew Quarless', pos: 'TE', team: 'GB' },
        { id: 9002, name: 'Packers DST', pos: 'DST', team: 'GB' },
        { id: 5, name: 'Dan Bailey', pos: 'K', team: 'DAL' }
      ],
      lineup: [
        { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL' },
        { id: 29, name: 'DeMarco Murray', pos: 'RB', team: 'DAL' },
        { id: 21, name: 'Joseph Randle', pos: 'RB', team: 'DAL' },
        { id: 88, name: 'Dez Bryant', pos: 'WR', team: 'DAL' },
        { id: 11, name: 'Cole Beasley', pos: 'WR', team: 'DAL' },
        { id: 83, name: 'Terrance Williams', pos: 'WR', team: 'DAL' },
        { id: 5, name: 'Dan Bailey', pos: 'K', team: 'DAL' }
      ],
      bench: [
        { id: 81, name: 'Andrew Quarless', pos: 'TE', team: 'GB' },
        { id: 9002, name: 'Packers DST', pos: 'DST', team: 'GB' }
      ]
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [],
      userRow: null,
      sections: [
        { title: 'NFC East', rows: [{ teamAbbr: 'DAL', w: 0, l: 0 }] }
      ]
    };
  },
  getPlayoffsViewModel() {
    return {
      sport: 'nfl',
      phase: 'regular_season',
      playoffPicture: null
    };
  },
  setLineup() { return null; },
  claimFreeAgent() { return null; },
  applyTrade() { return null; }
});

api.renderSimulationRosterInSharedShell();
assertSharedSinglePlayerRosterMarkers(
  elements.rosterContent.innerHTML,
  'nfl simulation roster'
);
assertSimulationParityMeta(elements.rosterContent.innerHTML, 'nfl simulation roster');
assert.match(elements.rosterContent.innerHTML, /QB/, 'nfl roster view should render football starter slot labels');
assert.match(elements.rosterContent.innerHTML, /2 lineup issues to fix/, 'nfl roster view should surface the lineup readiness status');
assert.match(elements.rosterContent.innerHTML, /Weekly Starters/, 'nfl roster view should use football-friendly section titles');
assert.match(elements.rosterContent.innerHTML, /Bench \/ Depth/, 'nfl roster view should render football-friendly bench labeling');
assert.match(elements.rosterContent.innerHTML, /Weekly Outlook/, 'nfl roster view should render football-friendly recommendation column copy');
assert.match(elements.rosterContent.innerHTML, /bench/i, 'nfl roster view should render a bench section');
assert.match(elements.rosterContent.innerHTML, /Andrew Quarless/, 'nfl roster view should render nfl bench players');
assert.match(elements.rosterContent.innerHTML, /Assign TE|Assign FLEX/, 'nfl roster view should render shared bench-assignment controls');

api.setSeasonModeAdapter({
  getModeId() {
    return 'nfl_mixed_era_single_player_v1';
  },
  getState() {
    return {
      leagueShell: {
        sport: 'nfl'
      }
    };
  },
  getNavItems() {
    return [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Matchup' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' }
    ];
  },
  getHubViewModel() {
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      controlledTeam: { abbr: 'DAL', name: 'Dallas Cowboys' },
      userRow: { w: 0, l: 0, streak: 'EVEN' },
      recordLabel: '0-0',
      primaryAction: { id: 'sim-day', label: 'Sim Week' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Week 1',
      recentResults: [],
      nextGame: null
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
      readyLabel: 'Ready For Week',
      recommendationSummary: 'Starting lineup is legal.',
      validation: { valid: true, issues: [] },
      starterSlots: ['QB'],
      lineupSlots: {
        QB: {
          slot: 'QB',
          playerId: 9,
          player: { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL' },
          suggestedPlayerId: 9
        }
      },
      roster: [
        { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL' }
      ],
      lineup: [
        { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL' }
      ],
      bench: []
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [],
      userRow: null,
      sections: []
    };
  },
  getPlayoffsViewModel() {
    return {
      sport: 'nfl',
      phase: 'regular_season',
      playoffPicture: null
    };
  },
  setLineup() { return null; },
  claimFreeAgent() { return null; },
  applyTrade() { return null; }
});

api.renderSimulationRosterInSharedShell();
assert.doesNotMatch(elements.rosterContent.innerHTML, /Suggested Fix/i, 'nfl roster view should suppress suggestion cards when the suggested player is already assigned to the slot');

const nflSuggestedLineupAdapterStub = {
  getHubViewModel() {
    return {
      sport: 'nfl',
      primaryAction: { id: 'sim-day', label: 'Sim Week' },
      controlledTeam: { abbr: 'DAL' },
      sourceSeasonLabels: ['2014']
    };
  },
  getScheduleViewModel() {
    return {
      sport: 'nfl',
      title: 'Weekly Matchup / Results',
      cycleLabel: 'Week 1',
      recentResults: [],
      nextGame: null
    };
  },
  getRosterViewModel() {
    return {
      sport: 'nfl',
      starterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DST'],
      legacyStarterSlots: ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
      lineupSlots: {
        QB: { slot: 'QB', playerId: 2, suggestedPlayerId: 1 },
        RB1: { slot: 'RB1', playerId: 3, suggestedPlayerId: 4 },
        RB2: { slot: 'RB2', playerId: 4, suggestedPlayerId: 3 },
        WR1: { slot: 'WR1', playerId: 5, suggestedPlayerId: 6 },
        WR2: { slot: 'WR2', playerId: 6, suggestedPlayerId: 5 },
        TE: { slot: 'TE', playerId: 7, suggestedPlayerId: 7 },
        FLEX: { slot: 'FLEX', playerId: 8, suggestedPlayerId: 8 },
        K: { slot: 'K', playerId: 10, suggestedPlayerId: 10 },
        DST: { slot: 'DST', playerId: 9, suggestedPlayerId: 9 }
      },
      roster: [
        { id: 1, name: 'QB One', pos: 'QB', team: 'DAL', mixedEraOverall: 99 },
        { id: 2, name: 'QB Two', pos: 'QB', team: 'DAL', mixedEraOverall: 98 },
        { id: 3, name: 'RB One', pos: 'RB', team: 'DAL', mixedEraOverall: 97 },
        { id: 4, name: 'RB Two', pos: 'RB', team: 'DAL', mixedEraOverall: 96 },
        { id: 5, name: 'WR One', pos: 'WR', team: 'DAL', mixedEraOverall: 95 },
        { id: 6, name: 'WR Two', pos: 'WR', team: 'DAL', mixedEraOverall: 94 },
        { id: 7, name: 'TE One', pos: 'TE', team: 'DAL', mixedEraOverall: 93 },
        { id: 8, name: 'WR Three', pos: 'WR', team: 'DAL', mixedEraOverall: 92 },
        { id: 9, name: 'Dallas DST', pos: 'DST', team: 'DAL', mixedEraOverall: 91 },
        { id: 10, name: 'Kicker One', pos: 'K', team: 'DAL', mixedEraOverall: 90 }
      ],
      lineup: [],
      bench: []
    };
  },
  getStandingsViewModel() {
    return {
      sport: 'nfl',
      rows: [],
      userRow: null,
      sections: [
        { title: 'NFC East', rows: [{ teamAbbr: 'DAL', w: 0, l: 0 }] }
      ]
    };
  },
  getPlayoffsViewModel() {
    return { sport: 'nfl', phase: 'regular_season', playoffPicture: null };
  },
  getState() {
    return {
      leagueShell: { sport: 'nfl', anchorSeasonLabel: '2014 NFL', teams: [{ abbr: 'DAL' }] },
      seasonState: { lineupIdsByTeam: { DAL: this.lastLineupIds || [] } },
      draftState: { controlledTeamAbbr: 'DAL', rostersByTeam: { DAL: [] }, freeAgents: [] },
      sourceSeasons: { sourceSeasonLabels: ['2014'] },
      simulationMode: 'nfl_mixed_era_single_player_v1',
      postseasonState: { phase: 'regular_season' }
    };
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return null;
  },
  claimFreeAgent() { return null; },
  applyTrade() { return null; }
};

api.setSeasonModeAdapter(nflSuggestedLineupAdapterStub);
api.applySimulationSuggestedLineupFromShell();
assert.deepEqual(
  Object.keys(toPlain(nflSuggestedLineupAdapterStub.lastLineupIds)),
  ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
  'nfl suggested lineups should preserve the keyed starter-slot save order when routing through setLineup'
);
assert.deepEqual(
  toPlain(nflSuggestedLineupAdapterStub.lastLineupIds),
  {
    QB: 1,
    RB1: 4,
    RB2: 3,
    WR1: 6,
    WR2: 5,
    TE: 7,
    FLEX: 8,
    K: 10,
    DST: 9
  },
  'nfl suggested lineups should save a slot-aware lineup map using keyed football starter slots instead of collapsing duplicate display slots'
);

api.renderSimulationScheduleInSharedShell();
assert.equal(elements.mWk.textContent, 'Week 1', 'nfl schedule view should use week-centric labels');
assert.match(elements.matchupContent.innerHTML, /Current Matchup|Weekly Starters|Bench \/ Depth/, 'nfl matchup should render the richer weekly matchup-room framing');
assert.match(elements.matchupContent.innerHTML, /Week 1|Wild Card Weekend/, 'nfl matchup should stay framed around weeks or playoff rounds');
assert.doesNotMatch(elements.matchupContent.innerHTML, /Oct 22|Tue|Wed|Thu|Fri|Sat|Sun/, 'nfl matchup should not render nba-style daily navigation chips');
assert.match(elements.matchupContent.innerHTML, /setSimulationMatchupNavigationValue/, 'nfl matchup navigation should also use the live shared-shell navigation handler');

api.setSeasonModeAdapter({
  ...nflSuggestedLineupAdapterStub,
  getWaiverViewModel() {
    return {
      sport: 'nfl',
    layoutMode: 'local-league-parity',
    claimTimingLabel: 'Processing next weekly window',
      pendingClaims: [
        {
          claimId: 'pending-1',
          teamAbbr: 'DAL',
          addPlayerId: 81,
          dropPlayerId: 83,
          status: 'pending'
        }
      ],
      recentClaimResults: [],
      teamSummary: {
        watchListLabel: 'Watch List',
        watchListEnabled: false,
        watchListDisabledCopy: 'Simulation watch list tracking is not available yet.',
        waiverOrderLabel: 'Waiver Order (3 of 12)',
        waiverOrderEnabled: true,
        waiverOrderCopy: 'Open waivers to inspect the current claim order.',
        settingsLabel: 'Team Settings',
        settingsEnabled: false,
  settingsDisabledCopy: 'Local league team settings stay read-only for now.'
      },
      sections: {
        available: {
          rows: [
            {
              player: { id: 81, name: 'Andrew Quarless', pos: 'TE', team: 'GB' },
              consequenceLabel: 'Drop required to submit claim'
            }
          ]
        },
        pending: {
          rows: [
            {
              claimId: 'pending-1',
              status: 'pending',
              player: { id: 81, name: 'Andrew Quarless', pos: 'TE', team: 'GB' }
            }
          ]
        }
      }
    };
  }
});
api.renderSimulationHubInSharedShell();
assert.equal(elements.hubPowerupsTitle.textContent, 'Weekly Powerups', 'nfl simulation hub should keep the weekly side-rail title');
api.renderSimulationWaiverInSharedShell();
assert.match(elements.waiverContent.innerHTML, /Processing next weekly window/i, 'nfl waiver desk should render weekly claim-processing copy through the shared shell');
assert.match(elements.waiverContent.innerHTML, /Pending Claims/i, 'nfl waiver desk should render the pending-claims section through the shared shell');

api.renderSimulationStandingsInSharedShell();
assert.match(elements.standingsContent.innerHTML, /NFC East/, 'nfl standings view should render division-grouped sections');

api.setActiveSeasonMode('simulation');
api.setSeasonModeAdapter(null);
demoInitCalls = 0;
demoViewCalls = 0;
demoToasts = [];
sandbox.window.location = { search: '?sport=nba&simulation=nba_mixed_era', href: 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era' };
Promise.resolve(sandbox.window.onload()).then(() => {
  assert.equal(api.getActiveSeasonMode(), 'fantasy', 'stale simulation URLs with no recoverable state should boot in fantasy mode');
  assert.equal(api.getSeasonModeAdapter(), null, 'stale simulation URLs with no recoverable state should not leave a null simulation adapter behind');
  assert.equal(sandbox.getSeasonEmptyStateForTest(), 'idle', 'stale simulation URLs with no recoverable state should stay on the idle empty state');
  return api.loadDemo();
}).then(() => {
  assert.equal(api.getActiveSeasonMode(), 'fantasy', 'demo boot should clear stale simulation mode when no recoverable simulation state exists');
  assert.equal(api.getSeasonModeAdapter(), null, 'demo boot should not leave a missing simulation adapter behind');
  assert.equal(demoInitCalls, 1, 'demo boot should still initialize the season once');
  assert.equal(demoViewCalls, 1, 'demo boot should still apply the requested season view once');
  assert.deepEqual(demoToasts, [], 'demo boot should not surface a simulation adapter error when falling back to fantasy mode');

  console.log('shared season shell simulation test passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
