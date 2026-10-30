function binary(statusCode,body,headers={}){
  return {
    statusCode,
    headers:{
      'Cache-Control':'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      ...headers
    },
    body,
    isBase64Encoded:true
  };
}

function text(statusCode,message){
  return {
    statusCode,
    headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'},
    body:String(message)
  };
}

async function fetchImage(url){
  const r=await fetch(url,{
    headers:{
      Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'User-Agent':'Mozilla/5.0 RosterBate/1.0'
    },
    redirect:'follow',
    cache:'no-store'
  });
  if(!r.ok) return null;
  const type=String(r.headers.get('content-type')||'');
  if(!type.startsWith('image/')) return null;
  const buf=Buffer.from(await r.arrayBuffer());
  if(!buf.length||buf.length>2_500_000) return null;
  return{type,body:buf.toString('base64')};
}

async function fetchJson(url){
  const r=await fetch(url,{
    headers:{Accept:'application/json','User-Agent':'Mozilla/5.0 RosterBate/1.0'},
    cache:'no-store'
  });
  if(!r.ok) return null;
  return r.json().catch(()=>null);
}

function normalizeName(value){
  return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}

function findAthlete(node,targetName,depth=0,seen=new Set()){
  if(depth>12||node==null||typeof node!=='object') return null;
  if(seen.has(node)) return null;
  seen.add(node);
  const target=normalizeName(targetName);
  const name=normalizeName(node.displayName||node.fullName||node.name||node.shortName||'');
  const id=String(node.id||node.athleteId||node.athlete_id||'').trim();
  if(target&&name===target&&/^\d{1,12}$/.test(id)) return {id,node};
  if(Array.isArray(node)){
    for(const item of node){const found=findAthlete(item,targetName,depth+1,seen);if(found)return found;}
  }else{
    for(const value of Object.values(node)){const found=findAthlete(value,targetName,depth+1,seen);if(found)return found;}
  }
  return null;
}

async function espnIdFromTeamRoster(team,name){
  if(!team||!name) return '';
  const urls=[
    `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${encodeURIComponent(team)}/roster`,
    `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${encodeURIComponent(team)}/roster`
  ];
  for(const url of urls){
    try{
      const data=await fetchJson(url);
      const found=findAthlete(data,name);
      if(found?.id) return found.id;
    }catch{}
  }
  return '';
}

function findEspnId(payload,targetName){
  const target=normalizeName(targetName);
  if(!payload||!target) return '';
  const seen=new Set();
  let loose='';
  function walk(node,depth=0){
    if(depth>10||node==null||typeof node!=='object') return '';
    if(seen.has(node)) return '';
    seen.add(node);
    const name=normalizeName(node.displayName||node.fullName||node.name||node.shortName||node.text||'');
    const id=String(node.id||node.athleteId||node.athlete_id||'').trim();
    if(/^\d{1,12}$/.test(id)){
      if(name===target) return id;
      if(!loose&&name&&(name.includes(target)||target.includes(name))) loose=id;
    }
    if(Array.isArray(node)){
      for(const item of node){const found=walk(item,depth+1);if(found)return found;}
    }else{
      for(const value of Object.values(node)){const found=walk(value,depth+1);if(found)return found;}
    }
    return '';
  }
  return walk(payload)||loose;
}

async function searchEspnId(name){
  if(!name) return '';
  const urls=[
    `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&limit=20`,
    `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&limit=20`
  ];
  for(const url of urls){
    try{
      const data=await fetchJson(url);
      const id=findEspnId(data,name);
      if(id) return id;
    }catch{}
  }
  return '';
}

function svgPlaceholder(name){
  const initials=String(name||'NBA').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'NBA';
  const safe=initials.replace(/[<>&"']/g,'');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#33445b"/><stop offset="1" stop-color="#1d2736"/></linearGradient></defs><rect width="192" height="192" rx="96" fill="url(#g)"/><text x="96" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#dbe5f1">${safe}</text></svg>`;
  return Buffer.from(svg).toString('base64');
}

exports.handler=async function(event){
  if(event.httpMethod&&event.httpMethod!=='GET') return text(405,'Method not allowed');

  const q=event.queryStringParameters||{};
  let espn=String(q.espn||'').trim();
  const player=String(q.player||'').trim();

  if(espn&&!/^\d{1,12}$/.test(espn)) return text(400,'Invalid ESPN player id');
  if(player&&!/^[A-Za-z0-9_-]{1,40}$/.test(player)) return text(400,'Invalid Sleeper player id');
  if(!espn&&!player) return text(400,'Missing player id');

  let playerName='NBA';
  let team='';
  let resolution='none';

  try{
    if(player){
      const players=await fetchJson('https://api.sleeper.app/v1/players/nba');
      const p=players&&players[player];
      if(p){
        playerName=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||playerName;
        team=String(p.team||'').trim().toUpperCase();
        if(!espn){
          espn=String(p.espn_id||p.espn||p.metadata?.espn_id||'').trim();
          if(/^\d{1,12}$/.test(espn)) resolution='sleeper-metadata';
          else espn='';
        }
      }
    }

    if(!espn&&team&&playerName&&playerName!=='NBA'){
      espn=await espnIdFromTeamRoster(team,playerName);
      if(espn) resolution='espn-team-roster';
    }

    if(!espn&&playerName&&playerName!=='NBA'){
      espn=await searchEspnId(playerName);
      if(espn) resolution='espn-search';
    }

    const urls=[];
    if(espn){
      urls.push(`https://a.espncdn.com/i/headshots/nba/players/full/${encodeURIComponent(espn)}.png`);
      urls.push(`https://secure.espn.com/combiner/i?img=/i/headshots/nba/players/full/${encodeURIComponent(espn)}.png&w=192&h=192`);
    }
    if(player) urls.push(`https://sleepercdn.com/content/nba/players/thumb/${encodeURIComponent(player)}`);

    for(const url of urls){
      const image=await fetchImage(url);
      if(image){
        return binary(200,image.body,{
          'Content-Type':image.type,
          'Access-Control-Allow-Origin':'*',
          'X-RosterBate-Headshot-Source':url.includes('espn')?'espn':'sleeper',
          'X-RosterBate-Resolution':resolution,
          ...(espn?{'X-RosterBate-ESPN-Id':espn}:{}),
          ...(team?{'X-RosterBate-Team':team}:{})
        });
      }
    }

    return binary(200,svgPlaceholder(playerName),{
      'Content-Type':'image/svg+xml; charset=utf-8',
      'Access-Control-Allow-Origin':'*',
      'X-RosterBate-Headshot-Source':'placeholder',
      'X-RosterBate-Resolution':resolution,
      ...(team?{'X-RosterBate-Team':team}:{})
    });
  }catch(e){
    return binary(200,svgPlaceholder(playerName),{
      'Content-Type':'image/svg+xml; charset=utf-8',
      'Access-Control-Allow-Origin':'*',
      'X-RosterBate-Headshot-Source':'placeholder-error',
      'X-RosterBate-Resolution':resolution
    });
  }
};