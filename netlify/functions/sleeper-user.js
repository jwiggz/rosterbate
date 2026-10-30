const API='https://api.sleeper.app/v1';

function json(statusCode,body){
  return {statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'},body:JSON.stringify(body)};
}

exports.handler=async function(event){
  if(event.httpMethod&&event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
  const username=String(event.queryStringParameters?.username||'').trim();
  if(!username||username.length>64)return json(400,{error:'Enter a valid Sleeper username.'});
  try{
    const r=await fetch(`${API}/user/${encodeURIComponent(username)}`,{headers:{Accept:'application/json','User-Agent':'RosterBate/1.0'},cache:'no-store'});
    if(r.status===404)return json(404,{error:'Sleeper user not found.'});
    if(!r.ok)return json(r.status,{error:`Sleeper returned ${r.status}.`});
    const user=await r.json();
    if(!user?.user_id)return json(404,{error:'Sleeper user not found.'});
    return json(200,{ok:true,user:{user_id:String(user.user_id),username:String(user.username||username),display_name:String(user.display_name||user.username||username),avatar:user.avatar||null}});
  }catch(e){
    return json(502,{error:'Unable to reach Sleeper right now.'});
  }
};
