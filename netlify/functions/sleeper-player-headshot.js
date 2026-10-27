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
    headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},
    cache:'no-store'
  });
  if(!r.ok) return null;
  return r.json().catch(()=>null);
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

  try{
    // Most callers only know the Sleeper player id. Resolve Sleeper -> ESPN here so
    // the browser never needs to make a third-party image request.
    if(player){
      const players=await fetchJson('https://api.sleeper.app/v1/players/nba');
      const p=players&&players[player];
      if(p){
        playerName=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||playerName;
        if(!espn){
          espn=String(p.espn_id||p.espn||p.metadata?.espn_id||'').trim();
          if(!/^\d{1,12}$/.test(espn)) espn='';
        }
      }
    }

    const urls=[];
    if(espn){
      urls.push(`https://a.espncdn.com/i/headshots/nba/players/full/${encodeURIComponent(espn)}.png`);
    }

    // Keep these as fallbacks only. Firefox never sees these hosts directly because
    // the Netlify function proxies the bytes back from the RosterBate origin.
    if(player){
      urls.push(`https://sleepercdn.com/content/nba/players/thumb/${encodeURIComponent(player)}`);
    }

    for(const url of urls){
      const image=await fetchImage(url);
      if(image){
        return binary(200,image.body,{
          'Content-Type':image.type,
          'Access-Control-Allow-Origin':'*',
          'X-RosterBate-Headshot-Source':url.includes('espncdn.com')?'espn':'sleeper'
        });
      }
    }

    // Return a stable same-origin placeholder instead of 404. This prevents the
    // frontend MutationObserver from repeatedly removing/re-requesting the image.
    return binary(200,svgPlaceholder(playerName),{
      'Content-Type':'image/svg+xml; charset=utf-8',
      'Access-Control-Allow-Origin':'*',
      'X-RosterBate-Headshot-Source':'placeholder'
    });
  }catch(e){
    return binary(200,svgPlaceholder(playerName),{
      'Content-Type':'image/svg+xml; charset=utf-8',
      'Access-Control-Allow-Origin':'*',
      'X-RosterBate-Headshot-Source':'placeholder-error'
    });
  }
};