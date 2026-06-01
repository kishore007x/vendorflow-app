#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DO_APPLY = (process.env.DO_APPLY === 'true');
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE env vars'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function normal(v){ if(v===null||v===undefined) return null; return String(v).trim(); }
function tryNumber(v){ if(v===null||v===undefined||v==='') return null; const s=String(v).replace(/[,$\s]/g,''); const n=Number(s); return Number.isFinite(n)?n:null; }

(async()=>{
  const csvPath = './tmp-zero-total-no-items.csv';
  if(!fs.existsSync(csvPath)){ console.error('Missing', csvPath); process.exit(1); }
  const csv = fs.readFileSync(csvPath, 'utf8');
  // lightweight CSV parse (assumes well-formed, no embedded newlines in fields)
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map(h=>h.replace(/^\s+|\s+$/g,'').replace(/^"|"$/g,''));
  const rows = lines.slice(1).map(l=>{
    // simple CSV split that handles quoted commas
    const cols = [];
    let cur = '';
    let inQ = false;
    for(let i=0;i<l.length;i++){
      const ch = l[i];
      if(ch === '"') { inQ = !inQ; continue; }
      if(ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur);
    const obj = {};
    for(let i=0;i<header.length;i++) obj[header[i]] = cols[i] ? cols[i].trim().replace(/^"|"$/g,'') : '';
    return obj;
  });
  // Only firstcry for reconstruction now
  const firstcryOrders = rows.filter(r=>r.portal==='firstcry').map(r=>r.order_number);
  console.log('Zero-total firstcry order count:', firstcryOrders.length);

  if(firstcryOrders.length===0){ console.log('No firstcry orders to process. Exiting.'); process.exit(0); }

  // Map order_number -> order id
  const { data: ordersData, error: ordersErr } = await supabase.from('orders').select('id,order_number').in('order_number', firstcryOrders);
  if(ordersErr){ console.error('Error fetching orders:', ordersErr); process.exit(1); }
  const orderMap = new Map( (ordersData||[]).map(o=>[String(o.order_number), o.id]) );
  console.log('Matched orders in DB:', orderMap.size);

  // Fetch raw rows from firstcry_raw_files (limit to 20000)
  const { data: rawRows, error: rawErr } = await supabase.from('firstcry_raw_files').select('id,filename,sheet_name,row_index,row_data').limit(20000);
  if(rawErr){ console.error('Error fetching raw files:', rawErr); process.exit(1); }
  console.log('Fetched raw rows:', (rawRows||[]).length);

  const candidates = [];
  for(const rr of (rawRows||[])){
    const rd = rr.row_data;
    let obj = rd;
    if(typeof rd === 'string'){
      try{ obj = JSON.parse(rd); }catch(e){ obj = rd; }
    }
    if(!obj || typeof obj !== 'object') continue;
    // check if any field contains an order_number
    const values = Object.values(obj).map(v=>normal(v));
    for(const [orderNum, orderId] of orderMap.entries()){
      if(values.find(v => v && v.includes(orderNum))){
        // extract product info heuristically
        const prodId = obj.productid || obj.product_id || obj.product || obj['product id'] || obj['product id.'] || null;
        const sku = obj.sku || obj.sku_code || obj.sku_id || obj.product_sku || null;
        const pname = obj.productname || obj.product_name || obj.product || obj.product_title || null;
        const qty = tryNumber(obj.quantity || obj.qty || obj.orderedquantity || obj['ordered quantity']) || 1;
        const unit_price = tryNumber(obj.unit_price || obj.price || obj.mrp_sales || obj.mrp || obj.rate) || null;
        const total = tryNumber(obj.total || obj.line_total || obj['line total'] || (unit_price ? unit_price * qty : null)) || null;
        candidates.push({ order_number: orderNum, order_id: orderId, raw_row_id: rr.id, filename: rr.filename, sheet: rr.sheet_name, row_index: rr.row_index, product_id: prodId, sku, product_name: pname, quantity: qty, unit_price, total });
      }
    }
  }

  console.log('Candidate order_items found:', candidates.length);
  const grouped = {};
  for(const c of candidates){ grouped[c.order_number] = (grouped[c.order_number] || 0) + 1; }
  console.log('Orders with candidates:', Object.keys(grouped).length);

  // summarize sample
  console.log('Sample candidates (first 20):');
  console.table(candidates.slice(0,20));

  if(!DO_APPLY){
    console.log('Dry-run mode. To apply inserts set DO_APPLY=true in env and re-run.');
    process.exit(0);
  }

  // Prepare inserts
  const inserts = candidates.map(c=>({
    order_id: c.order_id,
    product_id: tryNumber(c.product_id) || null,
    sku: c.sku || null,
    product_name: c.product_name || null,
    quantity: c.quantity || 1,
    unit_price: c.unit_price || 0,
    total: c.total || (c.unit_price ? c.unit_price * c.quantity : 0),
    source: 'reconstruction_from_firstcry_raw',
    raw_row_ref: c.raw_row_id
  }));

  console.log('Prepared', inserts.length, 'order_items to insert. Inserting in batches...');
  const chunkSize = 200;
  let inserted = 0;
  for(let i=0;i<inserts.length;i+=chunkSize){
    const chunk = inserts.slice(i,i+chunkSize);
    const { error } = await supabase.from('order_items').insert(chunk);
    if(error){ console.error('Insert error:', error); process.exit(1); }
    inserted += chunk.length;
    console.log('Inserted', inserted);
  }
  console.log('Done. Inserted', inserted, 'order_items.');
  process.exit(0);
})();
