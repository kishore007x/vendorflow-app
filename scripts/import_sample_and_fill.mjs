#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf-8').split('\n').filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const SAMPLE_DIR = path.resolve(__dirname, '../Sample data/extracted/Amazon');
const PORTALS_WITH_ORDERS = ['firstcry', 'flipkart', 'amazon', 'meesho'];

function parseNumber(v) {
  if (v == null || v === '') return null;
  const s = String(v).replace(/[,\s]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString();
  const m = String(v).trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const mon = months[m[2].toLowerCase()];
    if (mon) {
      const dt = new Date(`${m[3]}-${mon}-${m[1].padStart(2, '0')}`);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
  }
  return null;
}

function amazonStatusMap(s) {
  s = (s || '').trim().toLowerCase();
  if (s === 'shipped') return 'shipped';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'pending') return 'pending';
  if (s === 'unshipped' || s === 'partiallyshipped') return 'confirmed';
  return 'pending';
}

function amazonReturnStatus(s) {
  s = (s || '').trim().toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'refundatfirstscan' || s === 'refund_initiated') return 'refund_initiated';
  if (s === 'closed') return 'closed';
  return 'requested';
}

async function getAllRows(table, select = '*') {
  const rows = [];
  let from = 0, done = false;
  while (!done) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) { console.error('Error:', error.message); return rows; }
    if (!data || data.length === 0) { done = true; break; }
    rows.push(...data);
    if (data.length < 1000) { done = true; break; }
    from += 1000;
  }
  return rows;
}

function parseTsv(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split('\t');
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] !== undefined ? vals[idx].trim() : null; });
    rows.push(obj);
  }
  return rows;
}

async function upsertBatch(table, rows, onConflict) {
  if (!rows || rows.length === 0) return { inserted: 0, skipped: 0 };
  let inserted = 0, skipped = 0;
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table)
      .upsert(chunk, { onConflict, ignoreDuplicates: true, count: 'exact' })
      .select('id', { count: 'exact' });
    if (error) {
      console.error(`  [${table}] upsert error: ${error.message}`);
      skipped += chunk.length;
    } else {
      inserted += data?.length || 0;
      skipped += chunk.length - (data?.length || 0);
    }
  }
  return { inserted, skipped };
}

async function importAmazonOrders() {
  console.log('\n=== Amazon orders from .txt files ===');
  const files = fs.readdirSync(SAMPLE_DIR).filter(f => /\.txt$/i.test(f));
  console.log(`Found ${files.length} TXT files`);
  let totalInserted = 0, totalSkipped = 0;
  for (const file of files.sort()) {
    const records = parseTsv(fs.readFileSync(path.join(SAMPLE_DIR, file), 'utf-8'));
    const toInsert = records.map(r => {
      const itemPrice = parseNumber(r['item-price']) || 0;
      const shippingPrice = parseNumber(r['shipping-price']) || 0;
      const orderNumber = r['amazon-order-id'] || r['merchant-order-id'];
      return {
        order_number: orderNumber,
        portal: 'amazon',
        customer_name: 'Amazon Customer',
        customer_city: r['ship-city'] || null,
        customer_state: r['ship-state'] || null,
        customer_pincode: r['ship-postal-code'] || null,
        status: amazonStatusMap(r['order-status']),
        total_amount: itemPrice,
        shipping_fee: shippingPrice,
        order_date: parseDate(r['purchase-date']) || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    const { inserted, skipped } = await upsertBatch('orders', toInsert, 'order_number');
    console.log(`  ${file}: ${records.length} rows | +${inserted} new, ${skipped} already exist`);
    totalInserted += inserted; totalSkipped += skipped;
  }
  console.log(`  Total: +${totalInserted} new orders, ${totalSkipped} already existed`);
  return { totalInserted, totalSkipped };
}

async function importAmazonReturnsTsv() {
  console.log('\n=== Amazon returns from .tsv files ===');
  const files = fs.readdirSync(SAMPLE_DIR).filter(f => /^report-.+\.tsv$/i.test(f));
  console.log(`Found ${files.length} TSV files`);
  let totalInserted = 0;
  for (const file of files.sort()) {
    const records = parseTsv(fs.readFileSync(path.join(SAMPLE_DIR, file), 'utf-8'));
    const toInsert = records.map(r => {
      const orderNum = String(r['Order ID'] || '');
      return {
        order_number: orderNum,
        portal: 'amazon',
        customer_name: 'Amazon Customer',
        reason: r['Return reason'] || null,
        refund_amount: parseNumber(r['Refunded Amount']),
        requested_at: parseDate(r['Return request date']) || new Date().toISOString(),
        resolved_at: parseDate(r['Return delivery date']) || null,
        status: amazonReturnStatus(r['Return request status']),
        claim_status: r['Return request status'] || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }).filter(r => r.order_number);
    const { inserted, skipped } = await upsertBatch('returns', toInsert, 'id');
    console.log(`  ${file}: ${records.length} rows | +${inserted} new, ${skipped} already exist`);
    totalInserted += inserted;
  }
  return totalInserted;
}

async function importAmazonReturnsXml() {
  console.log('\n=== Amazon returns from .xml file ===');
  const files = fs.readdirSync(SAMPLE_DIR).filter(f => /\.xml$/i.test(f));
  if (!files.length) { console.log('  no XML file'); return 0; }
  const xml = fs.readFileSync(path.join(SAMPLE_DIR, files[0]), 'utf-8');
  const records = [];
  const regex = /<return_details>([\s\S]*?)<\/return_details>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => { const m = block.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`)); return m ? m[1].trim() : null; };
    records.push({
      order_id: get('order_id'),
      return_request_date: get('return_request_date'),
      return_request_status: get('return_request_status'),
      return_reason: get('return_reason_code'),
      resolution: get('resolution'),
      refund_amount: get('refund_amount'),
      return_delivery_date: get('return_delivery_date'),
    });
  }
  const toInsert = records.map(r => ({
    order_number: r.order_id || null,
    portal: 'amazon',
    customer_name: 'Amazon Customer',
    reason: r.return_reason || r.resolution || null,
    refund_amount: parseNumber(r.refund_amount),
    requested_at: parseDate(r.return_request_date) || new Date().toISOString(),
    resolved_at: parseDate(r.return_delivery_date) || null,
    status: amazonReturnStatus(r.return_request_status),
    claim_status: r.return_request_status || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })).filter(r => r.order_number);
  const { inserted, skipped } = await upsertBatch('returns', toInsert, 'id');
  console.log(`  ${files[0]}: ${records.length} rows | +${inserted} new, ${skipped} already exist`);
  return inserted;
}

async function generateInventoryForPortals() {
  console.log('\n=== Generate inventory rows for all portals ===');
  const products = await getAllRows('products', 'id, sku, name, brand, base_price, mrp');
  console.log(`Found ${products.length} products`);

  const existing = await getAllRows('inventory', 'sku_id, portal');
  const existingKeys = new Set(existing.map(r => `${r.sku_id || ''}::${(r.portal || '').toLowerCase()}`));
  console.log(`Existing inventory: ${existing.length} rows`);

  const toInsert = [];
  let counter = 0;
  for (const portal of PORTALS_WITH_ORDERS) {
    for (const p of products) {
      const key = `${p.sku || ''}::${portal}`;
      if (existingKeys.has(key)) continue;
      toInsert.push({
        sku_id: p.sku,
        product_name: p.name,
        brand: p.brand,
        portal,
        warehouse: 'Primary',
        master_quantity: 50,
        available_quantity: 50,
        reserved_quantity: 0,
        low_stock_threshold: 10,
        channel_allocations: {},
        aging_days: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      counter++;
    }
  }
  console.log(`Generated ${toInsert.length} new inventory rows (one per product per portal)`);

  if (toInsert.length === 0) return 0;
  const { inserted, skipped } = await upsertBatch('inventory', toInsert, 'id');
  console.log(`  Inserted: ${inserted}, skipped: ${skipped}`);
  return inserted;
}

async function verifyCounts() {
  console.log('\n=== POST-IMPORT STATE ===');
  for (const t of ['orders', 'returns', 'inventory', 'products', 'sku_mappings', 'order_items']) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}`);
  }
  const inv = await getAllRows('inventory', 'portal');
  const ip = {};
  inv.forEach(r => { const k = r.portal || '(null)'; ip[k] = (ip[k] || 0) + 1; });
  console.log('  Inventory by portal:', ip);
  const ord = await getAllRows('orders', 'portal');
  const op = {};
  ord.forEach(r => { const k = r.portal || '(null)'; op[k] = (op[k] || 0) + 1; });
  console.log('  Orders by portal:', op);
}

async function main() {
  console.log('=== Importing Amazon sample data + generating inventory ===');
  await importAmazonOrders();
  await importAmazonReturnsTsv();
  await importAmazonReturnsXml();
  await generateInventoryForPortals();
  await verifyCounts();
  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
