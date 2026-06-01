#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const outPath = 'tmp-zero-total-orders.csv';
  const { data, error } = await supabase.from('orders').select('id,order_number,portal,total_amount,created_at,order_items(id)').or('total_amount.eq.0,total_amount.is.null');
  if(error){ console.error('Error selecting orders', error); process.exit(1); }
  const rows = data.map(o => ({ id: o.id, order_number: o.order_number || '', portal: o.portal || '', total_amount: o.total_amount==null ? '' : o.total_amount, created_at: o.created_at || '', order_items_count: (o.order_items||[]).length }));
  const csv = ['id,order_number,portal,total_amount,created_at,order_items_count', ...rows.map(r => `${r.id},"${r.order_number}",${r.portal},${r.total_amount},${r.created_at},${r.order_items_count}`)].join('\n');
  fs.writeFileSync(outPath, csv);
  console.log('Wrote', outPath, 'with', rows.length, 'rows');
})();
