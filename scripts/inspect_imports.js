#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  try{
    const { data: products, error: pErr } = await supabase.from('products').select('id,sku,name,brand,mrp,created_at').limit(10).order('created_at',{ascending:false});
    if(pErr) console.error('Products error', pErr);
    else console.log('Products sample:', products);

    const { data: orders, error: oErr } = await supabase.from('orders').select('id,order_number,order_date,portal,customer_name,created_at').limit(10).order('created_at',{ascending:false});
    if(oErr) console.error('Orders error', oErr);
    else console.log('Orders sample:', orders);

    const { data: pCount } = await supabase.from('products').select('id', { count: 'exact' }).limit(1);
    const { data: oCount } = await supabase.from('orders').select('id', { count: 'exact' }).limit(1);
    console.log('Products count (approx):', Array.isArray(pCount)?pCount.length:'unknown');
    console.log('Orders count (approx):', Array.isArray(oCount)?oCount.length:'unknown');

  }catch(e){ console.error('Failed', e); process.exit(1); }
})();
