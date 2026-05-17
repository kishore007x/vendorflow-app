(async()=>{
  const fs = await import('fs');
  const path = 'c:\\Kishore Projects\\vendorflow-hub-main\\.env';
  const content = fs.readFileSync(path,'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const env = {};
  for(const l of lines){ const m = l.match(/([^=]+)=("?)(.*)\2/); if(m) env[m[1].trim()] = m[3].trim(); }
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  if(!url || !key){ console.error('missing url/key'); process.exit(1); }
  const fetch = global.fetch || (await import('node-fetch')).default;
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/orders?portal=eq.firstcry&select=id,order_date,created_at,total_amount`;
  const res = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  console.log('status', res.status);
  const data = await res.text();
  console.log('body preview', data.slice(0,1000));
})();
