(async ()=>{
  const fs = await import('fs');
  const path = 'c:\\Kishore Projects\\vendorflow-hub-main\\.env';
  const content = fs.readFileSync(path,'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const env = {};
  for(const l of lines){ const m = l.match(/([^=]+)=("?)(.*)\2/); if(m) env[m[1].trim()] = m[3].trim(); }
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if(!url || !serviceKey){ console.error('missing url or service role key'); process.exit(1); }
  const fetch = global.fetch || (await import('node-fetch')).default;
  const base = url.replace(/\/$/, '');

  async function fetchJson(endpoint){
    const res = await fetch(endpoint, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if(!res.ok){ const t = await res.text(); throw new Error(`${res.status} ${t}`); }
    return res.json();
  }

  try{
    console.log('Querying orders (fetching up to 20000 rows) to compute portal distribution...');
    const orders = await fetchJson(`${base}/rest/v1/orders?select=portal&limit=20000`);
    const portalMap = {};
    (orders || []).forEach(o => { const p = (o.portal||'unknown').toString(); portalMap[p] = (portalMap[p]||0)+1; });
    const portalList = Object.entries(portalMap).map(([portal, count]) => ({ portal, count })).sort((a,b)=>b.count-a.count);
    console.log('Orders by portal:');
    console.table(portalList);

    console.log('\nChecking products for portals_enabled containing "second"...');
    const productsAll = await fetchJson(`${base}/rest/v1/products?select=id,name,sku,portals_enabled&limit=5000`);
    const prodMatches = (productsAll || []).filter(p => JSON.stringify(p.portals_enabled || '').toLowerCase().includes('second'));
    console.log(`Products matching portals_enabled containing 'second': ${prodMatches.length}`);
    if(prodMatches.length>0) console.table(prodMatches.slice(0,30));

    console.log('\nChecking raw files table for filenames/source containing "second"...');
    // try common table names
    const candidates = ['firstcry_raw_files','raw_files','raw_imports','imports'];
    for(const t of candidates){
      try{
        const rows = await fetchJson(`${base}/rest/v1/${t}?select=id,filename,source,created_at&limit=100`);
        const matches = rows.filter(r => JSON.stringify(r).toLowerCase().includes('second'));
        if(matches.length>0){
          console.log(`Table ${t} has ${matches.length} rows with 'second' in fields (showing up to 10):`);
          console.table(matches.slice(0,10));
        } else {
          console.log(`Table ${t}: no 'second' matches in sample`);
        }
      }catch(e){ /* ignore missing table */ }
    }

    // Also check orders where portal ilike '%second%'
    try{
      const scOrders = await fetchJson(`${base}/rest/v1/orders?portal=ilike.*second*&select=* &limit=100`);
      console.log(`\nOrders with portal ilike '%second%': ${scOrders.length}`);
      if(scOrders.length>0) console.table(scOrders.slice(0,10));
    }catch(e){ console.log('orders ilike query failed', e.message); }

  }catch(e){ console.error('Error', e); process.exit(1); }
})();
