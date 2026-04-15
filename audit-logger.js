(function(global){
  'use strict';

  const AUDIT_CONTEXT_ENDPOINT='/.netlify/functions/audit-context';
  let auditContextPromise=null;

  function safeString(value, maxLength){
    const text=String(value == null ? '' : value).trim();
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function getStoredDeviceId(){
    try{
      const existing=localStorage.getItem('rbAuditDeviceId');
      if(existing) return existing;
      const created='device_'+Math.random().toString(36).slice(2,10)+'_'+Date.now().toString(36);
      localStorage.setItem('rbAuditDeviceId', created);
      return created;
    }catch(e){
      return 'device_ephemeral_'+Math.random().toString(36).slice(2,10);
    }
  }

  function buildDeviceSnapshot(){
    const nav=global.navigator || {};
    const screenObj=global.screen || {};
    return {
      userAgent: safeString(nav.userAgent || '', 320),
      platform: safeString(nav.platform || '', 80),
      language: safeString(nav.language || '', 32),
      languages: Array.isArray(nav.languages) ? nav.languages.slice(0,5).map(item=>safeString(item, 24)).filter(Boolean) : [],
      hardwareConcurrency: Number(nav.hardwareConcurrency || 0) || null,
      deviceMemory: Number(nav.deviceMemory || 0) || null,
      maxTouchPoints: Number(nav.maxTouchPoints || 0) || 0,
      screen: {
        width: Number(screenObj.width || 0) || null,
        height: Number(screenObj.height || 0) || null,
        pixelRatio: Number(global.devicePixelRatio || 1) || 1
      },
      viewport: {
        width: Number(global.innerWidth || 0) || null,
        height: Number(global.innerHeight || 0) || null
      },
      timezone: safeString((Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || '', 64)
    };
  }

  async function fetchAuditContext(){
    if(auditContextPromise) return auditContextPromise;
    auditContextPromise=(async()=>{
      try{
        const response=await fetch(AUDIT_CONTEXT_ENDPOINT, {
          method:'GET',
          credentials:'same-origin',
          headers:{'Accept':'application/json'}
        });
        if(!response.ok) throw new Error('audit_context_'+response.status);
        const data=await response.json();
        return {
          ip: safeString(data.ip || '', 80),
          source: safeString(data.source || 'netlify_function', 40),
          country: safeString(data.country || '', 32),
          region: safeString(data.region || '', 64),
          city: safeString(data.city || '', 64)
        };
      }catch(error){
        return {
          ip: '',
          source: 'unavailable',
          country: '',
          region: '',
          city: '',
          error: safeString(error && error.message ? error.message : error, 120)
        };
      }
    })();
    return auditContextPromise;
  }

  function getDefaultUserNumber(){
    try{
      const raw=localStorage.getItem('rbUserNumber');
      const num=Number(raw || 0);
      return Number.isFinite(num) && num > 0 ? num : null;
    }catch(e){
      return null;
    }
  }

  function getDefaultUsername(){
    try{
      return safeString(localStorage.getItem('rbPlayerName') || '', 80) || null;
    }catch(e){
      return null;
    }
  }

  function sanitizeMetadata(input){
    if(!input || typeof input!=='object') return {};
    const output={};
    Object.entries(input).forEach(([key,value])=>{
      const finalKey=safeString(key, 48);
      if(!finalKey) return;
      if(value == null){
        output[finalKey]=null;
        return;
      }
      if(typeof value==='number' || typeof value==='boolean'){
        output[finalKey]=value;
        return;
      }
      if(Array.isArray(value)){
        output[finalKey]=value.slice(0,8).map(item=>safeString(item, 80));
        return;
      }
      output[finalKey]=safeString(value, 200);
    });
    return output;
  }

  async function logLeagueAuditEvent(options){
    const config=options && typeof options==='object' ? options : {};
    const db=global.db;
    const auth=global.auth;
    const currentUser=config.user || global.currentRbUser || auth?.currentUser || null;
    if(!db || !auth || !currentUser) return false;

    const entityId=safeString(
      config.entityId || config.leagueId || config.seasonId || config.lobbyId || '',
      120
    );
    if(!entityId) return false;

    const scope=safeString(config.scope || 'league', 24);
    const action=safeString(config.action || 'activity', 48);
    const ts=Date.now();
    const context=await fetchAuditContext();
    const userNumber=Number(config.userNumber || getDefaultUserNumber() || 0) || null;
    const username=safeString(config.username || getDefaultUsername() || '', 80) || null;
    const deviceId=getStoredDeviceId();
    const device=buildDeviceSnapshot();
    const eventRef=db.ref('leagueAudit/'+entityId+'/events').push();
    const eventId=eventRef.key;
    if(!eventId) return false;

    const eventPayload={
      scope,
      action,
      entityId,
      ts,
      uid: safeString(currentUser.uid || '', 128) || null,
      userNumber,
      username,
      sport: safeString(config.sport || '', 16) || null,
      isMultiplayer: !!config.isMultiplayer,
      deviceId,
      device,
      ip: context.ip || null,
      ipSource: context.source || 'unavailable',
      country: context.country || null,
      region: context.region || null,
      city: context.city || null,
      page: safeString(global.location && global.location.pathname || '', 120),
      url: safeString((global.location && (global.location.pathname + global.location.search)) || '', 220),
      metadata: sanitizeMetadata(config.metadata)
    };

    const memberKey=safeString(currentUser.uid || ('user_'+String(userNumber || 'guest')), 128);
    const memberPayload={
      uid: safeString(currentUser.uid || '', 128) || null,
      userNumber,
      username,
      lastAction: action,
      lastScope: scope,
      lastSeenAt: ts,
      lastLeagueId: entityId,
      lastSport: eventPayload.sport,
      lastIsMultiplayer: !!config.isMultiplayer,
      lastIp: context.ip || null,
      lastIpSource: context.source || 'unavailable',
      lastCountry: context.country || null,
      lastRegion: context.region || null,
      lastCity: context.city || null,
      deviceId,
      deviceLabel: safeString(device.platform || device.userAgent || 'Unknown device', 120),
      userAgent: device.userAgent
    };

    const updates={};
    updates['leagueAudit/'+entityId+'/events/'+eventId]=eventPayload;
    updates['leagueAudit/'+entityId+'/members/'+memberKey]=memberPayload;
    updates['leagueAudit/'+entityId+'/summary/lastAction']=action;
    updates['leagueAudit/'+entityId+'/summary/lastSeenAt']=ts;
    updates['leagueAudit/'+entityId+'/summary/lastUid']=memberPayload.uid;
    updates['leagueAudit/'+entityId+'/summary/lastUserNumber']=userNumber;
    updates['leagueAudit/'+entityId+'/summary/lastUsername']=username;
    updates['leagueAudit/'+entityId+'/summary/lastIp']=context.ip || null;
    updates['leagueAudit/'+entityId+'/summary/lastIpSource']=context.source || 'unavailable';
    updates['leagueAudit/'+entityId+'/summary/lastDeviceId']=deviceId;
    updates['leagueAudit/'+entityId+'/summary/updatedAt']=ts;
    if(config.lobbyId) updates['leagueAudit/'+entityId+'/summary/lobbyId']=safeString(config.lobbyId, 120);
    if(config.seasonId) updates['leagueAudit/'+entityId+'/summary/seasonId']=safeString(config.seasonId, 120);
    if(config.sport) updates['leagueAudit/'+entityId+'/summary/sport']=safeString(config.sport, 16);
    updates['leagueAudit/'+entityId+'/summary/isMultiplayer']=!!config.isMultiplayer;

    try{
      await db.ref().update(updates);
      return true;
    }catch(error){
      console.warn('RosterBate audit log failed', error);
      return false;
    }
  }

  async function logLeaguePlayOnce(options){
    const config=options && typeof options==='object' ? options : {};
    const entityId=safeString(config.entityId || config.leagueId || config.seasonId || config.lobbyId || '', 120);
    const action=safeString(config.action || 'league_played', 48);
    if(!entityId) return false;
    const sessionKey='rbAuditOnce:'+entityId+':'+action;
    try{
      if(sessionStorage.getItem(sessionKey)) return false;
      sessionStorage.setItem(sessionKey, String(Date.now()));
    }catch(e){}
    return logLeagueAuditEvent({...config, entityId, action});
  }

  global.RosterbateAudit={
    getContext: fetchAuditContext,
    getDeviceSnapshot: buildDeviceSnapshot,
    logLeagueAuditEvent,
    logLeaguePlayOnce
  };
})(window);
