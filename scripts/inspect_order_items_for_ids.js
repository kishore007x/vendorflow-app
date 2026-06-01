#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

const idsArg = process.argv[2] || process.env.ORDER_IDS || '';
const ids = idsArg.split(',').map(s=>s.trim()).filter(Boolean);
if(ids.length===0){ console.error('Usage: node scripts/inspect_order_items_for_ids.js <comma-separated-order-ids>'); process.exit(1); }

(async()=>{
  const { data, error } = await supabase.from('order_items').select('order_id,product_id,product_name,sku,quantity,unit_price,total').in('order_id', ids).limit(200);
  if(error){ console.error('Error selecting order_items', error); process.exit(1); }
  console.log('Queried order_items rows for', ids.length, 'orders:');
  console.log(JSON.stringify(data, null, 2));
})();
