#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function normalizeKey(k){ if(!k) return k; return String(k).trim().replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'').toLowerCase(); }
function findField(obj, names){ if(!obj) return null; for(const n of names){ const k = Object.keys(obj).find(x=>normalizeKey(x)===normalizeKey(n)); if(k) return obj[k]; } return null; }
function parseNumber(v){ if(v==null || v==='') return null; if(typeof v==='number') return v; const s=String(v).replace(/[ ,]/g,''); const n=Number(s); return Number.isFinite(n)?n:null; }

async function main(){
  console.log('Fetching orders with synthetic raw IDs (order_number like raw-...)');
  const { data: orders, error: ordErr } = await supabase.from('orders').select('*').ilike('order_number','raw-%').limit(1000);
  if(ordErr){ console.error('Failed fetching orders', ordErr); process.exit(1); }
  if(!orders || orders.length===0){ console.log('No synthetic orders found.'); return; }
  console.log('Found', orders.length, 'synthetic orders.');

  let created = 0;
  for(const o of orders){
    try{
      const parts = String(o.order_number).split('-');
      const rawId = parts.length >= 2 ? Number(parts[1]) : null;
      if(!rawId){ console.log('Skipping order (no raw id):', o.order_number); continue; }

      const { data: rawRows, error: rawErr } = await supabase.from('firstcry_raw_files').select('id,row_data').eq('id', rawId).limit(1);
      if(rawErr){ console.warn('Failed to fetch raw row', rawErr); continue; }
      if(!rawRows || rawRows.length===0){ console.log('Raw row not found for id', rawId); continue; }
      const raw = rawRows[0];
      const rd = raw.row_data_json || raw.row_data || raw.row_data;
      const row = typeof rd === 'string' ? JSON.parse(rd) : (rd || {});

      const sku = findField(row,['sku','sku_id','product_sku','vendor_style_code','vendorstylecode','productid','product_id','msku','asin','fnsku']);
      const units = parseNumber(findField(row, ['units_shipped','units_sold','units','quantity','net_units_sold','promotion_units_ordered'])) || 1;

      if(!sku){ console.log('No SKU found in raw row', rawId, 'for order', o.order_number); continue; }

      // find product by SKU
      const { data: products, error: prodErr } = await supabase.from('products').select('id,sku,name').ilike('sku', String(sku));
      if(prodErr){ console.warn('Product lookup failed', prodErr); continue; }
      if(!products || products.length===0){ console.log('No product found for SKU', sku, 'rawId', rawId); continue; }
      const product = products[0];

      // check if an order_items row already exists
      const { data: existingItems } = await supabase.from('order_items').select('*').eq('order_id', o.id).eq('product_id', product.id).limit(1);
      if(existingItems && existingItems.length>0){ console.log('Order item already exists for order', o.order_number); continue; }

      const insert = { order_id: o.id, product_id: product.id, product_name: product.name || product.sku || 'Imported', sku: product.sku || null, quantity: Math.max(1, Math.floor(Number(units) || 1)) };
      const { error: insErr } = await supabase.from('order_items').insert([insert]);
      if(insErr){ console.warn('Failed inserting order_item for order', o.order_number, insErr); continue; }
      created++;
      console.log('Linked order', o.order_number, '→ product', product.sku);
    }catch(e){ console.error('Error processing order', o.order_number, e); }
  }

  console.log('Done. Created', created, 'order_items.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
