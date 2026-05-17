#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
function parseDate(v){ if(!v) return null; const d=new Date(v); if(!isNaN(d)) return d.toISOString(); return null; }

async function fetchRaw(limit=1000, offset=0){ const { data, error } = await supabase.from('firstcry_raw_files').select('*').order('id',{ascending:true}).range(offset, offset+limit-1); if(error) throw error; return data||[]; }

async function upsertChunks(table, rows, onConflict){ if(!rows || rows.length===0) return {count:0}; const chunkSize=200; let inserted=0; for(let i=0;i<rows.length;i+=chunkSize){ const chunk=rows.slice(i,i+chunkSize); try{ const { error } = await supabase.from(table).upsert(chunk, { onConflict }); if(error){ console.error('Upsert error', table, error.message || error); return {count:inserted, error}; } inserted+=chunk.length; console.log(`Upserted ${inserted} into ${table}`); }catch(e){ console.error('Upsert exception', e); return {count:inserted, error:e}; } } return {count:inserted}; }

async function main(){
  console.log('Fetching raw rows in batches...');
  const rawRows = [];
  let offset = 0;
  const batchSize = 1000;
  while (true) {
    const batch = await fetchRaw(batchSize, offset);
    if (!batch || batch.length === 0) break;
    rawRows.push(...batch);
    console.log('Fetched batch', offset / batchSize + 1, 'size', batch.length);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }
  console.log('Total raw rows fetched:', rawRows.length);
  const products = [];
  const orders = [];
  for(const r of rawRows){
    const rd = r.row_data || r.row_data_json || r.row_data;
    const row = typeof rd==='string' ? JSON.parse(rd) : (rd||{});
    // Product heuristics
    const sku = findField(row,['sku','sku_id','product_sku','vendor_style_code','vendorstylecode','productid','product_id','msku','asin','fnsku']);
    const name = findField(row,['product_name','productname','name','title']);
    const mrp = parseNumber(findField(row,['mrp','price','list_price','mrp_sales']));
    const cost = parseNumber(findField(row,['land_cost','cost']));
    const brand = findField(row,['brand','brand_name','brandname']);
    // If we have a SKU-like identifier, upsert as product even if other fields are sparse
    if(sku){
      products.push({ sku: String(sku), name: name || undefined, mrp: mrp || undefined, cost: cost || undefined, brand: brand || undefined, portal: findField(row,['amazon_store','portal','marketplace']) || undefined, source_raw_id: r.id });
    } else if(name && (mrp || cost || brand)){
      products.push({ sku: undefined, name: name, mrp: mrp || undefined, cost: cost || undefined, brand: brand || undefined, source_raw_id: r.id });
    }
    // Order heuristics
    const poid = findField(row,['poid','order_id','orderid','order_number','order_no']);
    const order_date = parseDate(findField(row,['order_date','orderdate','date']));
    const quantity = parseNumber(findField(row,['quantity','qty','ordered_quantity']));
    const product_id = parseNumber(findField(row,['productid','product_id']));
    // If explicit order id or date present, push as order
    if(poid || order_date){
      orders.push({ poid: poid?String(poid):undefined, order_number: poid?String(poid):undefined, order_date: order_date || undefined, quantity: quantity || undefined, product_id: product_id || undefined, portal: findField(row,['amazon_store','portal','marketplace']) || 'firstcry', source_raw_id: r.id });
    } else {
      // Heuristic: many metric reports use units/units_sold/units_shipped with start_date/end_date — synthesize lightweight order rows
      const units = parseNumber(findField(row, ['units_shipped','units_sold','units','quantity','net_units_sold','promotion_units_ordered']));
      const anyDate = parseDate(findField(row,['start_date','end_date','date','order_date','sale_date']));
      const skuCandidate = findField(row, ['sku','msku','asin','fnsku','productid','product_id']);
      if(units && anyDate){
        const syntheticPoid = `raw-${r.id}-${skuCandidate?String(skuCandidate).replace(/[^a-zA-Z0-9_-]/g,''):'x'}`;
        orders.push({ poid: syntheticPoid, order_number: syntheticPoid, order_date: anyDate, quantity: units, product_id: undefined, portal: findField(row,['amazon_store','portal','marketplace']) || 'firstcry', source_raw_id: r.id });
      }
    }
  }

  console.log('Prepared', products.length, 'product upserts and', orders.length, 'order upserts');
  if(products.length>0){
    // Deduplicate by SKU to avoid ON CONFLICT affecting same row multiple times
    const m = new Map();
    for(const p of products){ if(!p.sku) continue; if(!m.has(p.sku)) m.set(p.sku, { sku: p.sku, name: p.name || `SKU:${p.sku}` }); }
    const payload = Array.from(m.values());
    const res = await upsertChunks('products', payload, 'sku');
    console.log('Products upsert result', res.count);
  }
  if(orders.length>0){
    // attempt on order_number or poid, fallback to no conflict if schema lacks those columns
    // Only include columns we expect to exist in `orders` to avoid schema errors
    const payload = orders.map(o=>({ order_number: o.order_number, order_date: o.order_date, portal: o.portal || 'firstcry', customer_name: o.customer_name || 'Imported' }));
    let res2 = await upsertChunks('orders', payload, 'order_number');
    if(res2.error && /Could not find the '.concat("'order_number'") .concat(' column')/i.test(String(res2.error))){
      console.log('order_number conflict not available, retrying without conflict');
      res2 = await upsertChunks('orders', payload, undefined);
    }
    // If still error and original suggested 'poid' might exist, try poid
    if(res2.error){
      console.log('Retrying with poid conflict as last resort');
      res2 = await upsertChunks('orders', payload, 'poid');
    }
    console.log('Orders upsert result', res2.count || 0);
  }
  console.log('Done');
}

main().catch(e=>{ console.error('Failed', e); process.exit(1); });
