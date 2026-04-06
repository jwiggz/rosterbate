(function(){
  const STORAGE_KEY = 'rosterbateSelectedSport';
  const TEAM_COLORS = {
    NBA:{ATL:'#C1272D',BOS:'#007A33',BKN:'#000000',CHA:'#00788C',CHI:'#CE1141',CLE:'#860038',DAL:'#00538C',DEN:'#0E2240',DET:'#C8102E',GSW:'#1D428A',HOU:'#CE1141',IND:'#002D62',LAC:'#C8102E',LAL:'#552583',MEM:'#5D76A9',MIA:'#98002E',MIL:'#00471B',MIN:'#0C2340',NOP:'#0C2340',NYK:'#F58426',OKC:'#007AC1',ORL:'#0077C0',PHI:'#006BB6',PHX:'#1D1160',POR:'#E03A3E',SAC:'#5A2D81',SAS:'#C4CED4',TOR:'#CE1141',UTA:'#002B5C',WAS:'#002B5C'},
    NFL:{ARI:'#97233F',ATL:'#A71930',BAL:'#241773',BUF:'#00338D',CAR:'#0085CA',CHI:'#0B162A',CIN:'#FB4F14',CLE:'#311D00',DAL:'#003594',DEN:'#FB4F14',DET:'#0076B6',GB:'#203731',HOU:'#03202F',IND:'#002C5F',JAX:'#006778',KC:'#E31837',LV:'#000000',LAC:'#0080C6',LAR:'#003594',MIA:'#008E97',MIN:'#4F2683',NE:'#002244',NO:'#D3BC8D',NYG:'#0B2265',NYJ:'#125740',PHI:'#004C54',PIT:'#FFB612',SEA:'#002244',SF:'#AA0000',TB:'#D50A0A',TEN:'#0C2340',WAS:'#5A1414'},
    MLB:{ARI:'#A71930',ATL:'#CE1141',BAL:'#DF4601',BOS:'#BD3039',CHC:'#0E3386',CWS:'#27251F',CIN:'#C6011F',CLE:'#E31937',COL:'#33006F',DET:'#0C2340',HOU:'#EB6E1F',KC:'#004687',LAA:'#BA0021',LAD:'#005A9C',MIA:'#00A3E0',MIL:'#12284B',MIN:'#002B5C',NYM:'#002D72',NYY:'#0C2340',OAK:'#003831',PHI:'#E81828',PIT:'#FDB827',SD:'#2F241D',SEA:'#0C2C56',SF:'#FD5A1E',STL:'#C41E3A',TB:'#092C5C',TEX:'#003278',TOR:'#134A8E',WSH:'#AB0003'}
  };

  const SPORT_CONFIG = {
    nba:{
      key:'nba',label:'NBA',icon:'\u{1F3C0}',leagueLabel:'Pro Hoops Season',defaultLeagueSize:10,defaultRounds:13,defaultScoring:'h2h_cat',defaultFormat:'snake',timer:90,playerCount:240,
      filters:['ALL','PG','SG','SF','PF','C'],waiverPositions:['ALL','PG','SG','SF','PF','C'],
      starterSlots:['PG','SG','SF','PF','C','G','F','UTIL'],myTeamSlots:['PG','SG','SF','PF','C','G','F','UTIL','UTIL','BN','BN','BN','BN','BN','BN','IR'],
      commissionerScoringType:'H2H Points',
scoringInfo:{h2h_cat:'Win/lose 9 stat categories weekly: PTS, REB, AST, STL, BLK, TO, FG%, FT%, 3PM.',h2h_pts:'Weekly matchup by total fantasy pts. PTS=1, REB=1.2, AST=1.5, STL=3, BLK=3, TO=-1, 3PM=0.5.',money_ball:'Points scoring with one lockable game per starting position each week. If you do not lock a slot, its final game of the week counts.',roto:'Season-long ranking in each stat category. Best cumulative rank total wins.',points:'Pure accumulation. Best total fantasy points all season wins.'},
      teamCodes:['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS']
    },
    nfl:{
      key:'nfl',label:'NFL',icon:'\u{1F3C8}',leagueLabel:'Pro Football Season',defaultLeagueSize:12,defaultRounds:16,defaultScoring:'h2h_pts',defaultFormat:'snake',timer:90,playerCount:300,
      filters:['ALL','QB','RB','WR','TE','K','DST'],waiverPositions:['ALL','QB','RB','WR','TE','K','DST'],
      starterSlots:['QB','RB','RB','WR','WR','TE','FLEX','K','DST'],myTeamSlots:['QB','RB','RB','WR','WR','TE','FLEX','K','DST','BN','BN','BN','BN','BN','BN','BN','BN','BN'],
      commissionerScoringType:'H2H Points',
scoringInfo:{h2h_cat:'Standard NFL leagues use points scoring. Category play is disabled for football.',h2h_pts:'Standard NFL scoring: Pass Yds /25, Pass TD 4, INT -2, Rush/Rec Yds /10, Rec 1, Rush/Rec TD 6, FG 3, XP 1, DST plays by stops.',money_ball:'Points scoring with one lockable game per starting position each week. If you do not lock a slot, its final game of the week counts.',roto:'Season-long ranking by cumulative fantasy points.',points:'Straight cumulative fantasy points using standard NFL scoring.'},
      teamCodes:['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LV','LAC','LAR','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS']
    },
    mlb:{
      key:'mlb',label:'MLB',icon:'\u{26BE}',leagueLabel:'Pro Baseball Season',defaultLeagueSize:10,defaultRounds:20,defaultScoring:'points',defaultFormat:'snake',timer:90,playerCount:320,
      filters:['ALL','C','1B','2B','3B','SS','OF','P','SP','RP'],waiverPositions:['ALL','C','1B','2B','3B','SS','OF','P','SP','RP'],
      starterSlots:['C','1B','2B','3B','SS','OF','OF','OF','UTIL','P','P','P','P','P','P'],myTeamSlots:['C','1B','2B','3B','SS','OF','OF','OF','UTIL','P','P','P','P','P','P','BN','BN','BN','IL','IL','IL'],
      commissionerScoringType:'Points',
scoringInfo:{h2h_cat:'MLB defaults to points here. Categories can be layered in later.',h2h_pts:'Head-to-head points using hitter and pitcher events across the week.',money_ball:'Points scoring with one lockable game per starting position each week. If you do not lock a slot, its final game of the week counts.',roto:'Season-long ranking by cumulative points for now.',points:'Primary MLB default: Single 1, Double 2, Triple 3, HR 4, RBI 1, Run 1, BB 1, SB 2, IP 3, SO 1, Win 5, Save 5, ER -2.'},
      teamCodes:['ARI','ATL','BAL','BOS','CHC','CWS','CIN','CLE','COL','DET','HOU','KC','LAA','LAD','MIA','MIL','MIN','NYM','NYY','OAK','PHI','PIT','SD','SEA','SF','STL','TB','TEX','TOR','WSH']
    }
  };
  const SCORING_LABELS = {
    nba:{PTS:'Points',REB:'Rebounds',AST:'Assists',STL:'Steals',BLK:'Blocks',TO:'Turnovers','3PM':'3-Pointers Made',FGM:'Field Goals Made',FGA:'Field Goals Attempted',FTM:'Free Throws Made',FTA:'Free Throws Attempted'},
    nfl:{PASS_YDS:'Passing Yards',PASS_TD:'Passing TD',INT:'Interceptions Thrown',RUSH_YDS:'Rushing Yards',RUSH_TD:'Rushing TD',REC:'Receptions',REC_YDS:'Receiving Yards',REC_TD:'Receiving TD',FUM:'Fumbles Lost',FG:'Field Goals Made',XP:'Extra Points Made',SACK:'Defense Sacks',DEF_TO:'Defense Takeaways',DEF_TD:'Defense TD'},
    mlb:{SINGLE:'Singles',DOUBLE:'Doubles',TRIPLE:'Triples',HR:'Home Runs',RBI:'Runs Batted In',RUN:'Runs Scored',BB:'Walks',SB:'Stolen Bases',IP:'Innings Pitched',SO:'Strikeouts',W:'Wins',SV:'Saves',ER:'Earned Runs'}
  };
  const POSITION_LABELS = {
    nba:{PG:'Point Guard (PG)',SG:'Shooting Guard (SG)',SF:'Small Forward (SF)',PF:'Power Forward (PF)',C:'Center (C)',G:'Guard (G)',F:'Forward (F)',UTIL:'Utility (UTIL)',BE:'Bench (BE)',IR:'Injured Reserve (IR)'},
    nfl:{QB:'Quarterback (QB)',RB:'Running Back (RB)',WR:'Wide Receiver (WR)',TE:'Tight End (TE)',FLEX:'Flex (RB/WR/TE)',K:'Kicker (K)',DST:'Team Defense/Special Teams (DST)',BN:'Bench (BN)',IR:'Injured Reserve (IR)'},
    mlb:{C:'Catcher (C)','1B':'First Base (1B)','2B':'Second Base (2B)','3B':'Third Base (3B)',SS:'Shortstop (SS)',OF:'Outfield (OF)',UTIL:'Utility (UTIL)',SP:'Starting Pitcher (SP)',RP:'Relief Pitcher (RP)',P:'Pitcher (P)',BN:'Bench (BN)',IL:'Injured List (IL)'}
  };

  function normalizeSportKey(value){ const key=String(value||'').trim().toLowerCase(); return SPORT_CONFIG[key]?key:'nba'; }
  function getSelectedSport(){ const params=new URLSearchParams(window.location.search||''); const query=params.get('sport'); const saved=window.localStorage?localStorage.getItem(STORAGE_KEY):''; return normalizeSportKey(query||saved||'nba'); }
  function setSelectedSport(sport){ const normalized=normalizeSportKey(sport); try{localStorage.setItem(STORAGE_KEY,normalized);}catch(e){} return normalized; }
  function getSportConfig(sport){ return SPORT_CONFIG[normalizeSportKey(sport)]; }
  function getTeamColor(sport,code){ const map=TEAM_COLORS[getSportConfig(sport).label]||{}; return map[code]||'#334155'; }
  function fixed(n){ return Math.round(n*10)/10; }
  function buildName(i,a,b){ return a[i%a.length]+' '+b[Math.floor(i/a.length)%b.length]; }
  function assignAdp(players){ return players.sort((a,b)=>b.fp-a.fp).map((p,i)=>Object.assign(p,{adp:i+1})); }
  function looksMojibakeText(value){
    return typeof value==='string' && /(?:Ã.|Â|â€|â€™|â€œ|â€\x9d|â€“|â€”|â€¦)/.test(value);
  }
  function normalizeImportedText(value){
    if(typeof value!=='string' || !looksMojibakeText(value)) return value;
    try{
      return decodeURIComponent(escape(value));
    }catch(_err){
      return value;
    }
  }
  function normalizeImportedDetailStats(detailStats){
    return (detailStats||[]).map(function(stat){
      return {
        label:normalizeImportedText(stat&&stat.label),
        value:typeof (stat&&stat.value)==='string' ? normalizeImportedText(stat.value) : (stat&&stat.value)
      };
    });
  }
  function cloneImportedPool(list,count){
    return (list||[])
      .slice(0,Math.max(0,count||list.length))
      .map(function(player){
        return {
          id:player.id,
          name:normalizeImportedText(player.name),
          team:normalizeImportedText(player.team),
          pos:player.pos,
          fp:player.fp,
          adp:player.adp,
          source:player.source||'',
          sourcePlayerId:player.sourcePlayerId||'',
          statsThroughDate:player.statsThroughDate||'',
          statSummary:normalizeImportedText(player.statSummary),
          statValues:player.statValues?Object.assign({},player.statValues):null,
          detailStats:normalizeImportedDetailStats(player.detailStats)
        };
      });
  }
  function calcImportedScore(player, scoringMap){
    const stats=player&&player.statValues;
    if(!stats||!scoringMap) return null;
    let total=0, used=false;
    Object.keys(scoringMap).forEach(function(key){
      const weight=Number(scoringMap[key]);
      const value=Number(stats[key]||0);
      if(weight!==0&&value!==0) used=true;
      total+=value*weight;
    });
    return used ? Math.round(total*10)/10 : null;
  }

  function nbaPool(count){
    const first=['Jalen','Tyrese','Anthony','Brandon','Donovan','Zion','Paolo','Devin','Ja','Trae','Cade','Scottie','Franz','Darius','DeAaron','Bam','Mikal','Jaren','Jamal','Desmond','Kawhi','Tyler','Jabari','Evan','Julius','Jaylen','Jayson','Shai','Luka','Nikola'];
    const last=['Walker','Brooks','Miller','Mitchell','Williamson','Banchero','Booker','Morant','Young','Cunningham','Barnes','Wagner','Garland','Fox','Adebayo','Bridges','Jackson','Murray','Bane','Leonard','Herro','Smith','Mobley','Randle','Brown','Tatum','Alexander','Doncic','Jokic','Ball'];
    const base={PG:{pts:22,reb:4.2,ast:7.9,stl:1.2,blk:0.3,to:2.6,tpm:2.3},SG:{pts:21.5,reb:4.8,ast:4.2,stl:1.1,blk:0.4,to:2.1,tpm:2.6},SF:{pts:20.2,reb:6.3,ast:4.3,stl:1.0,blk:0.6,to:2.0,tpm:1.9},PF:{pts:18.8,reb:8.4,ast:3.2,stl:0.9,blk:1.0,to:2.1,tpm:1.1},C:{pts:17.4,reb:10.1,ast:2.5,stl:0.8,blk:1.6,to:2.0,tpm:0.4}};
    const positions=['PG','SG','SF','PF','C'], cfg=SPORT_CONFIG.nba, players=[];
    for(let i=0;i<count;i++){
      const pos=positions[i%positions.length], b=base[pos], tier=1-(i/count)*0.38, swing=((i*11)%9)-4;
      const pts=fixed((b.pts+swing*0.5)*tier), reb=fixed((b.reb+((i*5)%7-3)*0.35)*tier), ast=fixed((b.ast+((i*7)%7-3)*0.3)*tier), stl=fixed(Math.max(0.3,(b.stl+((i*3)%5-2)*0.08)*tier)), blk=fixed(Math.max(0.1,(b.blk+((i*2)%5-2)*0.09)*tier)), to=fixed(Math.max(0.7,b.to+((i*13)%5-2)*0.12)), tpm=fixed(Math.max(0,(b.tpm+((i*17)%7-3)*0.18)*tier)), fp=fixed(pts+reb*1.2+ast*1.5+stl*3+blk*3-to+tpm*0.5);
      players.push({id:i+1,name:buildName(i,first,last),team:cfg.teamCodes[i%cfg.teamCodes.length],pos,pts,reb,ast,stl,blk,to,tpm,fp,statSummary:`${pts} pts - ${reb} reb - ${ast} ast`,detailStats:[{label:'PTS',value:pts},{label:'REB',value:reb},{label:'AST',value:ast},{label:'STL',value:stl},{label:'BLK',value:blk},{label:'TO',value:to},{label:'3PM',value:tpm},{label:'FPTS',value:fp}]});
    }
    return assignAdp(players);
  }

  function nflPool(count){
    const first=['Josh','Patrick','Lamar','Jalen','Joe','Justin','Breece','Bijan','Saquon','Christian','Amon-Ra','Puka','JaMarr','CeeDee','Tyreek','Drake','Garrett','Sam','Brock','Tua','Kyler','Tee','James','Travis','George','Dallas','Harrison','Cooper','DJ','Rachaad'];
    const last=['Allen','Mahomes','Jackson','Hurts','Burrow','Herbert','Hall','Robinson','Barkley','McCaffrey','Brown','Nacua','Chase','Lamb','Hill','London','Wilson','LaPorta','Purdy','Tagovailoa','Murray','Higgins','Cook','Kelce','Kittle','Goedert','Nabers','Kupp','Moore','White'];
    const cfg=SPORT_CONFIG.nfl, positions=['QB','RB','WR','WR','RB','TE','QB','WR','RB','K','DST'], players=[];
    const base={QB:{passYds:4300,passTd:29,ints:11,rushYds:340,rushTd:4},RB:{rushYds:1040,rushTd:8,rec:41,recYds:300,recTd:2,fum:1},WR:{rec:86,recYds:1120,recTd:7,rushYds:40,rushTd:0.4,fum:1},TE:{rec:69,recYds:760,recTd:6,rushYds:5,rushTd:0,fum:0.5},K:{fg:28,xp:36,longFg:4},DST:{sacks:40,turnovers:20,defTd:2,pointsAllowed:21}};
    for(let i=0;i<count;i++){
      const pos=positions[i%positions.length], b=base[pos], tier=1-(i/count)*0.42, swing=((i*9)%11)-5;
      const p={id:i+1,name:buildName(i,first,last),team:cfg.teamCodes[i%cfg.teamCodes.length],pos};
      if(pos==='QB'){ p.passYds=Math.round((b.passYds+swing*70)*tier); p.passTd=Math.max(10,Math.round((b.passTd+swing*0.7)*tier)); p.ints=Math.max(3,Math.round(b.ints+((i*5)%5-2))); p.rushYds=Math.max(20,Math.round((b.rushYds+swing*18)*tier)); p.rushTd=Math.max(0,fixed((b.rushTd+((i*7)%4-1))*tier)); p.fp=fixed(p.passYds/25+p.passTd*4-p.ints*2+p.rushYds/10+p.rushTd*6); p.statSummary=`${p.passYds} pass yds - ${p.passTd} pass TD - ${p.rushYds} rush yds`; p.detailStats=[{label:'PASS',value:p.passYds},{label:'PTD',value:p.passTd},{label:'INT',value:p.ints},{label:'RUSH',value:p.rushYds},{label:'RTD',value:p.rushTd},{label:'UP',value:'QB'},{label:'FP/G',value:fixed(p.fp/17)},{label:'FPTS',value:p.fp}]; }
      else if(pos==='RB'||pos==='WR'||pos==='TE'){ p.rushYds=Math.max(0,Math.round((b.rushYds+swing*24)*tier)); p.rushTd=Math.max(0,fixed((b.rushTd+((i*7)%4-1))*tier)); p.rec=Math.max(8,Math.round((b.rec+swing*2.5)*tier)); p.recYds=Math.max(90,Math.round((b.recYds+swing*34)*tier)); p.recTd=Math.max(0,fixed((b.recTd+((i*13)%4-1))*tier)); p.fum=Math.max(0,Math.round(b.fum+((i*17)%3-1))); p.fp=fixed(p.rushYds/10+p.rushTd*6+p.rec+p.recYds/10+p.recTd*6-p.fum*2); p.statSummary=`${p.rec} rec - ${p.recYds} rec yds - ${fixed((p.rushTd||0)+(p.recTd||0))} TD`; p.detailStats=[{label:'RUSH',value:p.rushYds},{label:'REC',value:p.rec},{label:'RYDS',value:p.recYds},{label:'TD',value:fixed((p.rushTd||0)+(p.recTd||0))},{label:'FUM',value:p.fum},{label:'UP',value:pos},{label:'FP/G',value:fixed(p.fp/17)},{label:'FPTS',value:p.fp}]; }
      else if(pos==='K'){ p.fg=Math.max(10,Math.round((b.fg+swing)*tier)); p.xp=Math.max(16,Math.round((b.xp+swing*1.4)*tier)); p.longFg=Math.max(0,Math.round((b.longFg+((i*5)%3-1))*tier)); p.fp=fixed(p.fg*3+p.xp); p.statSummary=`${p.fg} FG - ${p.xp} XP - ${p.longFg} long bombs`; p.detailStats=[{label:'FG',value:p.fg},{label:'XP',value:p.xp},{label:'50+',value:p.longFg},{label:'UP',value:'K'},{label:'-',value:'-'},{label:'-',value:'-'},{label:'FP/G',value:fixed(p.fp/17)},{label:'FPTS',value:p.fp}]; }
      else { p.sacks=Math.max(8,Math.round((b.sacks+swing*1.3)*tier)); p.turnovers=Math.max(3,Math.round((b.turnovers+swing*0.7)*tier)); p.defTd=Math.max(0,Math.round((b.defTd+((i*3)%2))*tier)); p.pointsAllowed=Math.max(10,Math.round(b.pointsAllowed+((i*5)%8-4))); p.fp=fixed(p.sacks+p.turnovers*2+p.defTd*6+Math.max(0,10-Math.floor(p.pointsAllowed/7))); p.statSummary=`${p.sacks} sacks - ${p.turnovers} takeaways - ${p.defTd} TD`; p.detailStats=[{label:'SACK',value:p.sacks},{label:'TO',value:p.turnovers},{label:'DTD',value:p.defTd},{label:'PA',value:p.pointsAllowed},{label:'UP',value:'DST'},{label:'-',value:'-'},{label:'FP/G',value:fixed(p.fp/17)},{label:'FPTS',value:p.fp}]; }
      players.push(p);
    }
    return assignAdp(players);
  }

  function mlbPool(count){
    const first=['Shohei','Mookie','Aaron','Juan','Freddie','Corey','Ronald','Julio','Bobby','Matt','Adley','Kyle','Bryce','Fernando','Yordan','Gunnar','Pete','Trea','Austin','Spencer','Zack','Tarik','Corbin','Logan','Pablo','Yoshinobu','Zac','Luis','Tyler','Will'];
    const last=['Ohtani','Betts','Judge','Soto','Freeman','Seager','Acuna','Rodriguez','Witt','Olson','Rutschman','Tucker','Harper','Tatis','Alvarez','Henderson','Alonso','Turner','Riley','Strider','Wheeler','Skubal','Burnes','Webb','Lopez','Yamamoto','Gallen','Castillo','Glasnow','Smith'];
    const cfg=SPORT_CONFIG.mlb, positions=['OF','SS','SP','1B','OF','SP','3B','2B','C','RP'], players=[];
    const hitters={C:{r:61,rbi:71,hr:19,sb:3,avg:.261,bb:44},'1B':{r:79,rbi:92,hr:27,sb:4,avg:.274,bb:58},'2B':{r:83,rbi:72,hr:18,sb:15,avg:.269,bb:52},'3B':{r:81,rbi:88,hr:26,sb:8,avg:.271,bb:56},SS:{r:89,rbi:74,hr:21,sb:23,avg:.272,bb:54},OF:{r:92,rbi:84,hr:29,sb:18,avg:.277,bb:57}};
    const pitchers={SP:{ip:176,so:188,w:12,sv:0,era:3.62,er:71},RP:{ip:63,so:78,w:4,sv:25,era:3.08,er:22}};
    for(let i=0;i<count;i++){
      const pos=positions[i%positions.length], tier=1-(i/count)*0.45, swing=((i*7)%11)-5, p={id:i+1,name:buildName(i,first,last),team:cfg.teamCodes[i%cfg.teamCodes.length],pos};
      if(pos==='SP'||pos==='RP'){ const b=pitchers[pos]; p.ip=fixed(Math.max(25,(b.ip+swing*4)*tier)); p.so=Math.max(18,Math.round((b.so+swing*5)*tier)); p.w=Math.max(0,Math.round((b.w+swing*0.45)*tier)); p.sv=pos==='RP'?Math.max(0,Math.round((b.sv+swing)*tier)):0; p.era=fixed(Math.max(1.9,b.era+((i*5)%7-3)*0.12)); p.er=Math.max(5,Math.round(b.er*tier)); p.fp=fixed(p.ip*3+p.so+p.w*5+p.sv*5-p.er*2); p.statSummary=`${p.ip} IP - ${p.so} SO - ${pos==='RP'?p.sv+' SV':p.w+' W'}`; p.detailStats=[{label:'IP',value:p.ip},{label:'SO',value:p.so},{label:'W',value:p.w},{label:'SV',value:p.sv},{label:'ERA',value:p.era},{label:'ROLE',value:pos},{label:'ER',value:p.er},{label:'FPTS',value:p.fp}]; }
      else { const b=hitters[pos]; p.r=Math.max(18,Math.round((b.r+swing*2.3)*tier)); p.rbi=Math.max(16,Math.round((b.rbi+swing*2.1)*tier)); p.hr=Math.max(1,Math.round((b.hr+swing*0.8)*tier)); p.sb=Math.max(0,Math.round((b.sb+swing*0.7)*tier)); p.avg=fixed(Math.max(.218,b.avg+((i*3)%7-3)*.003)); p.bb=Math.max(8,Math.round((b.bb+swing*1.5)*tier)); p.fp=fixed(p.hr*4+p.rbi+p.r+p.bb+p.sb*2+(p.avg*100-20)); p.statSummary=`${p.hr} HR - ${p.rbi} RBI - ${p.r} R`; p.detailStats=[{label:'HR',value:p.hr},{label:'RBI',value:p.rbi},{label:'RUN',value:p.r},{label:'SB',value:p.sb},{label:'AVG',value:p.avg.toFixed(3)},{label:'BB',value:p.bb},{label:'ROLE',value:pos},{label:'FPTS',value:p.fp}]; }
      players.push(p);
    }
    return assignAdp(players);
  }

  function buildSportPlayerPool(sport,count){
    const key=normalizeSportKey(sport), target=Math.max(count||0,SPORT_CONFIG[key].playerCount), imported=(window.RB_IMPORTED_POOLS||{})[key];
    if(imported && imported.length){ return cloneImportedPool(imported,target); }
    console.error('RosterBate real player pool missing for sport:', key);
    return [];
  }
  function getPlayerFantasyScore(sport,player,scoringMap){
    const key=normalizeSportKey(sport);
    if(key==='nba'){
      if(scoringMap){
        const total=
          (Number(player?.pts||0) * Number(scoringMap.PTS||0)) +
          (Number(player?.reb||0) * Number(scoringMap.REB||0)) +
          (Number(player?.ast||0) * Number(scoringMap.AST||0)) +
          (Number(player?.stl||0) * Number(scoringMap.STL||0)) +
          (Number(player?.blk||0) * Number(scoringMap.BLK||0)) +
          (Number(player?.to||0) * Number(scoringMap.TO||0)) +
          (Number(player?.tpm||0) * Number(scoringMap['3PM']||0));
        return Math.round(total*10)/10;
      }
      return typeof player?.fp==='number' ? player.fp : 0;
    }
    const importedScore=calcImportedScore(player, scoringMap||getCommissionerDefaults(key).scoring);
    if(importedScore!==null) return importedScore;
    return typeof player?.fp==='number' ? player.fp : 0;
  }
  function getPlayerSummary(player){ return player&&player.statSummary ? player.statSummary : ''; }
  function getPlayerDetailStats(player){ return player&&player.detailStats ? player.detailStats : []; }
  function getCommissionerDefaults(sport){
    const key=normalizeSportKey(sport);
    if(key==='nfl') return {scoringType:'H2H Points',positions:{QB:{starters:1,max:4},RB:{starters:2,max:6},WR:{starters:2,max:6},TE:{starters:1,max:3},FLEX:{starters:1,max:3},K:{starters:1,max:2},DST:{starters:1,max:2},BN:{starters:6,max:'No Limit'},IR:{starters:1,max:2}},scoring:{PASS_YDS:0.04,PASS_TD:4,INT:-2,RUSH_YDS:0.1,RUSH_TD:6,REC:1,REC_YDS:0.1,REC_TD:6,FUM:-2,FG:3,XP:1,SACK:1,DEF_TO:2,DEF_TD:6}};
    if(key==='mlb') return {scoringType:'Points',positions:{C:{starters:1,max:2},'1B':{starters:1,max:2},'2B':{starters:1,max:2},'3B':{starters:1,max:2},SS:{starters:1,max:2},OF:{starters:3,max:6},UTIL:{starters:1,max:2},P:{starters:6,max:10},BN:{starters:3,max:'No Limit'},IL:{starters:3,max:3}},scoring:{SINGLE:1,DOUBLE:2,TRIPLE:3,HR:4,RBI:1,RUN:1,BB:1,SB:2,IP:3,SO:1,W:5,SV:5,ER:-2}};
    return {scoringType:'H2H Points',positions:{PG:{starters:1,max:3},SG:{starters:1,max:3},SF:{starters:1,max:3},PF:{starters:1,max:3},C:{starters:1,max:3},G:{starters:1,max:3},F:{starters:1,max:3},UTIL:{starters:1,max:3},BE:{starters:5,max:'No Limit'},IR:{starters:1,max:3}},scoring:{FGM:2,FGA:-1,FTM:1,FTA:-1,'3PM':1,REB:1,AST:2,STL:4,BLK:4,TO:-2,PTS:1}};
  }
  function getLeagueRuleDefaults(sport){
    const key=normalizeSportKey(sport), cfg=getSportConfig(key), comm=getCommissionerDefaults(key), slots=cfg.myTeamSlots||[], irKey=key==='mlb'?'IL':'IR', starterCount=(cfg.starterSlots||[]).length, irCount=slots.filter(function(slot){ return slot===irKey; }).length || 1, benchCount=slots.length - starterCount - irCount;
    return {
      rounds:cfg.defaultRounds,
      rosterSize:cfg.defaultRounds,
      starters:starterCount,
      benchSlots:Math.max(3,benchCount),
      irSlots:irCount,
      scoring:Object.assign({},comm.scoring),
      scoringLabels:Object.assign({},SCORING_LABELS[key]||{}),
      positions:Object.assign({},comm.positions)
    };
  }
  function getPositionLabels(sport){
    return Object.assign({}, POSITION_LABELS[normalizeSportKey(sport)]||{});
  }

  window.RB_SPORT_CONFIG = SPORT_CONFIG;
  window.normalizeRosterbateSport = normalizeSportKey;
  window.getSelectedRosterbateSport = getSelectedSport;
  window.setSelectedRosterbateSport = setSelectedSport;
  window.getRosterbateSportConfig = getSportConfig;
  window.buildRosterbateSportPlayerPool = buildSportPlayerPool;
  window.getRosterbatePlayerFantasyScore = getPlayerFantasyScore;
  window.getRosterbateTeamColor = getTeamColor;
  window.getRosterbatePlayerSummary = getPlayerSummary;
  window.getRosterbatePlayerDetailStats = getPlayerDetailStats;
  window.getRosterbateCommissionerDefaults = getCommissionerDefaults;
  window.getRosterbateLeagueRuleDefaults = getLeagueRuleDefaults;
  window.getRosterbatePositionLabels = getPositionLabels;
})();
