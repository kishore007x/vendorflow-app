(async()=>{
  try{
    const { createClient } = (await import('@supabase/supabase-js'));
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!SUPABASE_URL || !SUPABASE_KEY){ console.error('Supabase env not set'); process.exit(0); }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const tables = [
      { name: 'orders', filter: "portal='firstcry'" },
      { name: 'products' },
      { name: 'order_items' },
      { name: 'product_health' },
      { name: 'vendors' },
      { name: 'settlements' },
      { name: 'returns' },
      { name: 'broadcasts' },
      { name: 'firstcry_raw_files' },
    ];
    for(const t of tables){
      let q = supabase.from(t.name).select('id', { count: 'exact', head: true });
      if(t.filter) q = supabase.rpc ? supabase.from(t.name).select('id', { count: 'exact', head: true }).filter('portal','eq','firstcry') : q;
      const { count, error } = await q;
      if(error){
        console.log(`${t.name}: error (${error.code}) - ${error.message}`);
      } else {
        console.log(`${t.name}: ${count}`);
      }
    }
  }catch(e){ console.error(e); process.exit(1); }
})();
