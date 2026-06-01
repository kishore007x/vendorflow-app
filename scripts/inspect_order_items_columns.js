#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const { data, error } = await supabase.from('order_items').select('*').limit(1);
  if(error){ console.error('Error selecting order_items', error); process.exit(1); }
  if(!data || data.length===0){ console.log('order_items exists but has no rows'); process.exit(0); }
  console.log('Sample order_items keys:', Object.keys(data[0]));
  const { data: sampleRows, error: sampleErr } = await supabase.from('order_items').select('order_id,product_id,product_name,sku,quantity,unit_price,total').limit(5);
  if(sampleErr){ console.error('Error sampling order_items', sampleErr); process.exit(1); }
  console.log('Sample order_items rows:', JSON.stringify(sampleRows, null, 2));
})();
