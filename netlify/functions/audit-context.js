exports.handler=async function(event){
  const headers=event && event.headers ? event.headers : {};
  const readHeader=(name)=>headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
  const forwardedFor=String(readHeader('x-forwarded-for') || '').split(',').map(part=>part.trim()).filter(Boolean);
  const ip=
    readHeader('x-nf-client-connection-ip') ||
    readHeader('client-ip') ||
    forwardedFor[0] ||
    '';

  const body={
    ip: String(ip || '').trim(),
    source: 'netlify_function',
    country: String(readHeader('x-country') || '').trim(),
    region: String(readHeader('x-region') || '').trim(),
    city: String(readHeader('x-city') || '').trim()
  };

  return {
    statusCode: 200,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store'
    },
    body: JSON.stringify(body)
  };
};
