#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

// Dry-run by default; set RUN=apply to perform updates
const DO_APPLY = process.env.RUN === 'apply';
const candidateFields = ['price','base_price','mrp','retail_price','selling_price','default_price','cost_price','list_price'];

(async()=>{
  console.log('Starting backfill_order_items_unit_price, DO_APPLY=', DO_APPLY);
  // Fetch order_items where unit_price is null or 0 and product_id is not null
  const { data: items, error } = await supabase.from('order_items').select('id,order_id,product_id,quantity,unit_price,total').or('unit_price.is.null,unit_price.eq.0').not('product_id', 'is', null).limit(1000);
  if(error){ console.error('Error selecting order_items', error); process.exit(1); }
  console.log('Found', items.length, 'order_items with null/0 unit_price and product_id');
  let updated = 0;
  for(const it of items){
    // fetch product
    const { data: prod, error: pErr } = await supabase.from('products').select('*').eq('id', it.product_id).limit(1).maybeSingle();
    if(pErr){ console.error('Error fetching product', pErr); continue; }
    if(!prod){ console.log('No product for product_id', it.product_id); continue; }
    // find first candidate field
    let price = null;
    for(const f of candidateFields){ if(f in prod && prod[f]!=null && prod[f]!=0){ price = Number(prod[f]); break; } }
    if(price==null){ continue; }
    const newUnit = price;
    const newTotal = Number(newUnit) * Number(it.quantity || 1);
    if(!DO_APPLY){
      console.log('[DRY] Would update order_item', it.id, 'unit_price ->', newUnit, 'total ->', newTotal);
      updated++;
    } else {
      const { error: uErr } = await supabase.from('order_items').update({ unit_price: newUnit, total: newTotal }).eq('id', it.id);
      if(uErr){ console.error('Update error for item', it.id, uErr); continue; }
      updated++;
    }
  }
  console.log((DO_APPLY? 'Applied' : 'DRY-RUN') , 'updates for', updated, 'items');
})();
