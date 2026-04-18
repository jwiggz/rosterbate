(function(global){
  'use strict';

  const currentScript=typeof document!=='undefined' ? document.currentScript : null;
  const baseUrl=currentScript && currentScript.src ? currentScript.src.replace(/[^/]+$/,'') : '';
  const DEFAULT_PACK_ID='nba_1996_full_season_v1';
  const DEFAULT_PACK_ROOT='historical-packs/';

  function resolveUrl(path){
    try{
      return baseUrl ? String(new URL(path, baseUrl)) : path;
    }catch(e){
      return path;
    }
  }

  function isPlainObject(value){
    return !!value && Object.prototype.toString.call(value)==='[object Object]';
  }

  function deepClone(value){
    return JSON.parse(JSON.stringify(value));
  }

  async function fetchJson(url){
    const response=await fetch(url, {cache:'no-store'});
    if(!response.ok){
      throw new Error('fetch_failed:'+response.status+':'+url);
    }
    return response.json();
  }

  async function loadManifestFromRoot(rootUrl){
    return fetchJson(rootUrl.replace(/\/?$/,'/') + 'manifest.json');
  }

  async function loadPackBundleFromRoot(rootUrl){
    const normalizedRoot=rootUrl.replace(/\/?$/,'/');
    const manifest=await loadManifestFromRoot(normalizedRoot);
    const contentFiles=isPlainObject(manifest.contentFiles) ? manifest.contentFiles : {};

    const bundle={manifest:manifest};
    const contentMap={
      season:'season',
      teams:'teams',
      players:'players',
      rosterSnapshots:'rosterSnapshots',
      schedule:'schedule',
      games:'games',
      playerGameStats:'playerGameStats',
      packChallenges:'packChallenges',
      presentation:'presentation',
      summaries:'summaries'
    };

    await Promise.all(Object.keys(contentMap).map(async function(fileKey){
      const bundleKey=contentMap[fileKey];
      const relativePath=contentFiles[fileKey];
      if(!relativePath){
        bundle[bundleKey]=null;
        return;
      }
      bundle[bundleKey]=await fetchJson(normalizedRoot + relativePath);
    }));

    return bundle;
  }

  async function loadPackById(packId){
    const id=String(packId || DEFAULT_PACK_ID).trim();
    if(!id) throw new Error('pack_id_required');
    return loadPackBundleFromRoot(resolveUrl(DEFAULT_PACK_ROOT + id + '/'));
  }

  async function loadDefaultPack(){
    return loadPackById(DEFAULT_PACK_ID);
  }

  const api={
    defaultPackId: DEFAULT_PACK_ID,
    packRoot: DEFAULT_PACK_ROOT,
    loadPackById: loadPackById,
    loadDefaultPack: loadDefaultPack,
    loadPackBundleFromRoot: loadPackBundleFromRoot,
    loadManifestFromRoot: loadManifestFromRoot,
    deepClone: deepClone
  };

  global.RosterBateHistoricalPackLoader=api;

  if(typeof module!=='undefined' && module.exports){
    module.exports=api;
  }
})(typeof window!=='undefined' ? window : globalThis);
