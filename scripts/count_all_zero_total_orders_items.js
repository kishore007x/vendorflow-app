#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const { data, error } = await supabase.from('orders').select('id,portal,total_amount,order_items(id)').or('total_amount.eq.0,total_amount.is.null');
  if(error){ console.error('Error selecting orders', error); process.exit(1); }
  const total = data.length;
  let noItems = 0;
  for(const o of data){ if(!o.order_items || o.order_items.length===0) noItems++; }
  console.log('Total orders with total_amount=0 or NULL:', total);
  console.log('Count with no order_items:', noItems);
})();
