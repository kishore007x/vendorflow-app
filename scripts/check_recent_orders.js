(async()=>{
  try{
    const { createClient } = (await import('@supabase/supabase-js'));
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!SUPABASE_URL || !SUPABASE_KEY){
      console.error('Supabase env not set');
      process.exit(0);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    // Fetch orders where either order_date or created_at is within the last 14 days
    const expr = `order_date.gte.${since},created_at.gte.${since}`;
    const { data, error } = await supabase.from('orders').select('id,order_date,created_at,total_amount,portal').or(expr).eq('portal','firstcry').limit(50);
    if(error){ console.error('Supabase error', error); process.exit(1); }
    console.log('since', since);
    console.log('matching orders:', (data||[]).length);
    console.log((data||[]).slice(0,10));
  }catch(e){ console.error(e); process.exit(1); }
})();
