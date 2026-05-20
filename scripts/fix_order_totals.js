#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env minimally
let env = {};
try {
  const raw = fs.readFileSync('.env','utf8');
  raw.split(/\r?\n/).forEach(line=>{
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.*))\s*$/);
    if(m) env[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  });
} catch(e) {}

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL || !SUPABASE_KEY){
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession:false }});

async function main(){
  console.log('Fetching order_items...');
  const { data: items, error: itemsErr } = await supabase.from('order_items').select('order_id, quantity, unit_price');
  if(itemsErr) throw itemsErr;
  const sums = new Map();
  for(const it of items){
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    const cur = sums.get(it.order_id) || 0;
    sums.set(it.order_id, cur + q * p);
  }

  console.log('Fetching orders needing fix...');
  const { data: orders, error: ordersErr } = await supabase.from('orders').select('id,total_amount').or('total_amount.is.null,total_amount.eq.0');
  if(ordersErr) throw ordersErr;

  console.log('Orders to update:', orders.length);
  const batches = [];
  const batchSize = 50;
  for(let i=0;i<orders.length;i+=batchSize){
    batches.push(orders.slice(i,i+batchSize));
  }

  for(const [bi,batch] of batches.entries()){
    console.log(`Processing batch ${bi+1}/${batches.length} (${batch.length} orders)`);
    await Promise.all(batch.map(async ord=>{
      const newTotal = Number(sums.get(ord.id) || 0);
      const { error } = await supabase.from('orders').update({ total_amount: newTotal }).eq('id', ord.id);
      if(error) console.error('Update error for', ord.id, error.message);
    }));
  }

  // final cleanup: set any remaining NULLs to 0
  const { error: finalErr } = await supabase.from('orders').update({ total_amount: 0 }).is('total_amount', null);
  if(finalErr) console.error('Final cleanup error', finalErr.message);

  console.log('Done');
}

main().catch(err=>{ console.error(err); process.exit(1); });
