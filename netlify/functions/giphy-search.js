function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=120'},body:JSON.stringify(body)}}

function normalizeHtml(text){return String(text||'').replace(/\\u002F/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&')}

exports.handler=async function(event){
  if(event.httpMethod&&event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
  const q=String(event.queryStringParameters?.q||'').trim().slice(0,80);
  if(!q)return json(200,{ok:true,items:[]});
  try{
    const slug=encodeURIComponent(q.replace(/\s+/g,'-'));
    const r=await fetch(`https://giphy.com/search/${slug}`,{headers:{Accept:'text/html','User-Agent':'Mozilla/5.0 RosterBate/1.0'}});
    if(!r.ok)return json(502,{error:`GIPHY search failed (HTTP ${r.status}).`});
    const html=normalizeHtml(await r.text());
    const urls=[];
    const seen=new Set();
    const patterns=[
      /https:\/\/media\d*\.giphy\.com\/media\/[^"'<>\s]+?\/giphy\.gif(?:\?[^"'<>\s]*)?/gi,
      /https:\/\/i\.giphy\.com\/[^"'<>\s]+?\.gif(?:\?[^"'<>\s]*)?/gi,
      /https:\/\/media\d*\.giphy\.com\/media\/[^"'<>\s]+?\/giphy\.webp(?:\?[^"'<>\s]*)?/gi
    ];
    for(const re of patterns){
      for(const m of html.matchAll(re)){
        const url=String(m[0]||'').replace(/\\/g,'');
        const key=url.split('?')[0];
        if(!url||seen.has(key))continue;
        seen.add(key);urls.push(url);
        if(urls.length>=24)break;
      }
      if(urls.length>=24)break;
    }
    return json(200,{ok:true,query:q,items:urls.map((url,i)=>({id:`gif-${i}`,url,preview:url}))});
  }catch(error){return json(502,{error:'Unable to search GIPHY.',detail:String(error?.message||error)})}
};
