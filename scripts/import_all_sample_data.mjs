#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = path.resolve(__dirname, '../Sample data');
const FLIPKART_DIR = path.resolve(SAMPLE_DIR, 'Flipkart Sept_Oct_Nov_Dec_2025/Flipkart Sept_Oct_Nov_Dec_2025');
const EXTRACTED_DIR = path.resolve(SAMPLE_DIR, 'extracted');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zsncdvbopkcwoqpiqkjt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbmNkdmJvcGtjd29xcGlxa2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwMzM2NSwiZXhwIjoyMDk0MDc5MzY1fQ.2lEjbqjbF0sv2UBpEuLrE_MZVb6JWxrHHdftzp3k9pQ';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function parseNumber(v) {
  if (v == null || v === '') return null;
  const s = String(v).replace(/[,\s]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString();
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) { const dt = new Date(Number(m[1]), Number(m[2])-1, Number(m[3])); if (!isNaN(dt)) return dt.toISOString(); }
  return null;
}

function cleanSku(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^"+|"+$/g, '');
  s = s.replace(/^SKU:/i, '');
  return s.trim();
}

async function insertBatch(table, rows) {
  if (!rows || rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) { console.error(`  Insert error into ${table}:`, error.message); return inserted; }
    inserted += chunk.length;
  }
  return inserted;
}

async function insertRaw(table, rows) {
  if (!rows || rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) { console.error(`  Insert error into ${table}:`, error.message); return inserted; }
    inserted += chunk.length;
  }
  return inserted;
}

function readAllRows(ws) {
  // Some Excel files have data beyond their declared range.
  // Scan manually up to 2000 rows to find all data.
  const ref = ws['!ref'];
  const range = ref ? XLSX.utils.decode_range(ref) : { s: { c: 0, r: 0 }, e: { c: 50, r: 0 } };
  const maxCol = range.e.c;
  const rows = [];
  for (let r = range.s.r; r <= 2000; r++) {
    const row = [];
    let hasAny = false;
    for (let c = range.s.c; c <= maxCol; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      const val = cell !== undefined ? cell.v : null;
      row.push(val);
      if (val !== null && val !== undefined && String(val).trim() !== '') hasAny = true;
    }
    if (!hasAny && r > range.e.r + 10) break;
    rows.push(row);
  }
  return rows;
}

// ── 1. FLIPKART ORDERS ──
async function importFlipkartOrders() {
  console.log('\n=== 1. Flipkart Orders ===');
  if (!fs.existsSync(FLIPKART_DIR)) { console.log('  Directory not found'); return 0; }
  const files = fs.readdirSync(FLIPKART_DIR).filter(f => f.includes('Orders') && f.endsWith('.xlsx'));
  console.log(`  Found ${files.length} order files`);
  
  // Parse all order rows and collect unique orders + their line items
  const ordersMap = new Map(); // order_id -> { data, items: [{sku, product_name, status, order_date}] }
  for (const file of files) {
    const wb = XLSX.readFile(path.join(FLIPKART_DIR, file), { raw: true });
    const ws = wb.Sheets['Orders'];
    if (!ws) continue;
    const allRows = readAllRows(ws);
    if (allRows.length < 2) continue;
    for (let i = 1; i < allRows.length; i++) {
      const r = allRows[i];
      if (!r || !r[0]) continue;
      const orderId = String(r[1] || '').trim();
      if (!orderId) continue;
      const sku = cleanSku(r[7]);
      const productName = String(r[9] || '').replace(/^"+|"+$/g, '').trim();
      const itemStatus = String(r[6] || '').trim().toLowerCase();
      
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          order_date: r[4],
          items: []
        });
      }
      ordersMap.get(orderId).items.push({ sku, product_name: productName, status: itemStatus });
    }
  }
  console.log(`  Unique orders: ${ordersMap.size}`);

  // Insert orders (deduplicated)
  const ordersToInsert = [];
  for (const [orderId, info] of ordersMap) {
    const statuses = info.items.map(i => i.status);
    const overallStatus = statuses.includes('delivered') ? 'delivered' :
                           statuses.includes('returned') ? 'returned' :
                           statuses.includes('cancelled') ? 'cancelled' : 'confirmed';
    ordersToInsert.push({
      order_number: orderId,
      portal: 'flipkart',
      customer_name: 'Flipkart Customer',
      status: overallStatus,
      order_date: parseDate(info.order_date) || new Date().toISOString(),
      total_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  
  let total = 0;
  if (ordersToInsert.length > 0) {
    total = await insertBatch('orders', ordersToInsert);
    console.log(`  Inserted ${total} orders`);
  }
  
  // Now create order_items from the parsed items
  // First, find the newly inserted orders
  let itemCount = 0;
  const batchSize = 100;
  const orderIds = Array.from(ordersMap.keys());
  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize);
    const { data: dbOrders } = await supabase
      .from('orders')
      .select('id, order_number')
      .in('order_number', batch)
      .eq('portal', 'flipkart');
    if (!dbOrders) continue;
    for (const dbOrder of dbOrders) {
      const info = ordersMap.get(dbOrder.order_number);
      if (!info) continue;
      for (const item of info.items) {
        if (!item.sku) continue;
        const { error } = await supabase.from('order_items').insert([{
          order_id: dbOrder.id,
          product_name: item.product_name || 'Flipkart Product',
          sku: item.sku,
          quantity: 1,
        }]);
        if (!error) itemCount++;
      }
    }
  }
  console.log(`  Created ${itemCount} order_items`);
  return total;
}

// ── 2. FLIPKART RETURNS ──
async function importFlipkartReturns() {
  console.log('\n=== 2. Flipkart Returns ===');
  if (!fs.existsSync(FLIPKART_DIR)) { console.log('  Directory not found'); return 0; }
  const files = fs.readdirSync(FLIPKART_DIR).filter(f => f.includes('Returns') && f.endsWith('.xlsx'));
  console.log(`  Found ${files.length} return files`);
  let total = 0;
  for (const file of files) {
    const wb = XLSX.readFile(path.join(FLIPKART_DIR, file), { raw: true });
    const ws = wb.Sheets['Returns'];
    if (!ws) continue;
    const allRows = readAllRows(ws);
    if (allRows.length < 2) { console.log(`  ${file.split('_')[0]}: header only, no data`); continue; }
    const hdrIdx = allRows.findIndex(r => r.some(c => c !== null && c !== undefined));
    if (hdrIdx < 0) continue;
    const toInsert = [];
    for (let i = hdrIdx + 1; i < allRows.length; i++) {
      const r = allRows[i];
      if (!r || !r[0]) continue;
      toInsert.push({
        order_number: String(r[1] || '').trim(),
        portal: 'flipkart',
        customer_name: 'Flipkart Customer',
        reason: String(r[6] || '').trim(),
        requested_at: parseDate(r[3]) || new Date().toISOString(),
        status: (String(r[5] || '').trim().toLowerCase() === 'approved') ? 'approved' : 'requested',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    if (toInsert.length > 0) {
      const inserted = await insertRaw('returns', toInsert);
      total += inserted;
      console.log(`  ${file.split('_')[0]}: ${inserted} returns`);
    }
  }
  console.log(`  Total Flipkart returns: ${total}`);
  return total;
}

// ── 3. CREATE SKU MAPPINGS (Flipkart + cross-portal) ──
async function createSkuMappings() {
  console.log('\n=== 3. SKU Mappings ===');
  // Fetch all existing products
  const { data: products } = await supabase.from('products').select('*');
  console.log(`  Existing products: ${(products||[]).length}`);

  // Fetch existing sku_mappings
  const { data: existingMappings } = await supabase.from('sku_mappings').select('*');
  console.log(`  Existing SKU mappings: ${(existingMappings||[]).length}`);
  const existingMasterSkus = new Set((existingMappings||[]).map(m => m.master_sku_id));

  // Process Flipkart orders to find SKUs
  const { data: flipkartOrders } = await supabase.from('orders').select('order_number,sku,product_name,portal').eq('portal','flipkart');
  const flipkartSkus = new Map();
  for (const o of flipkartOrders || []) {
    if (o.sku) flipkartSkus.set(o.sku, o.product_name || o.sku);
  }
  console.log(`  Unique Flipkart SKUs: ${flipkartSkus.size}`);

  // Create SKU mappings for Flipkart SKUs that don't exist
  let created = 0;
  for (const [sku, name] of flipkartSkus) {
    if (!existingMasterSkus.has(sku)) {
      const { error } = await supabase.from('sku_mappings').insert([{
        master_sku_id: sku,
        product_name: name || sku,
        flipkart_sku: sku,
      }]);
      if (!error) { created++; existingMasterSkus.add(sku); }
    }
    // Also check if there's a matching product
    const matchingProduct = (products||[]).find(p => String(p.sku||'').toLowerCase() === sku.toLowerCase());
    if (matchingProduct) {
      // Link via order_items
      const { data: orders } = await supabase.from('orders').select('id').eq('sku', sku).eq('portal', 'flipkart');
      for (const o of orders || []) {
        const { data: existing } = await supabase.from('order_items').select('id').eq('order_id', o.id).eq('product_id', matchingProduct.id).limit(1);
        if (!existing || existing.length === 0) {
          const { error: insErr } = await supabase.from('order_items').insert([{
            order_id: o.id,
            product_id: matchingProduct.id,
            product_name: matchingProduct.name || matchingProduct.sku || sku,
            sku: sku,
            quantity: 1,
          }]);
          if (!insErr) created++;
        }
      }
    }
  }
  console.log(`  Created ${created} SKU mappings / order_items`);
  return created;
}

// ── 4. CREATE ORDER ITEMS for Amazon orders missing them ──
async function linkAmazonOrderItems() {
  console.log('\n=== 4. Amazon Order Items ===');
  // Fetch Amazon orders in batches
  const amazonOrders = [];
  let from = 0, done = false;
  while (!done) {
    const { data: batch, error: be } = await supabase
      .from('orders')
      .select('id, order_number, portal')
      .eq('portal', 'amazon')
      .range(from, from + 999);
    if (be) { console.error('  Error:', be.message); break; }
    if (!batch || batch.length === 0) { done = true; break; }
    amazonOrders.push(...batch);
    if (batch.length < 1000) { done = true; break; }
    from += 1000;
  }
  console.log(`  Amazon orders: ${amazonOrders.length}`);

  // Get existing order_items
  const { data: existingItems } = await supabase.from('order_items').select('order_id');
  const linkedOrderIds = new Set((existingItems||[]).map(i => i.order_id));

  const unlinked = (amazonOrders||[]).filter(o => !linkedOrderIds.has(o.id));
  console.log(`  Unlinked Amazon orders: ${unlinked.length}`);

  // Batch insert generic order_items for unlinked orders
  let created = 0;
  for (let i = 0; i < unlinked.length; i += 200) {
    const batch = unlinked.slice(i, i + 200).map(o => ({
      order_id: o.id,
      product_name: 'Amazon Product',
      sku: 'AMAZON-SKU',
      quantity: 1,
    }));
    const { error } = await supabase.from('order_items').insert(batch);
    if (!error) created += batch.length;
  }
  console.log(`  Created ${created} generic order items`);
  return created;
}

// ── 5. GENERATE MISSING ORDER ITEMS for all orders ──
async function linkAllOrderItems() {
  console.log('\n=== 5. All Order Items ===');
  // Get all orders without order_items
  const { data: allOrders } = await supabase.from('orders').select('id, order_number, portal, sku, product_name');
  const { data: existingItems } = await supabase.from('order_items').select('order_id');
  const linkedIds = new Set((existingItems||[]).map(i => i.order_id));
  
  const missing = (allOrders||[]).filter(o => !linkedIds.has(o.id));
  console.log(`  Orders without items: ${missing.length}`);

  // Look up products by SKU
  const { data: allProducts } = await supabase.from('products').select('*');
  const productBySku = new Map();
  for (const p of allProducts || []) {
    if (p.sku) productBySku.set(String(p.sku).toLowerCase(), p);
  }

  let bySku = 0, generic = 0;
  const batchInserts = [];
  for (const o of missing) {
    let productId = null;
    let prodName = o.product_name || 'Unknown Product';
    let skuVal = o.sku || null;

    if (skuVal && productBySku.has(skuVal.toLowerCase())) {
      const match = productBySku.get(skuVal.toLowerCase());
      productId = match.id;
      prodName = match.name || match.sku || prodName;
      bySku++;
    } else {
      generic++;
    }

    batchInserts.push({
      order_id: o.id,
      product_id: productId,
      product_name: prodName,
      sku: skuVal,
      quantity: 1,
    });
  }
  
  let created = 0;
  for (let i = 0; i < batchInserts.length; i += 200) {
    const batch = batchInserts.slice(i, i + 200);
    const { error } = await supabase.from('order_items').insert(batch);
    if (!error) created += batch.length;
  }
  console.log(`  By SKU match: ${bySku}, Generic: ${generic}, Created: ${created}`);
  return created;
}

// ── 6. VERIFY DATA ──
async function verifyData() {
  console.log('\n=== 6. Data Verification ===');
  const tables = ['orders', 'inventory', 'products', 'returns', 'settlements', 'order_items', 'sku_mappings'];
  for (const t of tables) {
    const { data } = await supabase.from(t).select('*');
    console.log(`  ${t}: ${(data||[]).length} rows`);
  }
  
  // Portal distribution
  const { data: orders } = await supabase.from('orders').select('portal');
  const portalCounts = {};
  (orders||[]).forEach(o => { const p = o.portal || '(null)'; portalCounts[p] = (portalCounts[p]||0)+1; });
  console.log('\n  Order portal distribution:');
  for (const [p, c] of Object.entries(portalCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`    ${p}: ${c}`);
  }
}

async function main() {
  console.log('=== Import All Sample Data ===');
  console.log('Sample dir:', SAMPLE_DIR);
  
  let total = 0;
  total += await importFlipkartOrders();
  total += await importFlipkartReturns();
  total += await createSkuMappings();
  total += await linkAmazonOrderItems();
  total += await linkAllOrderItems();
  await verifyData();
  
  console.log(`\n=== FINISHED. Total records created: ${total} ===`);
}

main().catch(err => { console.error(err); process.exit(1); });
