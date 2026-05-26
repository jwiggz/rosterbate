const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

function findMatchingBrace(text, openBraceIndex) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('Could not find matching brace');
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `could not find function ${name}`);
  const openBrace = source.indexOf('{', start);
  const end = findMatchingBrace(source, openBrace);
  return source.slice(start, end + 1);
}

const context = {
  console,
  Date,
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  module: { exports: {} },
  exports: {}
};
vm.createContext(context);
[
  'normalizePlayerHistoryId',
  'doesPlayerHistoryIdMatch',
  'formatPlayerHistoryTimestamp',
  'buildPlayerDetailTeamLookup',
  'getPlayerDetailTeamIndexByAbbr',
  'getControlledTeamIndexForPlayerDetail',
  'getPlayerDetailRosterOwner',
  'playerSearchPool',
  'findPlayerForDetail',
  'buildPlayerDetailActionModel',
  'playerDetailJsStringArg',
  'playerDetailNameButton',
  'buildPlayerTransactionHistory',
  'renderPlayerTransactionTimeline',
  'formatPlayerDetailStat',
  'getCurrentRosterSlot',
  'renderPlayerDetailModal'
].forEach((name) => {
  vm.runInContext(extractFunction(name), context, { filename: `season:${name}` });
});

context.weekForDay = () => 1;
context.getInjuryStatus = () => null;
context.playerDetailGameLog = () => [];
context.renderTeamInitialAvatar = (name) => `<span>${context.escapeHtml(name || 'Player')}</span>`;
context.getGameInfo = () => null;
context.renderPlayerDetailActions = () => '';
context.getIlRoster = () => [];
context.getIlSlotKey = () => 'IL';
context.getLineupForDay = () => ['alt-only-42'];
context.SLOT_LABELS = ['PG'];
context.rosterViewDay = 1;

const tradeTs = new Date(2026, 4, 1, 21, 50).getTime();
const waiverTs = new Date(2026, 4, 1, 22, 5).getTime();

const stateContext = {
  adapterState: {
    leagueShell: {
      teams: [
        { abbr: 'LAL', name: 'Los Angeles Lakers' },
        { abbr: 'BOS', name: 'Boston Celtics' }
      ]
    },
    draftState: {
      rostersByTeam: {
        LAL: [{ id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' }],
        BOS: [{ id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' }]
      },
      freeAgents: [{ id: 77, name: 'Grant Hill', team: 'DET', pos: 'SF' }]
    },
    seasonState: {
      activityLog: [
        {
          type: 'trade',
          fromTeamAbbr: 'LAL',
          toTeamAbbr: 'BOS',
          outgoingPlayerIds: [34],
          incomingPlayerIds: [30],
          outgoingPlayerNames: ['Hakeem Olajuwon'],
          incomingPlayerNames: ['Stephen Curry'],
          tradeDeskFeedback: {
            message: 'Trade applied: Hakeem Olajuwon for Stephen Curry.'
          },
          ts: tradeTs
        }
      ],
      recentWaiverResults: [
        {
          status: 'approved',
          teamAbbr: 'LAL',
          addPlayerId: 77,
          dropPlayerId: 34,
          processedAt: waiverTs
        }
      ],
      pendingWaiverClaims: []
    }
  },
  data: {
    teams: ['Los Angeles Lakers', 'Boston Celtics']
  },
  game: {
    rosters: [
      [{ id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' }],
      [{ id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' }]
    ],
    waiver: [{ id: 77, name: 'Grant Hill', team: 'DET', pos: 'SF' }],
    recentDrops: [
      {
        teamIdx: 0,
        teamName: 'Los Angeles Lakers',
        player: { id: 91, name: 'Dennis Rodman', team: 'CHI', pos: 'PF' },
        slot: 'BN',
        droppedAt: tradeTs
      }
    ],
    tradeOffers: [],
    activityLog: []
  }
};

{
  assert.equal(context.doesPlayerHistoryIdMatch('string-player-1', { id: 'string-player-1' }), true);
  assert.equal(context.doesPlayerHistoryIdMatch(30, { id: '30' }), true);
}

{
  const markup = context.playerDetailNameButton({ id: 80, name: 'Brook Lopez' });
  assert.match(markup, /onclick="openPlayerDetailModal\('80','Brook Lopez',''\);event\.stopPropagation\(\);"/);
  assert.doesNotMatch(markup, /onclick="openPlayerDetailModal\("/);

  const playerIdOnlyMarkup = context.playerDetailNameButton({ playerId: 'vm-row-80', name: 'View Model Guard' });
  assert.match(playerIdOnlyMarkup, /class="player-name-link"/);
  assert.match(playerIdOnlyMarkup, /openPlayerDetailModal\('vm-row-80','View Model Guard',''\)/);

  const encodedEntityMarkup = context.playerDetailNameButton({ id: 'id&apos;1&2', name: 'Amp & B&apos; Guard' });
  const encodedOnclick = encodedEntityMarkup.match(/onclick="([^"]*)"/)?.[1] || '';
  assert.doesNotMatch(encodedOnclick, /&apos;/, 'onclick arguments should not expose raw apostrophe entities');
  assert.match(encodedOnclick, /id&amp;apos;1&amp;2/, 'onclick arguments should HTML-escape ampersands before entity-looking text');
}

{
  context.G = { rosters: [], ilByTeam: [], waiver: [] };
  context.SEASON_MODE_ADAPTER = {
    getState() {
      return {
        draftState: {
          rostersByTeam: {
            LAL: [{ id: 'adapter-string-1', name: 'Adapter Guard', team: 'LAL', pos: 'SG' }]
          },
          freeAgents: [{ id: 'adapter-fa-1', name: 'Adapter Free Agent', team: 'FA', pos: 'SF' }]
        }
      };
    }
  };
  assert.equal(context.findPlayerForDetail('adapter-string-1')?.name, 'Adapter Guard');
  assert.equal(context.findPlayerForDetail('adapter-fa-1')?.name, 'Adapter Free Agent');
}

{
  const alternateIdContext = {
    data: {
      myPos: 0,
      teams: ['Alternate Managers'],
      draftState: { controlledTeamAbbr: 'ALT' }
    },
    game: {
      day: 1,
      rosters: [
        [{ playerId: 'alt-only-42', name: 'Alternate Key Guard', team: 'ALT', pos: 'PG', fp: 32 }],
        []
      ],
      ilByTeam: [],
      waiver: []
    },
    adapterState: {
      leagueShell: {
        teams: [
          { abbr: 'ALT', name: 'Alternate Managers' },
          { abbr: 'CPU', name: 'CPU Team' }
        ]
      },
      draftState: {
        controlledTeamAbbr: 'ALT',
        rostersByTeam: {
          ALT: [{ playerId: 'alt-only-42', name: 'Alternate Key Guard', team: 'ALT', pos: 'PG', fp: 32 }],
          CPU: []
        },
        freeAgents: []
      },
      seasonState: { activityLog: [], recentWaiverResults: [], pendingWaiverClaims: [] }
    }
  };
  context.D = alternateIdContext.data;
  context.G = alternateIdContext.game;
  context.SEASON_MODE_ADAPTER = {
    getState() {
      return alternateIdContext.adapterState;
    }
  };
  const markup = context.renderPlayerDetailModal(
    { playerId: 'alt-only-42', name: 'Alternate Key Guard', team: 'ALT', pos: 'PG', fp: 32 },
    alternateIdContext
  );
  assert.match(markup, /Manager <b>Alternate Managers<\/b>/, 'player detail modal should resolve owner from playerId-only players');
  assert.match(markup, /Slot <b>PG<\/b>/, 'player detail modal should resolve slot from playerId-only players');
}

{
  const contextForActions = {
    game: {
      rosters: [
        [{ id: 'mine-1', name: 'My Guard', team: 'LAL', pos: 'PG' }],
        [{ id: 'opp-1', name: 'Opponent Wing', team: 'BOS', pos: 'SF' }]
      ],
      ilByTeam: [],
      waiver: [{ id: 'fa-1', name: 'Free Agent Wing', team: 'DET', pos: 'SF' }]
    },
    data: { myPos: 0, teams: ['Los Angeles Lakers', 'Boston Celtics'] },
    adapterState: {
      leagueShell: {
        teams: [
          { abbr: 'LAL', name: 'Los Angeles Lakers' },
          { abbr: 'BOS', name: 'Boston Celtics' }
        ]
      },
      seasonState: { activityLog: [], recentWaiverResults: [], pendingWaiverClaims: [] }
    }
  };
  assert.deepStrictEqual(
    {
      kind: context.buildPlayerDetailActionModel({ id: 'mine-1', name: 'My Guard' }, contextForActions).kind,
      primaryLabel: context.buildPlayerDetailActionModel({ id: 'mine-1', name: 'My Guard' }, contextForActions).primaryLabel
    },
    { kind: 'own-roster', primaryLabel: 'Drop Player' }
  );
  assert.deepStrictEqual(
    {
      kind: context.buildPlayerDetailActionModel({ id: 'fa-1', name: 'Free Agent Wing' }, contextForActions).kind,
      primaryLabel: context.buildPlayerDetailActionModel({ id: 'fa-1', name: 'Free Agent Wing' }, contextForActions).primaryLabel
    },
    { kind: 'free-agent', primaryLabel: 'Add Player' }
  );
  assert.deepStrictEqual(
    {
      kind: context.buildPlayerDetailActionModel({ id: 'opp-1', name: 'Opponent Wing' }, contextForActions).kind,
      primaryLabel: context.buildPlayerDetailActionModel({ id: 'opp-1', name: 'Opponent Wing' }, contextForActions).primaryLabel,
      partnerTeamIdx: context.buildPlayerDetailActionModel({ id: 'opp-1', name: 'Opponent Wing' }, contextForActions).partnerTeamIdx
    },
    { kind: 'opponent-roster', primaryLabel: 'Propose Trade', partnerTeamIdx: 1 }
  );
}

{
  const events = context.buildPlayerTransactionHistory(
    { id: 'string-player-1', name: 'String Guard', team: 'TST', pos: 'SG' },
    {
      game: {
        rosters: [
          [{ id: 'string-player-2', name: 'String Big', team: 'TST', pos: 'C' }],
          [{ id: 'string-player-1', name: 'String Guard', team: 'TST', pos: 'SG' }]
        ],
        waiver: [],
        recentDrops: [],
        tradeOffers: [
          {
            fromTeam: 0,
            toTeam: 1,
            give: ['string-player-1'],
            get: ['string-player-2'],
            status: 'accepted',
            updatedAt: tradeTs
          }
        ],
        activityLog: []
      },
      data: { teams: ['Alpha', 'Beta'] },
      adapterState: { seasonState: { activityLog: [], recentWaiverResults: [], pendingWaiverClaims: [] } }
    }
  );
  assert.equal(events[0].title, 'Traded with Beta');
  assert.match(events[0].detail, /String Guard was traded from Alpha to Beta\./);
}

{
  const events = context.buildPlayerTransactionHistory(
    { id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' },
    stateContext
  );
  assert.equal(events[0].title, 'Traded with Boston Celtics');
  assert.match(events[0].detail, /Stephen Curry was traded from Boston Celtics to Los Angeles Lakers\./);
  assert.equal(events[0].timestampLabel, '5/1/2026 at 9:50 PM');
}

{
  const events = context.buildPlayerTransactionHistory(
    { id: 'curry-current-lal', name: 'Stephen Curry', team: 'GSW', pos: 'PG' },
    {
      game: {
        rosters: [
          [{ id: 'curry-current-lal', name: 'Stephen Curry', team: 'GSW', pos: 'PG' }],
          [{ id: 'depth-bos', name: 'Depth Guard', team: 'BOS', pos: 'SG' }]
        ],
        waiver: [],
        tradeOffers: [],
        recentDrops: [],
        activityLog: []
      },
      data: { teams: ['Los Angeles Lakers', 'Boston Celtics'] },
      adapterState: {
        leagueShell: {
          teams: [
            { abbr: 'LAL', name: 'Los Angeles Lakers' },
            { abbr: 'BOS', name: 'Boston Celtics' }
          ]
        },
        draftState: {
          rostersByTeam: {
            LAL: [{ id: 'curry-current-lal', name: 'Stephen Curry', team: 'GSW', pos: 'PG' }],
            BOS: [{ id: 'depth-bos', name: 'Depth Guard', team: 'BOS', pos: 'SG' }]
          },
          freeAgents: []
        },
        seasonState: {
          activityLog: [
            {
              type: 'trade',
              fromTeamAbbr: 'BOS',
              toTeamAbbr: 'LAL',
              incomingPlayerIds: ['curry-current-lal'],
              outgoingPlayerIds: ['depth-bos'],
              incomingPlayerNames: ['Stephen Curry'],
              outgoingPlayerNames: ['Depth Guard'],
              ts: tradeTs
            }
          ],
          recentWaiverResults: [],
          pendingWaiverClaims: []
        }
      }
    }
  );
  assert.equal(events[0].title, 'Traded with Boston Celtics');
  assert.match(events[0].detail, /Stephen Curry was traded from Boston Celtics to Los Angeles Lakers\./);
}

{
  const events = context.buildPlayerTransactionHistory(
    { id: 77, name: 'Grant Hill', team: 'DET', pos: 'SF' },
    stateContext
  );
  assert.equal(events[0].title, 'Added by Los Angeles Lakers');
  assert.match(events[0].detail, /Grant Hill was added from waivers\./);
  assert.match(events[0].detail, /Hakeem Olajuwon was dropped/);
}

{
  const events = context.buildPlayerTransactionHistory(
    { id: 'waiver-repeat', name: 'Waiver Target', team: 'FA', pos: 'SG' },
    {
      game: {
        rosters: [[]],
        waiver: [{ id: 'waiver-repeat', name: 'Waiver Target', team: 'FA', pos: 'SG' }],
        tradeOffers: [],
        recentDrops: [],
        activityLog: [
          {
            addPlayerId: 'waiver-repeat',
            teamName: 'Boston Celtics',
            processedAt: waiverTs + 12000
          }
        ]
      },
      data: { teams: ['Boston Celtics'] },
      adapterState: {
        seasonState: {
          activityLog: [],
          recentWaiverResults: [
            {
              status: 'approved',
              addPlayerId: 'waiver-repeat',
              teamName: 'Boston Celtics',
              processedAt: waiverTs
            },
            {
              status: 'approved',
              addPlayerId: 'waiver-repeat',
              teamName: 'Boston Celtics',
              processedAt: waiverTs + 24000
            }
          ],
          pendingWaiverClaims: []
        }
      }
    }
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Added by Boston Celtics');
  assert.match(events[0].detail, /Waiver Target was added from waivers\./);
}

{
  const events = context.buildPlayerTransactionHistory(
    { id: 91, name: 'Dennis Rodman', team: 'CHI', pos: 'PF' },
    stateContext
  );
  assert.equal(events[0].title, 'Dropped by Los Angeles Lakers');
  assert.match(events[0].detail, /Dennis Rodman was dropped from BN and moved to waivers\./);
}

{
  const events = context.buildPlayerTransactionHistory(
    { id: 999, name: 'Quiet Starter', team: 'QST', pos: 'SG' },
    {
      game: {
        rosters: [[{ id: 999, name: 'Quiet Starter', team: 'QST', pos: 'SG' }]],
        waiver: [],
        tradeOffers: [],
        recentDrops: [],
        activityLog: []
      },
      data: { teams: ['My Team'] },
      adapterState: { seasonState: { activityLog: [], recentWaiverResults: [], pendingWaiverClaims: [] } }
    }
  );
  assert.equal(events[0].title, 'Rostered by My Team');
  assert.match(events[0].detail, /Quiet Starter is currently on My Team's active roster\./);
}

{
  const markup = context.renderPlayerTransactionTimeline(
    { id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' },
    stateContext
  );
  assert.match(markup, /Player Timeline/);
  assert.match(markup, /Traded with Boston Celtics/);
  assert.match(markup, /5\/1\/2026 at 9:50 PM/);
}

console.log('player detail history test passed');
