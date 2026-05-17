(async()=>{
  try{
    const { createClient } = (await import('@supabase/supabase-js'));
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!SUPABASE_URL || !SUPABASE_KEY){ console.error('Supabase env not set'); process.exit(0); }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const tables = [
      'products','orders','order_items','inventory','returns','settlements','reconciliation_logs','broadcasts','alerts','customers','vendors','invoices','invoice_items','product_health','firstcry_raw_files','sku_mappings','tasks','employees','warehouses','expenses','videos'
    ];
    for(const name of tables){
      try{
        const { count, error } = await supabase.from(name).select('id',{count:'exact', head:true});
        if(error) console.log(`${name}: ERROR - ${error.message}`);
        else console.log(`${name}: ${count}`);
      }catch(e){ console.log(`${name}: EXCEPTION - ${e.message}`); }
    }
  }catch(e){ console.error(e); process.exit(1); }
})();
