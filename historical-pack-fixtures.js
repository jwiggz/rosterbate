(function(global){
  'use strict';

  function deepClone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function createTeam(config){
    return {
      teamId: config.teamId,
      seasonId: 'nba_1996_historic',
      city: config.city,
      name: config.name,
      displayName: config.displayName || [config.city, config.name].join(' '),
      abbreviation: config.abbreviation,
      conference: config.conference,
      division: config.division,
      palette: deepClone(config.palette || {}),
      externalRefs: {}
    };
  }

  function createPlayer(team, player){
    return {
      playerId: 'nba_1996_' + player.slug,
      seasonId: 'nba_1996_historic',
      displayName: player.displayName,
      firstName: player.firstName,
      lastName: player.lastName,
      teamId: team.teamId,
      primaryPosition: player.primaryPosition,
      secondaryPositions: deepClone(player.secondaryPositions || []),
      status: 'active',
      draftEligible: true,
      bio: player.bio,
      externalRefs: {}
    };
  }

  function createRosterSnapshot(team, player){
    return {
      seasonId: 'nba_1996_historic',
      teamId: team.teamId,
      playerId: 'nba_1996_' + player.slug,
      rosterRole: player.rosterRole || 'starter',
      depthTag: player.depthTag || (player.primaryPosition + '1'),
      startDate: '1995-11-03',
      endDate: '1996-04-21'
    };
  }

  const TEAM_DEFINITIONS=[
    {
      teamId:'nba_1996_chi',
      city:'Chicago',
      name:'Bulls',
      abbreviation:'CHI',
      conference:'East',
      division:'Central',
      palette:{primary:'#7a1821',secondary:'#111111'},
      players:[
        {slug:'michael_jordan',displayName:'Michael Jordan',firstName:'Michael',lastName:'Jordan',primaryPosition:'SG',secondaryPositions:['SF'],bio:'Flagship superstar and the centerpiece of the 1995-96 Bulls.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'scottie_pippen',displayName:'Scottie Pippen',firstName:'Scottie',lastName:'Pippen',primaryPosition:'SF',secondaryPositions:['PF'],bio:'Primary two-way running mate on Chicago\'s dynasty path.',rosterRole:'starter',depthTag:'SF1'},
        {slug:'dennis_rodman',displayName:'Dennis Rodman',firstName:'Dennis',lastName:'Rodman',primaryPosition:'PF',secondaryPositions:['C'],bio:'Elite rebounder and defensive chaos engine.',rosterRole:'starter',depthTag:'PF1'},
        {slug:'toni_kukoc',displayName:'Toni Kukoc',firstName:'Toni',lastName:'Kukoc',primaryPosition:'SF',secondaryPositions:['PF'],bio:'Versatile sixth-man creator and swing scorer.',rosterRole:'rotation',depthTag:'SF2'},
        {slug:'ron_harper',displayName:'Ron Harper',firstName:'Ron',lastName:'Harper',primaryPosition:'PG',secondaryPositions:['SG'],bio:'Veteran backcourt stabilizer for the Bulls.',rosterRole:'starter',depthTag:'PG1'}
      ]
    },
    {
      teamId:'nba_1996_hou',
      city:'Houston',
      name:'Rockets',
      abbreviation:'HOU',
      conference:'West',
      division:'Midwest',
      palette:{primary:'#7e1e2d',secondary:'#f1c26d'},
      players:[
        {slug:'hakeem_olajuwon',displayName:'Hakeem Olajuwon',firstName:'Hakeem',lastName:'Olajuwon',primaryPosition:'C',secondaryPositions:[],bio:'Historic center anchor and one of the defining stars of the era.',rosterRole:'starter',depthTag:'C1'},
        {slug:'clyde_drexler',displayName:'Clyde Drexler',firstName:'Clyde',lastName:'Drexler',primaryPosition:'SG',secondaryPositions:['SF'],bio:'Veteran backcourt star on the Rockets.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'robert_horry',displayName:'Robert Horry',firstName:'Robert',lastName:'Horry',primaryPosition:'PF',secondaryPositions:['SF'],bio:'Stretch forward with big-game utility.',rosterRole:'starter',depthTag:'PF1'},
        {slug:'sam_cassell',displayName:'Sam Cassell',firstName:'Sam',lastName:'Cassell',primaryPosition:'PG',secondaryPositions:[],bio:'Lead guard and creator for Houston.',rosterRole:'rotation',depthTag:'PG1'},
        {slug:'mario_elie',displayName:'Mario Elie',firstName:'Mario',lastName:'Elie',primaryPosition:'SF',secondaryPositions:['SG'],bio:'Battle-tested wing and connective tissue piece.',rosterRole:'starter',depthTag:'SF1'}
      ]
    },
    {
      teamId:'nba_1996_orl',
      city:'Orlando',
      name:'Magic',
      abbreviation:'ORL',
      conference:'East',
      division:'Atlantic',
      palette:{primary:'#2467a4',secondary:'#111111'},
      players:[
        {slug:'shaquille_oneal',displayName:"Shaquille O'Neal",firstName:'Shaquille',lastName:"O'Neal",primaryPosition:'C',secondaryPositions:[],bio:'Dominant interior star and marquee historical draft target.',rosterRole:'starter',depthTag:'C1'},
        {slug:'anfernee_hardaway',displayName:'Anfernee Hardaway',firstName:'Anfernee',lastName:'Hardaway',primaryPosition:'PG',secondaryPositions:['SG'],bio:'Elite perimeter creator for Orlando.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'dennis_scott',displayName:'Dennis Scott',firstName:'Dennis',lastName:'Scott',primaryPosition:'SF',secondaryPositions:['SG'],bio:'Wing shooter and spacing threat.',rosterRole:'starter',depthTag:'SF1'},
        {slug:'nick_anderson',displayName:'Nick Anderson',firstName:'Nick',lastName:'Anderson',primaryPosition:'SG',secondaryPositions:['SF'],bio:'Starting wing scorer for Orlando.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'horace_grant',displayName:'Horace Grant',firstName:'Horace',lastName:'Grant',primaryPosition:'PF',secondaryPositions:['C'],bio:'Physical big man and glass cleaner for Orlando.',rosterRole:'starter',depthTag:'PF1'}
      ]
    },
    {
      teamId:'nba_1996_nyk',
      city:'New York',
      name:'Knicks',
      abbreviation:'NYK',
      conference:'East',
      division:'Atlantic',
      palette:{primary:'#275f9a',secondary:'#d97829'},
      players:[
        {slug:'patrick_ewing',displayName:'Patrick Ewing',firstName:'Patrick',lastName:'Ewing',primaryPosition:'C',secondaryPositions:[],bio:'Franchise centerpiece for the 1995-96 Knicks.',rosterRole:'starter',depthTag:'C1'},
        {slug:'john_starks',displayName:'John Starks',firstName:'John',lastName:'Starks',primaryPosition:'SG',secondaryPositions:[],bio:'Volume-scoring guard for New York.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'charles_oakley',displayName:'Charles Oakley',firstName:'Charles',lastName:'Oakley',primaryPosition:'PF',secondaryPositions:['C'],bio:'Physical frontcourt anchor for the Knicks.',rosterRole:'starter',depthTag:'PF1'},
        {slug:'derek_harper',displayName:'Derek Harper',firstName:'Derek',lastName:'Harper',primaryPosition:'PG',secondaryPositions:[],bio:'Veteran point guard for New York.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'anthony_mason',displayName:'Anthony Mason',firstName:'Anthony',lastName:'Mason',primaryPosition:'SF',secondaryPositions:['PF'],bio:'Point-forward glue piece and rugged defender.',rosterRole:'starter',depthTag:'SF1'}
      ]
    },
    {
      teamId:'nba_1996_uta',
      city:'Utah',
      name:'Jazz',
      abbreviation:'UTA',
      conference:'West',
      division:'Midwest',
      palette:{primary:'#5f2f63',secondary:'#1d6e5d'},
      players:[
        {slug:'karl_malone',displayName:'Karl Malone',firstName:'Karl',lastName:'Malone',primaryPosition:'PF',secondaryPositions:['C'],bio:'High-end historical fantasy cornerstone from the 1995-96 Jazz.',rosterRole:'starter',depthTag:'PF1'},
        {slug:'john_stockton',displayName:'John Stockton',firstName:'John',lastName:'Stockton',primaryPosition:'PG',secondaryPositions:[],bio:'Historic pass-first floor general for the Jazz.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'jeff_hornacek',displayName:'Jeff Hornacek',firstName:'Jeff',lastName:'Hornacek',primaryPosition:'SG',secondaryPositions:[],bio:'Efficient shooting guard for Utah.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'bryon_russell',displayName:'Bryon Russell',firstName:'Bryon',lastName:'Russell',primaryPosition:'SF',secondaryPositions:['SG'],bio:'Wing defender and rotation scorer for Utah.',rosterRole:'starter',depthTag:'SF1'},
        {slug:'greg_ostertag',displayName:'Greg Ostertag',firstName:'Greg',lastName:'Ostertag',primaryPosition:'C',secondaryPositions:[],bio:'Massive interior body and rim deterrent for Utah.',rosterRole:'rotation',depthTag:'C2'}
      ]
    },
    {
      teamId:'nba_1996_sea',
      city:'Seattle',
      name:'SuperSonics',
      abbreviation:'SEA',
      conference:'West',
      division:'Pacific',
      palette:{primary:'#1e744f',secondary:'#d2a84f'},
      players:[
        {slug:'gary_payton',displayName:'Gary Payton',firstName:'Gary',lastName:'Payton',primaryPosition:'PG',secondaryPositions:['SG'],bio:'Defensive menace and lead creator for Seattle.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'shawn_kemp',displayName:'Shawn Kemp',firstName:'Shawn',lastName:'Kemp',primaryPosition:'PF',secondaryPositions:['C'],bio:'High-flying star big and one of the most electric players in the pack.',rosterRole:'starter',depthTag:'PF1'},
        {slug:'detlef_schrempf',displayName:'Detlef Schrempf',firstName:'Detlef',lastName:'Schrempf',primaryPosition:'SF',secondaryPositions:['PF'],bio:'Versatile forward and secondary scoring hub.',rosterRole:'starter',depthTag:'SF1'},
        {slug:'hersey_hawkins',displayName:'Hersey Hawkins',firstName:'Hersey',lastName:'Hawkins',primaryPosition:'SG',secondaryPositions:[],bio:'Steady perimeter scorer for Seattle.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'sam_perkins',displayName:'Sam Perkins',firstName:'Sam',lastName:'Perkins',primaryPosition:'C',secondaryPositions:['PF'],bio:'Floor-spacing frontcourt veteran with range.',rosterRole:'starter',depthTag:'C1'}
      ]
    },
    {
      teamId:'nba_1996_sas',
      city:'San Antonio',
      name:'Spurs',
      abbreviation:'SAS',
      conference:'West',
      division:'Midwest',
      palette:{primary:'#a7a9ac',secondary:'#111111'},
      players:[
        {slug:'david_robinson',displayName:'David Robinson',firstName:'David',lastName:'Robinson',primaryPosition:'C',secondaryPositions:[],bio:'MVP-level interior star and elite fantasy anchor.',rosterRole:'starter',depthTag:'C1'},
        {slug:'sean_elliott',displayName:'Sean Elliott',firstName:'Sean',lastName:'Elliott',primaryPosition:'SF',secondaryPositions:['SG'],bio:'Primary wing scorer for San Antonio.',rosterRole:'starter',depthTag:'SF1'},
        {slug:'avery_johnson',displayName:'Avery Johnson',firstName:'Avery',lastName:'Johnson',primaryPosition:'PG',secondaryPositions:[],bio:'Lead table-setter for the Spurs.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'vinny_del_negro',displayName:'Vinny Del Negro',firstName:'Vinny',lastName:'Del Negro',primaryPosition:'SG',secondaryPositions:[],bio:'Starting guard and spacing piece for San Antonio.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'chuck_person',displayName:'Chuck Person',firstName:'Chuck',lastName:'Person',primaryPosition:'PF',secondaryPositions:['SF'],bio:'Scoring forward and veteran microwave option.',rosterRole:'rotation',depthTag:'PF1'}
      ]
    },
    {
      teamId:'nba_1996_lal',
      city:'Los Angeles',
      name:'Lakers',
      abbreviation:'LAL',
      conference:'West',
      division:'Pacific',
      palette:{primary:'#5f2d84',secondary:'#f0c54b'},
      players:[
        {slug:'cedric_ceballos',displayName:'Cedric Ceballos',firstName:'Cedric',lastName:'Ceballos',primaryPosition:'SF',secondaryPositions:['PF'],bio:'Leading scorer for the mid-90s Lakers.',rosterRole:'starter',depthTag:'SF1'},
        {slug:'nick_van_exel',displayName:'Nick Van Exel',firstName:'Nick',lastName:'Van Exel',primaryPosition:'PG',secondaryPositions:[],bio:'Dynamic lefty creator and pace-pusher.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'vlade_divac',displayName:'Vlade Divac',firstName:'Vlade',lastName:'Divac',primaryPosition:'C',secondaryPositions:[],bio:'Playmaking center and interior hub.',rosterRole:'starter',depthTag:'C1'},
        {slug:'eddie_jones',displayName:'Eddie Jones',firstName:'Eddie',lastName:'Jones',primaryPosition:'SG',secondaryPositions:['SF'],bio:'Young two-way guard on the rise.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'byron_scott',displayName:'Byron Scott',firstName:'Byron',lastName:'Scott',primaryPosition:'SG',secondaryPositions:[],bio:'Veteran guard holding down the backcourt rotation.',rosterRole:'rotation',depthTag:'SG2'}
      ]
    },
    {
      teamId:'nba_1996_ind',
      city:'Indiana',
      name:'Pacers',
      abbreviation:'IND',
      conference:'East',
      division:'Central',
      palette:{primary:'#173b74',secondary:'#f2c94c'},
      players:[
        {slug:'reggie_miller',displayName:'Reggie Miller',firstName:'Reggie',lastName:'Miller',primaryPosition:'SG',secondaryPositions:['SF'],bio:'Historic movement shooter and endgame killer.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'rik_smits',displayName:'Rik Smits',firstName:'Rik',lastName:'Smits',primaryPosition:'C',secondaryPositions:[],bio:'Skilled seven-footer and half-court scorer.',rosterRole:'starter',depthTag:'C1'},
        {slug:'mark_jackson',displayName:'Mark Jackson',firstName:'Mark',lastName:'Jackson',primaryPosition:'PG',secondaryPositions:[],bio:'Deliberate lead guard and assist engine.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'dale_davis',displayName:'Dale Davis',firstName:'Dale',lastName:'Davis',primaryPosition:'PF',secondaryPositions:['C'],bio:'Rugged rebounder and defensive big for Indiana.',rosterRole:'starter',depthTag:'PF1'},
        {slug:'derrick_mckey',displayName:'Derrick McKey',firstName:'Derrick',lastName:'McKey',primaryPosition:'SF',secondaryPositions:['PF'],bio:'Swiss-army wing and defensive connector.',rosterRole:'starter',depthTag:'SF1'}
      ]
    },
    {
      teamId:'nba_1996_atl',
      city:'Atlanta',
      name:'Hawks',
      abbreviation:'ATL',
      conference:'East',
      division:'Central',
      palette:{primary:'#a11f31',secondary:'#d9c2a3'},
      players:[
        {slug:'dikembe_mutombo',displayName:'Dikembe Mutombo',firstName:'Dikembe',lastName:'Mutombo',primaryPosition:'C',secondaryPositions:[],bio:'Paint eraser and elite historical blocks source.',rosterRole:'starter',depthTag:'C1'},
        {slug:'steve_smith',displayName:'Steve Smith',firstName:'Steve',lastName:'Smith',primaryPosition:'SG',secondaryPositions:['SF'],bio:'Lead scoring wing for Atlanta.',rosterRole:'starter',depthTag:'SG1'},
        {slug:'mookie_blaylock',displayName:'Mookie Blaylock',firstName:'Mookie',lastName:'Blaylock',primaryPosition:'PG',secondaryPositions:[],bio:'Ball-hawking point guard and table setter.',rosterRole:'starter',depthTag:'PG1'},
        {slug:'christian_laettner',displayName:'Christian Laettner',firstName:'Christian',lastName:'Laettner',primaryPosition:'PF',secondaryPositions:['C'],bio:'Skilled scoring big in Atlanta\'s frontcourt.',rosterRole:'starter',depthTag:'PF1'},
        {slug:'stacey_augmon',displayName:'Stacey Augmon',firstName:'Stacey',lastName:'Augmon',primaryPosition:'SF',secondaryPositions:['SG'],bio:'Athletic wing defender and transition finisher.',rosterRole:'starter',depthTag:'SF1'}
      ]
    }
  ];

  const teams=TEAM_DEFINITIONS.map(createTeam);
  const players=TEAM_DEFINITIONS.flatMap(team=>team.players.map(player=>createPlayer(team, player)));
  const rosterSnapshots=TEAM_DEFINITIONS.flatMap(team=>team.players.map(player=>createRosterSnapshot(team, player)));

  const schedule=[
    {gameId:'nba_1996_game_0001',seasonId:'nba_1996_historic',gameDate:'1995-11-03',homeTeamId:'nba_1996_chi',awayTeamId:'nba_1996_nyk',isRegularSeason:true,gameNumber:1,weekLabel:'Week 1',dayLabel:'Day 1'},
    {gameId:'nba_1996_game_0002',seasonId:'nba_1996_historic',gameDate:'1995-11-03',homeTeamId:'nba_1996_hou',awayTeamId:'nba_1996_uta',isRegularSeason:true,gameNumber:1,weekLabel:'Week 1',dayLabel:'Day 1'},
    {gameId:'nba_1996_game_0003',seasonId:'nba_1996_historic',gameDate:'1995-11-04',homeTeamId:'nba_1996_orl',awayTeamId:'nba_1996_chi',isRegularSeason:true,gameNumber:2,weekLabel:'Week 1',dayLabel:'Day 2'},
    {gameId:'nba_1996_game_0004',seasonId:'nba_1996_historic',gameDate:'1995-11-04',homeTeamId:'nba_1996_sea',awayTeamId:'nba_1996_sas',isRegularSeason:true,gameNumber:2,weekLabel:'Week 1',dayLabel:'Day 2'},
    {gameId:'nba_1996_game_0005',seasonId:'nba_1996_historic',gameDate:'1995-11-05',homeTeamId:'nba_1996_ind',awayTeamId:'nba_1996_lal',isRegularSeason:true,gameNumber:3,weekLabel:'Week 1',dayLabel:'Day 3'},
    {gameId:'nba_1996_game_0006',seasonId:'nba_1996_historic',gameDate:'1995-11-05',homeTeamId:'nba_1996_atl',awayTeamId:'nba_1996_orl',isRegularSeason:true,gameNumber:3,weekLabel:'Week 1',dayLabel:'Day 3'},
    {gameId:'nba_1996_game_0007',seasonId:'nba_1996_historic',gameDate:'1995-11-06',homeTeamId:'nba_1996_ind',awayTeamId:'nba_1996_chi',isRegularSeason:true,gameNumber:4,weekLabel:'Week 1',dayLabel:'Day 4'},
    {gameId:'nba_1996_game_0008',seasonId:'nba_1996_historic',gameDate:'1995-11-06',homeTeamId:'nba_1996_sea',awayTeamId:'nba_1996_uta',isRegularSeason:true,gameNumber:4,weekLabel:'Week 1',dayLabel:'Day 4'}
  ];

  const games=[
    {gameId:'nba_1996_game_0001',seasonId:'nba_1996_historic',status:'final',homeScore:107,awayScore:92,winnerTeamId:'nba_1996_chi',loserTeamId:'nba_1996_nyk'},
    {gameId:'nba_1996_game_0002',seasonId:'nba_1996_historic',status:'final',homeScore:101,awayScore:96,winnerTeamId:'nba_1996_hou',loserTeamId:'nba_1996_uta'},
    {gameId:'nba_1996_game_0003',seasonId:'nba_1996_historic',status:'final',homeScore:103,awayScore:109,winnerTeamId:'nba_1996_chi',loserTeamId:'nba_1996_orl'},
    {gameId:'nba_1996_game_0004',seasonId:'nba_1996_historic',status:'final',homeScore:104,awayScore:96,winnerTeamId:'nba_1996_sea',loserTeamId:'nba_1996_sas'},
    {gameId:'nba_1996_game_0005',seasonId:'nba_1996_historic',status:'final',homeScore:100,awayScore:98,winnerTeamId:'nba_1996_ind',loserTeamId:'nba_1996_lal'},
    {gameId:'nba_1996_game_0006',seasonId:'nba_1996_historic',status:'final',homeScore:94,awayScore:99,winnerTeamId:'nba_1996_orl',loserTeamId:'nba_1996_atl'},
    {gameId:'nba_1996_game_0007',seasonId:'nba_1996_historic',status:'final',homeScore:95,awayScore:108,winnerTeamId:'nba_1996_chi',loserTeamId:'nba_1996_ind'},
    {gameId:'nba_1996_game_0008',seasonId:'nba_1996_historic',status:'final',homeScore:97,awayScore:93,winnerTeamId:'nba_1996_sea',loserTeamId:'nba_1996_uta'}
  ];

  const playerGameStats=[
    {playerId:'nba_1996_michael_jordan',gameId:'nba_1996_game_0001',seasonId:'nba_1996_historic',teamId:'nba_1996_chi',opponentTeamId:'nba_1996_nyk',minutes:39,points:31,rebounds:6,assists:4,steals:2,blocks:1,turnovers:3,threePointersMade:1,fgm:11,fga:24,ftm:8,fta:10},
    {playerId:'nba_1996_scottie_pippen',gameId:'nba_1996_game_0001',seasonId:'nba_1996_historic',teamId:'nba_1996_chi',opponentTeamId:'nba_1996_nyk',minutes:37,points:19,rebounds:8,assists:5,steals:3,blocks:1,turnovers:2,threePointersMade:2,fgm:7,fga:16,ftm:3,fta:4},
    {playerId:'nba_1996_patrick_ewing',gameId:'nba_1996_game_0001',seasonId:'nba_1996_historic',teamId:'nba_1996_nyk',opponentTeamId:'nba_1996_chi',minutes:36,points:24,rebounds:10,assists:2,steals:1,blocks:2,turnovers:4,threePointersMade:0,fgm:9,fga:18,ftm:6,fta:8},
    {playerId:'nba_1996_john_starks',gameId:'nba_1996_game_0001',seasonId:'nba_1996_historic',teamId:'nba_1996_nyk',opponentTeamId:'nba_1996_chi',minutes:34,points:17,rebounds:3,assists:4,steals:1,blocks:0,turnovers:2,threePointersMade:3,fgm:6,fga:15,ftm:2,fta:2},
    {playerId:'nba_1996_hakeem_olajuwon',gameId:'nba_1996_game_0002',seasonId:'nba_1996_historic',teamId:'nba_1996_hou',opponentTeamId:'nba_1996_uta',minutes:38,points:27,rebounds:11,assists:3,steals:2,blocks:3,turnovers:2,threePointersMade:0,fgm:10,fga:21,ftm:7,fta:9},
    {playerId:'nba_1996_clyde_drexler',gameId:'nba_1996_game_0002',seasonId:'nba_1996_historic',teamId:'nba_1996_hou',opponentTeamId:'nba_1996_uta',minutes:36,points:22,rebounds:6,assists:5,steals:2,blocks:1,turnovers:3,threePointersMade:1,fgm:8,fga:17,ftm:5,fta:6},
    {playerId:'nba_1996_karl_malone',gameId:'nba_1996_game_0002',seasonId:'nba_1996_historic',teamId:'nba_1996_uta',opponentTeamId:'nba_1996_hou',minutes:40,points:25,rebounds:9,assists:4,steals:1,blocks:1,turnovers:3,threePointersMade:0,fgm:9,fga:20,ftm:7,fta:8},
    {playerId:'nba_1996_john_stockton',gameId:'nba_1996_game_0002',seasonId:'nba_1996_historic',teamId:'nba_1996_uta',opponentTeamId:'nba_1996_hou',minutes:38,points:14,rebounds:3,assists:12,steals:2,blocks:0,turnovers:2,threePointersMade:1,fgm:5,fga:11,ftm:3,fta:4},
    {playerId:'nba_1996_shaquille_oneal',gameId:'nba_1996_game_0003',seasonId:'nba_1996_historic',teamId:'nba_1996_orl',opponentTeamId:'nba_1996_chi',minutes:38,points:29,rebounds:12,assists:2,steals:1,blocks:2,turnovers:4,threePointersMade:0,fgm:11,fga:19,ftm:7,fta:11},
    {playerId:'nba_1996_anfernee_hardaway',gameId:'nba_1996_game_0003',seasonId:'nba_1996_historic',teamId:'nba_1996_orl',opponentTeamId:'nba_1996_chi',minutes:37,points:24,rebounds:4,assists:7,steals:2,blocks:1,turnovers:3,threePointersMade:1,fgm:9,fga:18,ftm:5,fta:6},
    {playerId:'nba_1996_michael_jordan',gameId:'nba_1996_game_0003',seasonId:'nba_1996_historic',teamId:'nba_1996_chi',opponentTeamId:'nba_1996_orl',minutes:41,points:34,rebounds:5,assists:5,steals:2,blocks:1,turnovers:2,threePointersMade:2,fgm:12,fga:23,ftm:8,fta:9},
    {playerId:'nba_1996_gary_payton',gameId:'nba_1996_game_0004',seasonId:'nba_1996_historic',teamId:'nba_1996_sea',opponentTeamId:'nba_1996_sas',minutes:39,points:21,rebounds:5,assists:8,steals:3,blocks:0,turnovers:2,threePointersMade:1,fgm:8,fga:17,ftm:4,fta:5},
    {playerId:'nba_1996_shawn_kemp',gameId:'nba_1996_game_0004',seasonId:'nba_1996_historic',teamId:'nba_1996_sea',opponentTeamId:'nba_1996_sas',minutes:36,points:24,rebounds:11,assists:2,steals:1,blocks:2,turnovers:3,threePointersMade:0,fgm:10,fga:18,ftm:4,fta:6},
    {playerId:'nba_1996_david_robinson',gameId:'nba_1996_game_0004',seasonId:'nba_1996_historic',teamId:'nba_1996_sas',opponentTeamId:'nba_1996_sea',minutes:38,points:26,rebounds:10,assists:3,steals:1,blocks:4,turnovers:2,threePointersMade:0,fgm:10,fga:19,ftm:6,fta:8},
    {playerId:'nba_1996_reggie_miller',gameId:'nba_1996_game_0005',seasonId:'nba_1996_historic',teamId:'nba_1996_ind',opponentTeamId:'nba_1996_lal',minutes:35,points:27,rebounds:3,assists:4,steals:1,blocks:0,turnovers:2,threePointersMade:4,fgm:9,fga:18,ftm:5,fta:5},
    {playerId:'nba_1996_rik_smits',gameId:'nba_1996_game_0005',seasonId:'nba_1996_historic',teamId:'nba_1996_ind',opponentTeamId:'nba_1996_lal',minutes:33,points:19,rebounds:8,assists:2,steals:0,blocks:2,turnovers:2,threePointersMade:0,fgm:8,fga:15,ftm:3,fta:4},
    {playerId:'nba_1996_cedric_ceballos',gameId:'nba_1996_game_0005',seasonId:'nba_1996_historic',teamId:'nba_1996_lal',opponentTeamId:'nba_1996_ind',minutes:37,points:24,rebounds:7,assists:3,steals:1,blocks:0,turnovers:2,threePointersMade:1,fgm:9,fga:19,ftm:5,fta:6},
    {playerId:'nba_1996_nick_van_exel',gameId:'nba_1996_game_0005',seasonId:'nba_1996_historic',teamId:'nba_1996_lal',opponentTeamId:'nba_1996_ind',minutes:36,points:18,rebounds:3,assists:8,steals:1,blocks:0,turnovers:3,threePointersMade:2,fgm:7,fga:16,ftm:2,fta:3},
    {playerId:'nba_1996_dikembe_mutombo',gameId:'nba_1996_game_0006',seasonId:'nba_1996_historic',teamId:'nba_1996_atl',opponentTeamId:'nba_1996_orl',minutes:37,points:15,rebounds:14,assists:1,steals:1,blocks:4,turnovers:2,threePointersMade:0,fgm:6,fga:10,ftm:3,fta:5},
    {playerId:'nba_1996_steve_smith',gameId:'nba_1996_game_0006',seasonId:'nba_1996_historic',teamId:'nba_1996_atl',opponentTeamId:'nba_1996_orl',minutes:38,points:22,rebounds:4,assists:4,steals:1,blocks:0,turnovers:2,threePointersMade:3,fgm:8,fga:17,ftm:3,fta:4},
    {playerId:'nba_1996_shaquille_oneal',gameId:'nba_1996_game_0006',seasonId:'nba_1996_historic',teamId:'nba_1996_orl',opponentTeamId:'nba_1996_atl',minutes:39,points:31,rebounds:13,assists:2,steals:1,blocks:3,turnovers:4,threePointersMade:0,fgm:12,fga:20,ftm:7,fta:12},
    {playerId:'nba_1996_reggie_miller',gameId:'nba_1996_game_0007',seasonId:'nba_1996_historic',teamId:'nba_1996_ind',opponentTeamId:'nba_1996_chi',minutes:37,points:23,rebounds:2,assists:3,steals:1,blocks:0,turnovers:2,threePointersMade:4,fgm:7,fga:15,ftm:5,fta:5},
    {playerId:'nba_1996_michael_jordan',gameId:'nba_1996_game_0007',seasonId:'nba_1996_historic',teamId:'nba_1996_chi',opponentTeamId:'nba_1996_ind',minutes:40,points:33,rebounds:6,assists:4,steals:2,blocks:1,turnovers:2,threePointersMade:1,fgm:13,fga:25,ftm:6,fta:8},
    {playerId:'nba_1996_gary_payton',gameId:'nba_1996_game_0008',seasonId:'nba_1996_historic',teamId:'nba_1996_sea',opponentTeamId:'nba_1996_uta',minutes:38,points:18,rebounds:4,assists:10,steals:2,blocks:0,turnovers:2,threePointersMade:1,fgm:7,fga:15,ftm:3,fta:4},
    {playerId:'nba_1996_shawn_kemp',gameId:'nba_1996_game_0008',seasonId:'nba_1996_historic',teamId:'nba_1996_sea',opponentTeamId:'nba_1996_uta',minutes:35,points:22,rebounds:9,assists:2,steals:1,blocks:2,turnovers:3,threePointersMade:0,fgm:9,fga:17,ftm:4,fta:6},
    {playerId:'nba_1996_karl_malone',gameId:'nba_1996_game_0008',seasonId:'nba_1996_historic',teamId:'nba_1996_uta',opponentTeamId:'nba_1996_sea',minutes:39,points:28,rebounds:10,assists:3,steals:1,blocks:1,turnovers:3,threePointersMade:0,fgm:10,fga:22,ftm:8,fta:9}
  ];

  const SAMPLE_1995_96_BUNDLE={
    manifest:{
      packId:'nba_1996_full_season_v1',
      schemaVersion:1,
      canonicalModelVersion:1,
      sport:'nba',
      league:'nba',
      seasonId:'nba_1996_historic',
      seasonLabel:'1995-96 NBA Historic Season',
      seasonType:'historical_pack',
      isHistorical:true,
      era:'1990s',
      version:1,
      status:'concept',
      sourceProfile:'historical_curated',
      supportedModes:['real_season','historical_draft','single_player_season'],
      defaultEntryMode:'real_season',
      focusTeamId:'nba_1996_chi',
      subtitle:'Play the real season or draft the era.',
      description:'An expanded playable 1995-96 NBA dev slice with a broader historical player pool and multiple featured franchise paths.',
      tagline:'Rewrite the greatest regular season ever.',
      eraTags:['1990s','Jordan Era','Historic Season'],
      packTags:['historical-dev-slice','single-player','historical-draft','featured-pack'],
      playerPoolType:'full_season_player_pool',
      draftModes:['snake'],
      challengeProfile:'featured_team_plus_open_draft',
      contentFiles:{
        season:'season.json',
        teams:'teams.json',
        players:'players.json',
        rosterSnapshots:'roster_snapshots.json',
        schedule:'schedule.json',
        games:'games.json',
        playerGameStats:'player_game_stats.json',
        packChallenges:'optional/pack_challenges.json',
        presentation:'optional/presentation.json',
        summaries:'optional/summaries.json'
      },
      provenance:{
        sourceProfile:'historical_curated',
        curationOwner:'RosterBate',
        reviewStatus:'draft',
        importNotes:'Expanded code fixture for validator, importer, and localhost historical season boot development.'
      },
      notes:[
        'Expanded 10-team 1995-96 dev slice for historical fantasy draft validation.',
        'Use the Historical Pack Lab team selector to swap the default franchise path.'
      ],
      createdAt:'2026-04-17T00:00:00Z',
      updatedAt:'2026-04-17T00:00:00Z'
    },
    season:{
      seasonId:'nba_1996_historic',
      sport:'nba',
      league:'nba',
      label:'1995-96 NBA Historic Season',
      startDate:'1995-11-03',
      endDate:'1996-04-21',
      seasonType:'historical_pack',
      isHistorical:true,
      eraTags:['1990s','Jordan Era','Historic Season'],
      notes:[
        'Expanded dev-slice season object.',
        'Supports both real-season and historical-draft paths while the importer is still fixture-backed.'
      ]
    },
    teams:teams,
    players:players,
    rosterSnapshots:rosterSnapshots,
    schedule:schedule,
    games:games,
    playerGameStats:playerGameStats,
    packChallenges:{
      packId:'nba_1996_full_season_v1',
      version:1,
      challengeGroups:[
        {groupId:'real_season_paths',label:'Play The Real Season',mode:'real_season'},
        {groupId:'draft_the_era_paths',label:'Draft The Era',mode:'historical_draft'}
      ],
      challenges:[
        {
          challengeId:'bulls_72_wins',
          mode:'real_season',
          path:'bulls_featured_path',
          title:'Match 72 Wins',
          description:'Finish the season with at least 72 wins.',
          type:'season_wins_min',
          target:72,
          evaluation:'season_end',
          reward:'72-Win Standard',
          required:false,
          featured:true
        },
        {
          challengeId:'open_team_above_500',
          mode:'real_season',
          path:'open_team_path',
          title:'Flip The Season',
          description:'Choose any included team and finish above .500.',
          type:'season_finish_record_min',
          target:{wins:42},
          evaluation:'season_end',
          reward:'Turnaround Season',
          required:false,
          featured:false
        },
        {
          challengeId:'draft_era_60_wins',
          mode:'historical_draft',
          path:'alternate_history_success',
          title:'Build A 60-Win Team',
          description:'Complete a historical fantasy draft and finish with at least 60 wins.',
          type:'season_wins_min',
          target:60,
          evaluation:'season_end',
          reward:'Alternate-History Contender',
          required:false,
          featured:true
        }
      ]
    },
    presentation:{
      heroTitle:'1995-96 NBA Historic Season',
      heroSubtitle:'Play the real season or draft the era.',
      featuredTeamId:'nba_1996_chi',
      featuredStars:[
        'nba_1996_michael_jordan',
        'nba_1996_hakeem_olajuwon',
        'nba_1996_shaquille_oneal',
        'nba_1996_gary_payton',
        'nba_1996_david_robinson'
      ],
      artDirection:{
        heroTone:'dynasty',
        primaryPalette:['#7a1821','#111111','#f1c26d'],
        backgroundStyle:'historic_arena_spotlight'
      },
      entryModes:[
        {mode:'real_season',label:'Play The Real Season',description:'Step into the 1995-96 season with historical rosters intact.'},
        {mode:'historical_draft',label:'Draft The Era',description:'Redraft the included 1995-96 player pool and build an alternate-history league.'}
      ]
    },
    summaries:{
      packSummary:'The 1995-96 NBA season is the flagship historical universe for RosterBate, combining full-season authenticity with alternate-history fantasy draft potential. This expanded dev slice now supports multiple franchise entry points before the full-pack loader lands.',
      featuredStorylines:[
        'The 72-win Bulls chase',
        'A broader historical fantasy draft sandbox',
        'Historic stars across a deeper 1995-96 league slice'
      ],
      teamSpotlights:[
        {teamId:'nba_1996_chi',summary:'Chicago enters as the featured path and the benchmark every historical run will be measured against.'},
        {teamId:'nba_1996_hou',summary:'Houston anchors the elite center fantasy of the era behind Hakeem Olajuwon.'},
        {teamId:'nba_1996_sea',summary:'Seattle gives the pack a full-speed alternative built around Payton and Kemp.'},
        {teamId:'nba_1996_sas',summary:'San Antonio offers a top-heavy superstar path through David Robinson.'},
        {teamId:'nba_1996_ind',summary:'Indiana brings a balanced East contender core built around Reggie Miller.'}
      ],
      modeSummaries:[
        {mode:'real_season',summary:'Keep history intact and see whether you can match or beat the era-defining outcomes.'},
        {mode:'historical_draft',summary:'Remix the included 1995-96 league slice and discover what the era looks like with custom rosters.'}
      ]
    }
  };

  const api={
    fixtureIds:['nba_1996_full_season_v1'],
    getSample1995_96Bundle:function(){
      return deepClone(SAMPLE_1995_96_BUNDLE);
    },
    getFixtureById:function(packId){
      if(packId==='nba_1996_full_season_v1') return deepClone(SAMPLE_1995_96_BUNDLE);
      return null;
    }
  };

  global.RosterBateHistoricalPackFixtures=api;

  if(typeof module!=='undefined' && module.exports){
    module.exports=api;
  }
})(typeof window!=='undefined' ? window : globalThis);
