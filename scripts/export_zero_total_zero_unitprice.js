#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const outPath = 'tmp-zero-total-zero-unitprice.csv';
  const { data, error } = await supabase.from('orders').select('id,order_number,portal,total_amount,created_at,order_items(id,product_id,quantity,unit_price,total)').or('total_amount.eq.0,total_amount.is.null');
  if(error){ console.error('Error selecting orders', error); process.exit(1); }
  const rows = [];
  for(const o of data){
    if(o.order_items && o.order_items.length>0){
      for(const it of o.order_items){
        if(it.unit_price==null || Number(it.unit_price)===0){
          rows.push({ order_id: o.id, order_number:o.order_number||'', portal:o.portal||'', item_id:it.id, product_id:it.product_id||'', quantity:it.quantity||0, unit_price:it.unit_price==null? '': it.unit_price, total: it.total==null? '': it.total });
        }
      }
    }
  }
  const csv = ['order_id,order_number,portal,item_id,product_id,quantity,unit_price,total', ...rows.map(r => `${r.order_id},"${r.order_number}",${r.portal},${r.item_id},${r.product_id},${r.quantity},${r.unit_price},${r.total}`)].join('\n');
  fs.writeFileSync(outPath, csv);
  console.log('Wrote', outPath, 'with', rows.length, 'rows');
})();
