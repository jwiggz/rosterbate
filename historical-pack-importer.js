(function(global){
  'use strict';

  const validator=global.RosterBateHistoricalPackValidator || (typeof require!=='undefined' ? require('./historical-pack-validator.js') : null);
  const fixtures=global.RosterBateHistoricalPackFixtures || (typeof require!=='undefined' ? require('./historical-pack-fixtures.js') : null);

  function deepClone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function normalizeOptions(options){
    const input=options && typeof options==='object' ? options : {};
    return {
      dryRun: input.dryRun!==false,
      writer: typeof input.writer==='function' ? input.writer : null,
      includeSourceBundle: input.includeSourceBundle===true
    };
  }

  function buildImportPlan(bundle, validationReport, options){
    const importedAt=nowIso();
    return {
      metadata: {
        packId: bundle.manifest.packId,
        seasonId: bundle.manifest.seasonId,
        importedAt: importedAt,
        sourceProfile: bundle.manifest.sourceProfile,
        schemaVersion: bundle.manifest.schemaVersion,
        canonicalModelVersion: bundle.manifest.canonicalModelVersion,
        dryRun: options.dryRun,
        validationStatus: validationReport.status
      },
      canonical: {
        seasons: [deepClone(bundle.season)],
        teams: deepClone(bundle.teams),
        players: deepClone(bundle.players),
        rosterSnapshots: deepClone(bundle.rosterSnapshots),
        schedule: deepClone(bundle.schedule),
        games: deepClone(bundle.games),
        playerGameStats: deepClone(bundle.playerGameStats)
      },
      authored: {
        packChallenges: bundle.packChallenges ? deepClone(bundle.packChallenges) : null,
        presentation: bundle.presentation ? deepClone(bundle.presentation) : null,
        summaries: bundle.summaries ? deepClone(bundle.summaries) : null
      },
      summary: {
        teamCount: validationReport.summary.teamCount || 0,
        playerCount: validationReport.summary.playerCount || 0,
        gameCount: validationReport.summary.gameCount || 0,
        playerGameStatCount: validationReport.summary.playerGameStatCount || 0,
        warningCount: validationReport.summary.warningCount || 0,
        errorCount: validationReport.summary.errorCount || 0
      }
    };
  }

  function buildResponse(status, validation, importPlan, extra){
    const payload={
      status: status,
      validation: validation,
      importPlan: importPlan || null
    };
    if(extra && typeof extra==='object'){
      Object.keys(extra).forEach(function(key){
        payload[key]=extra[key];
      });
    }
    return payload;
  }

  function ensureDependencies(){
    if(!validator){
      throw new Error('historical_pack_validator_missing');
    }
  }

  function importHistoricalPackBundle(bundle, options){
    ensureDependencies();
    const normalized=normalizeOptions(options);
    const validation=validator.validateHistoricalPackBundle(bundle);

    if(validation.status==='validation_failed'){
      return buildResponse('validation_failed', validation, null);
    }

    const importPlan=buildImportPlan(bundle, validation, normalized);
    if(normalized.includeSourceBundle){
      importPlan.sourceBundle=deepClone(bundle);
    }

    if(normalized.dryRun){
      return buildResponse('dry_run_ready', validation, importPlan);
    }

    if(!normalized.writer){
      return buildResponse('no_writer_provided', validation, importPlan, {
        message: 'Validation passed, but no writer was provided for a non-dry-run import.'
      });
    }

    try{
      const writerResult=normalized.writer(importPlan);
      return buildResponse('import_applied', validation, importPlan, {
        writerResult: writerResult == null ? null : writerResult
      });
    }catch(error){
      return buildResponse('import_write_failed', validation, importPlan, {
        writerError: error && error.message ? error.message : String(error)
      });
    }
  }

  function importHistoricalPackFixture(packId, options){
    if(!fixtures || typeof fixtures.getFixtureById!=='function'){
      throw new Error('historical_pack_fixtures_missing');
    }
    const bundle=fixtures.getFixtureById(packId);
    if(!bundle){
      return {
        status: 'fixture_not_found',
        validation: null,
        importPlan: null,
        message: 'No historical pack fixture found for `'+String(packId || '')+'`.'
      };
    }
    return importHistoricalPackBundle(bundle, options);
  }

  function loadDefaultFixture(options){
    if(!fixtures || typeof fixtures.getSample1995_96Bundle!=='function'){
      throw new Error('historical_pack_fixtures_missing');
    }
    return importHistoricalPackBundle(fixtures.getSample1995_96Bundle(), options);
  }

  const api={
    importHistoricalPackBundle: importHistoricalPackBundle,
    importHistoricalPackFixture: importHistoricalPackFixture,
    loadDefaultFixture: loadDefaultFixture,
    buildImportPlan: buildImportPlan
  };

  global.RosterBateHistoricalPackImporter=api;

  if(typeof module!=='undefined' && module.exports){
    module.exports=api;
  }
})(typeof window!=='undefined' ? window : globalThis);
