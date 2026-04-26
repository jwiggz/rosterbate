(()=>{
  'use strict';

  const fs=require('fs');
  const path=require('path');

  const repoRoot=__dirname;
  const packRoot=path.join(repoRoot,'historical-packs','nba_1996_full_season_v1');

  function readJson(relativePath){
    return JSON.parse(fs.readFileSync(path.join(packRoot, relativePath), 'utf8'));
  }

  function writeJson(relativePath, data){
    fs.writeFileSync(path.join(packRoot, relativePath), JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  function isIntegerLike(value){
    const num=Number(value||0);
    return Number.isFinite(num) && Math.abs(num-Math.round(num))<1e-9;
  }

  function isSyntheticRow(row){
    const source=String(row?.statSource||'').trim().toLowerCase();
    if(source==='generated_coverage') return true;
    if(source==='foundation_seed' || source==='authored_seed') return false;
    return ['minutes','points','rebounds','assists','steals','blocks','turnovers','threePointersMade','fgm','fga','ftm','fta']
      .some(key=>!isIntegerLike(row?.[key]));
  }

  const manifest=readJson('manifest.json');
  const summaries=readJson(path.join('optional','summaries.json'));
  const playerGameStats=readJson('player_game_stats.json');

  const retainedRows=playerGameStats.filter(row=>!isSyntheticRow(row)).map(row=>{
    const copy={...row};
    copy.statSource=String(copy.statSource||'foundation_seed');
    return copy;
  });

  manifest.version=Number(manifest.version||1)+1;
  manifest.updatedAt=new Date().toISOString();
  manifest.description='A strict 1995-96 NBA simulation foundation pack that only carries non-generated seed stat rows while the ratings-ready pack expands toward fuller era coverage.';
  manifest.provenance=manifest.provenance||{};
  manifest.provenance.importNotes='Generated coverage rows removed. Simulation archive mode now uses only non-generated seed stat rows until fuller era data is added.';
  manifest.notes=[
    'Carries a full-league 1995-96 player base for simulation archive and draft experiments.',
    'Uses only non-generated seed stat rows in simulation archive mode.',
    'Players without real seed coverage stay in the archive pool, but no longer receive invented production.'
  ];

  summaries.packSummary='The 1995-96 NBA season pack is now in strict no-synthetic-stat mode: Draft The Era and simulation archive views only use non-generated seed rows, keeping the source pack honest while ratings-ready era coverage expands.';
  summaries.featuredStorylines=[
    'The 72-win Bulls chase',
    'A full-league Draft The Era sandbox',
    'Strict no-synthetic simulation stat mode'
  ];

  writeJson('manifest.json', manifest);
  writeJson('player_game_stats.json', retainedRows);
  writeJson(path.join('optional','summaries.json'), summaries);

  console.log(JSON.stringify({
    status:'ok',
    retainedRows:retainedRows.length,
    removedRows:playerGameStats.length-retainedRows.length
  }, null, 2));
})();
