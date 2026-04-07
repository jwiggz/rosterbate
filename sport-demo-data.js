// RosterBate Demo Season Data
// This is STATIC sample data for "Try It Now" preview mode
// Not connected to live player data or real drafts
(function() {
  
  // Static NBA demo players (pre-saved, not from live pools)
  // Need 104 players for draft (8 teams × 13 rounds) + extras for waiver wire
  const NBA_DEMO_PLAYERS = [
    {id:1,name:"Jayson Tatum",team:"BOS",pos:"SF",fp:49.8,adp:9,statValues:{PTS:28,REB:8.5,AST:5.1,STL:1.1,BLK:0.6,TO:2.7,"3PM":3.2},statSummary:"28 pts - 8.5 reb - 5.1 ast"},
    {id:37,name:"Joel Embiid",team:"PHI",pos:"C",fp:61.2,adp:2,statValues:{PTS:34.7,REB:11,AST:5.6,STL:1,BLK:1.7,TO:3.8,"3PM":1.1},statSummary:"34.7 pts - 11 reb - 5.6 ast"},
    {id:97,name:"Giannis Antetokounmpo",team:"MIL",pos:"PF",fp:59.7,adp:3,statValues:{PTS:32.7,REB:11.5,AST:6.5,STL:1.2,BLK:1.1,TO:3.8,"3PM":0.7},statSummary:"32.7 pts - 11.5 reb - 6.5 ast"},
    {id:157,name:"Nikola Jokic",team:"DEN",pos:"C",fp:58.1,adp:4,statValues:{PTS:26.4,REB:12.4,AST:9,STL:1.4,BLK:0.7,TO:3.4,"3PM":0.9},statSummary:"26.4 pts - 12.4 reb - 9 ast"},
    {id:177,name:"Shai Gilgeous-Alexander",team:"OKC",pos:"PG",fp:53.6,adp:5,statValues:{PTS:30.1,REB:5.5,AST:6.2,STL:2,BLK:1.1,TO:2.8,"3PM":2.1},statSummary:"30.1 pts - 5.5 reb - 6.2 ast"},
    {id:228,name:"Anthony Davis",team:"LAL",pos:"C",fp:52.9,adp:6,statValues:{PTS:24.7,REB:12.6,AST:3.5,STL:1.1,BLK:2.3,TO:2.5,"3PM":0.3},statSummary:"24.7 pts - 12.6 reb - 3.5 ast"},
    {id:207,name:"Stephen Curry",team:"GSW",pos:"PG",fp:46.8,adp:15,statValues:{PTS:29.4,REB:5.1,AST:6.1,STL:0.7,BLK:0.2,TO:3.1,"3PM":5.1},statSummary:"29.4 pts - 5.1 reb - 6.1 ast"},
    {id:67,name:"Donovan Mitchell",team:"CLE",pos:"SG",fp:46,adp:16,statValues:{PTS:26.6,REB:5.1,AST:6.1,STL:1.6,BLK:0.3,TO:3.2,"3PM":3.2},statSummary:"26.6 pts - 5.1 reb - 6.1 ast"},
    {id:117,name:"LaMelo Ball",team:"CHA",pos:"PG",fp:45.6,adp:17,statValues:{PTS:23,REB:5.6,AST:8,STL:1.6,BLK:0.4,TO:4,"3PM":3.8},statSummary:"23 pts - 5.6 reb - 8 ast"},
    {id:87,name:"Tyrese Haliburton",team:"IND",pos:"PG",fp:45.6,adp:18,statValues:{PTS:20.1,REB:3.9,AST:10.4,STL:1.6,BLK:0.5,TO:2.7,"3PM":2.5},statSummary:"20.1 pts - 3.9 reb - 10.4 ast"},
    {id:127,name:"Devin Booker",team:"PHX",pos:"SG",fp:44.3,adp:20,statValues:{PTS:27.8,REB:4.5,AST:6.9,STL:0.9,BLK:0.4,TO:2.7,"3PM":2.5},statSummary:"27.8 pts - 4.5 reb - 6.9 ast"},
    {id:247,name:"Domantas Sabonis",team:"SAC",pos:"C",fp:47.9,adp:12,statValues:{PTS:19.6,REB:13.6,AST:7.3,STL:0.8,BLK:0.5,TO:3,"3PM":0.2},statSummary:"19.6 pts - 13.6 reb - 7.3 ast"},
    {id:137,name:"Jaylen Brown",team:"BOS",pos:"SG",fp:43.5,adp:22,statValues:{PTS:26.6,REB:6.1,AST:3.5,STL:1.2,BLK:0.4,TO:2.7,"3PM":2.6},statSummary:"26.6 pts - 6.1 reb - 3.5 ast"},
    {id:147,name:"Tyrese Maxey",team:"PHI",pos:"PG",fp:42.4,adp:25,statValues:{PTS:25.9,REB:3.7,AST:6.2,STL:1,BLK:0.4,TO:2.3,"3PM":3.1},statSummary:"25.9 pts - 3.7 reb - 6.2 ast"},
    {id:27,name:"Bam Adebayo",team:"MIA",pos:"C",fp:41.8,adp:28,statValues:{PTS:19.3,REB:10.4,AST:3.9,STL:1.2,BLK:0.9,TO:2.2,"3PM":0},statSummary:"19.3 pts - 10.4 reb - 3.9 ast"},
    {id:187,name:"Jalen Brunson",team:"NYK",pos:"PG",fp:39.9,adp:32,statValues:{PTS:28.7,REB:3.6,AST:6.7,STL:0.9,BLK:0.2,TO:2.4,"3PM":2.4},statSummary:"28.7 pts - 3.6 reb - 6.7 ast"},
    {id:17,name:"Damian Lillard",team:"MIL",pos:"PG",fp:41.5,adp:30,statValues:{PTS:24.3,REB:4.4,AST:7,STL:1,BLK:0.3,TO:2.7,"3PM":3.6},statSummary:"24.3 pts - 4.4 reb - 7 ast"},
    {id:47,name:"Kawhi Leonard",team:"LAC",pos:"SF",fp:40.2,adp:35,statValues:{PTS:23.7,REB:6.1,AST:3.6,STL:1.6,BLK:0.9,TO:1.8,"3PM":2.1},statSummary:"23.7 pts - 6.1 reb - 3.6 ast"},
    {id:57,name:"Jimmy Butler",team:"MIA",pos:"SF",fp:38.9,adp:38,statValues:{PTS:20.8,REB:5.3,AST:5,STL:1.3,BLK:0.4,TO:1.4,"3PM":0.4},statSummary:"20.8 pts - 5.3 reb - 5 ast"},
    {id:77,name:"Paul George",team:"PHI",pos:"SF",fp:37.6,adp:42,statValues:{PTS:22.6,REB:5.2,AST:3.5,STL:1.5,BLK:0.4,TO:2.2,"3PM":2.4},statSummary:"22.6 pts - 5.2 reb - 3.5 ast"},
    {id:107,name:"Trae Young",team:"ATL",pos:"PG",fp:47.9,adp:13,statValues:{PTS:25.7,REB:3.3,AST:10.8,STL:1.3,BLK:0.3,TO:4.1,"3PM":2.7},statSummary:"25.7 pts - 3.3 reb - 10.8 ast"},
    {id:257,name:"Luka Doncic",team:"DAL",pos:"PG",fp:62.6,adp:1,statValues:{PTS:33.9,REB:9.2,AST:9.8,STL:1.4,BLK:0.5,TO:4.5,"3PM":3.6},statSummary:"33.9 pts - 9.2 reb - 9.8 ast"},
    {id:167,name:"Anthony Edwards",team:"MIN",pos:"SG",fp:43.1,adp:23,statValues:{PTS:25.9,REB:5.4,AST:5.1,STL:1.3,BLK:0.5,TO:3.1,"3PM":2.6},statSummary:"25.9 pts - 5.4 reb - 5.1 ast"},
    {id:197,name:"Scottie Barnes",team:"TOR",pos:"PF",fp:35.2,adp:48,statValues:{PTS:19.9,REB:8.2,AST:6,STL:1.3,BLK:1.5,TO:2.3,"3PM":1.3},statSummary:"19.9 pts - 8.2 reb - 6 ast"},
    // Adding more players to reach 120+
    {id:2,name:"Devin Vassell",team:"SAS",pos:"SG",fp:35,adp:50,statValues:{PTS:19.5,REB:4.1,AST:3.8,STL:1.1,BLK:0.6,TO:1.8,"3PM":2.4},statSummary:"19.5 pts - 4.1 reb - 3.8 ast"},
    {id:3,name:"Jaren Jackson Jr",team:"MEM",pos:"PF",fp:34.8,adp:52,statValues:{PTS:22.5,REB:5.5,AST:2.3,STL:1.6,BLK:1.6,TO:1.7,"3PM":1.6},statSummary:"22.5 pts - 5.5 reb - 2.3 ast"},
    {id:4,name:"Franz Wagner",team:"ORL",pos:"SF",fp:34.5,adp:54,statValues:{PTS:20.1,REB:5.3,AST:5.7,STL:1.1,BLK:0.6,TO:2.1,"3PM":1.5},statSummary:"20.1 pts - 5.3 reb - 5.7 ast"},
    {id:5,name:"Cade Cunningham",team:"DET",pos:"PG",fp:34.2,adp:56,statValues:{PTS:22.7,REB:7.5,AST:7.5,STL:0.9,BLK:0.8,TO:3.1,"3PM":1.6},statSummary:"22.7 pts - 7.5 reb - 7.5 ast"},
    {id:6,name:"Paolo Banchero",team:"ORL",pos:"PF",fp:33.9,adp:58,statValues:{PTS:23,REB:6.9,AST:5.4,STL:0.9,BLK:0.7,TO:2.8,"3PM":1.2},statSummary:"23 pts - 6.9 reb - 5.4 ast"},
    {id:7,name:"Jalen Williams",team:"OKC",pos:"SF",fp:33.6,adp:60,statValues:{PTS:19.1,REB:4,AST:4.5,STL:2.1,BLK:1.1,TO:1.3,"3PM":1.4},statSummary:"19.1 pts - 4 reb - 4.5 ast"},
    {id:8,name:"Alperen Sengun",team:"HOU",pos:"C",fp:33.3,adp:62,statValues:{PTS:18.7,REB:10.3,AST:5,STL:1.2,BLK:1.4,TO:2.7,"3PM":0.3},statSummary:"18.7 pts - 10.3 reb - 5 ast"},
    {id:9,name:"Scottie Pippen Jr",team:"MEM",pos:"PG",fp:33,adp:64,statValues:{PTS:12.9,REB:4.7,AST:5.6,STL:1.8,BLK:0.3,TO:1.9,"3PM":1.1},statSummary:"12.9 pts - 4.7 reb - 5.6 ast"},
    {id:10,name:"Jamal Murray",team:"DEN",pos:"PG",fp:32.7,adp:66,statValues:{PTS:21.2,REB:4,AST:5.8,STL:1,BLK:0.4,TO:2,"3PM":2.3},statSummary:"21.2 pts - 4 reb - 5.8 ast"},
    {id:11,name:"Evan Mobley",team:"CLE",pos:"PF",fp:32.4,adp:68,statValues:{PTS:17.4,REB:9.4,AST:3.2,STL:0.9,BLK:1.4,TO:2.2,"3PM":0.6},statSummary:"17.4 pts - 9.4 reb - 3.2 ast"},
    {id:12,name:"De'Aaron Fox",team:"SAC",pos:"PG",fp:32.1,adp:70,statValues:{PTS:25.9,REB:5,AST:6.1,STL:1.7,BLK:0.4,TO:2.8,"3PM":2},statSummary:"25.9 pts - 5 reb - 6.1 ast"},
    {id:13,name:"Desmond Bane",team:"MEM",pos:"SG",fp:31.8,adp:72,statValues:{PTS:24.7,REB:5,AST:5.5,STL:1.1,BLK:0.8,TO:2.4,"3PM":3.6},statSummary:"24.7 pts - 5 reb - 5.5 ast"},
    {id:14,name:"Brandon Ingram",team:"NO",pos:"SF",fp:31.5,adp:74,statValues:{PTS:20.8,REB:5.7,AST:5.7,STL:0.8,BLK:0.6,TO:2.2,"3PM":1.2},statSummary:"20.8 pts - 5.7 reb - 5.7 ast"},
    {id:15,name:"Chet Holmgren",team:"OKC",pos:"C",fp:31.2,adp:76,statValues:{PTS:16.4,REB:7.9,AST:2.3,STL:0.6,BLK:2.3,TO:1.9,"3PM":1.6},statSummary:"16.4 pts - 7.9 reb - 2.3 ast"},
    {id:16,name:"Darius Garland",team:"CLE",pos:"PG",fp:30.9,adp:78,statValues:{PTS:18,REB:2.7,AST:6.5,STL:1.3,BLK:0.1,TO:1.8,"3PM":2.6},statSummary:"18 pts - 2.7 reb - 6.5 ast"}
  ];
  
  // Generate more players to fill out the draft
  const additionalPositions = ['PG','SG','SF','PF','C'];
  const additionalTeams = ['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS'];
  
  for(let i = NBA_DEMO_PLAYERS.length; i < 120; i++) {
    const fp = 30 - (i - 40) * 0.3;
    const pts = 15 + Math.random() * 10;
    const reb = 3 + Math.random() * 5;
    const ast = 2 + Math.random() * 4;
    NBA_DEMO_PLAYERS.push({
      id: 1000 + i,
      name: `Player ${i}`,
      team: additionalTeams[i % additionalTeams.length],
      pos: additionalPositions[i % additionalPositions.length],
      fp: parseFloat(fp.toFixed(1)),
      adp: i + 1,
      statValues: {
        PTS: parseFloat(pts.toFixed(1)),
        REB: parseFloat(reb.toFixed(1)),
        AST: parseFloat(ast.toFixed(1)),
        STL: parseFloat((Math.random() * 1.5).toFixed(1)),
        BLK: parseFloat((Math.random() * 1.2).toFixed(1)),
        TO: parseFloat((1 + Math.random() * 2).toFixed(1)),
        "3PM": parseFloat((Math.random() * 3).toFixed(1))
      },
      statSummary: `${pts.toFixed(1)} pts - ${reb.toFixed(1)} reb - ${ast.toFixed(1)} ast`
    });
  }

  // Pre-draft the rosters using snake draft pattern
  function buildDemoRosters() {
    const teams = 8;
    const rounds = 13;
    const rosters = Array.from({length: teams}, () => []);
    
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < teams; i++) {
        const pickIndex = r % 2 === 0 ? i : teams - 1 - i;
        const playerIndex = (r * teams) + i;
        if (NBA_DEMO_PLAYERS[playerIndex]) {
          rosters[pickIndex].push({...NBA_DEMO_PLAYERS[playerIndex]});
        }
      }
    }
    return rosters;
  }

  const demoRosters = buildDemoRosters();
  const demoTeams = [
    'Demo Dunkers',
    'Sample Squad', 
    'Test Team',
    'Practice Players',
    'Trial Tribe',
    'Mock Masters',
    'Preview Pros',
    'Example Elite'
  ];

  window.ROSTERBATE_DEMO_DATA = {
    nba: {
      sport: 'nba',
      teamName: demoTeams[0],
      leagueSize: 8,
      scoringFormat: 'h2h_pts',
      draftFormat: 'snake',
      rounds: 13,
      myPos: 0,
      teams: demoTeams,
      myRoster: demoRosters[0],
      allRosters: demoRosters,
      picks: demoRosters.flatMap((roster, ti) => 
        roster.map((p, i) => ({
          ov: ti + i * 8 + 1,
          round: i + 1,
          ti: ti,
          pid: p.id
        }))
      ),
      trashTalkThread: { msgs: [], lastSeen: 0 },
      isCommissioner: true,
      isDemo: true,
      savedAt: Date.now()
    }
  };

  // Helper function to get demo data for a sport
  window.getRosterbateDemoData = function(sport) {
    const normalized = (sport || 'nba').toLowerCase();
    return window.ROSTERBATE_DEMO_DATA[normalized] || window.ROSTERBATE_DEMO_DATA.nba;
  };

  // Get all demo players
  window.getRosterbateDemoPlayers = function(sport) {
    const normalized = (sport || 'nba').toLowerCase();
    if (normalized === 'nba') return NBA_DEMO_PLAYERS;
    return [];
  };
})();
