#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../Sample data');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

function parseNumber(v) {
  if (v === null || v === undefined || v === '') return null;
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
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
    const mon = months[m[2].toLowerCase()];
    if (mon) {
      const dt = new Date(`${m[3]}-${mon}-${m[1]}`);
      if (!isNaN(dt)) return dt.toISOString();
    }
  }
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m2) {
    const dt = new Date(Number(m2[3]), Number(m2[2])-1, Number(m2[1]));
    if (!isNaN(dt)) return dt.toISOString();
  }
  return null;
}

function returnStatus(s) {
  const v = (s || '').trim().toLowerCase();
  if (v === 'approved') return 'approved';
  if (v === 'rejected') return 'rejected';
  if (v === 'closed') return 'closed';
  if (v === 'refund_initiated' || v === 'refundatfirstscan') return 'refund_initiated';
  return 'requested';
}

async function insertBatch(table, rows) {
  if (!rows || rows.length === 0) return 0;
  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  Insert error into ${table}:`, error.message);
      return inserted;
    }
    inserted += chunk.length;
  }
  return inserted;
}

// ── 1. Amazon Returns ──
async function importAmazonReturns() {
  const dir = path.join(DATA_DIR, 'Amazon/Amazon');
  const files = fs.readdirSync(dir).filter(f => /^report-.+\.tsv$/i.test(f));
  console.log(`\n=== 1. Amazon Returns → returns table (${files.length} files) ===`);
  let total = 0;
  for (const file of files.sort()) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) continue;
    const headers = lines[0].split('\t').map(h => h.trim());
    const records = lines.slice(1).map(l => {
      const vals = l.split('\t');
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx] !== undefined ? vals[idx].trim() : null; });
      return obj;
    });
    const toInsert = records.map(r => ({
      order_number: String(r['Order ID'] || `AMZ-RETURN-${Date.now()}-${Math.random().toString(36).slice(2,6)}`),
      portal: 'amazon',
      customer_name: 'Amazon Customer',
      reason: r['Return reason'] || null,
      refund_amount: parseNumber(r['Refunded Amount']),
      requested_at: parseDate(r['Return request date']) || new Date().toISOString(),
      resolved_at: parseDate(r['Return delivery date']) || null,
      status: returnStatus(r['Return request status']),
      claim_status: r['Return request status'] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const inserted = await insertBatch('returns', toInsert);
    total += inserted;
    console.log(`  ${file}: ${inserted}/${records.length} inserted`);
  }
  return total;
}

async function importAmazonReturnsXML() {
  const dir = path.join(DATA_DIR, 'Amazon/Amazon');
  const files = fs.readdirSync(dir).filter(f => /\.xml$/i.test(f));
  if (!files.length) return 0;
  console.log(`\n=== 2. Amazon Returns XML → returns table (1 file) ===`);
  const xml = fs.readFileSync(path.join(dir, files[0]), 'utf-8');
  const records = [];
  const regex = /<return_details>([\s\S]*?)<\/return_details>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => { const m = block.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`)); return m ? m[1].trim() : null; };
    records.push({
      order_id: get('order_id'),
      order_date: get('order_date'),
      return_request_date: get('return_request_date'),
      return_request_status: get('return_request_status'),
      asin: get('asin'),
      merchant_sku: get('merchant_sku'),
      item_name: get('item_name'),
      return_quantity: get('return_quantity'),
      return_reason: get('return_reason_code'),
      resolution: get('resolution'),
      invoice_number: get('invoice_number'),
      category: get('category'),
      refund_amount: get('refund_amount'),
      order_amount: get('order_amount'),
      label_cost: get('label_cost'),
      label_type: get('label_type'),
      return_type: get('return_type'),
      return_delivery_date: get('return_delivery_date'),
      a_to_z_claim: get('a_to_z_claim'),
    });
  }
  const toInsert = records.map(r => ({
    order_number: String(r.order_id || `AMZ-XML-${Date.now()}`),
    portal: 'amazon',
    customer_name: 'Amazon Customer',
    reason: r.return_reason || r.resolution || null,
    refund_amount: parseNumber(r.refund_amount),
    requested_at: parseDate(r.return_request_date) || new Date().toISOString(),
    resolved_at: parseDate(r.return_delivery_date) || null,
    status: returnStatus(r.return_request_status),
    claim_status: r.return_request_status || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  const inserted = await insertBatch('returns', toInsert);
  console.log(`  ${files[0]}: ${inserted}/${records.length} inserted`);
  return inserted;
}

// ── 3. Meesho Payments → orders ──
async function importMeeshoOrders() {
  const meeshoDir = path.join(DATA_DIR, 'meeesho');
  const zips = fs.readdirSync(meeshoDir).filter(f => f.includes('PAYMENT'));
  console.log(`\n=== 3. Meesho Payments → orders table (${zips.length} ZIP files) ===`);
  let total = 0;
  for (const zip of zips) {
    const tmpDir = path.join(__dirname, `../tmp_msh_${Date.now()}`);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    try {
      const zipFile = new AdmZip(path.join(meeshoDir, zip));
      zipFile.extractAllTo(tmpDir, true);
      const xlsxFiles = fs.readdirSync(tmpDir).filter(f => /\.xlsx$/i.test(f));
      for (const xf of xlsxFiles) {
        const wb = XLSX.readFile(path.join(tmpDir, xf), { raw: false });
        for (const sheetName of wb.SheetNames) {
          if (!sheetName.toLowerCase().includes('order')) continue;
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
          if (rows.length < 2) continue;
          const headers = rows[0].map(h => String(h || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
          const dataRows = rows.slice(1).filter(r => r[0] !== null && r[0] !== undefined && String(r[0]).trim());
          const toInsert = dataRows.map(r => {
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = r[idx] !== undefined && r[idx] !== null ? String(r[idx]).trim() : null; });
            return {
              order_number: obj['sub_order_no'] || obj['suborder_no'] || `MSH-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
              portal: 'meesho',
              customer_name: 'Meesho Customer',
              total_amount: parseNumber(obj['listing_price'] || obj['total_sale_amount'] || obj['final_settlement_amount']) || 0,
              order_date: parseDate(obj['order_date']) || new Date().toISOString(),
              status: obj['live_order_status'] === 'RTO' ? 'rto' : (obj['live_order_status'] === 'Delivered' ? 'delivered' : 'confirmed'),
              shipping_fee: parseNumber(obj['shipping_charge']) || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          });
          const inserted = await insertBatch('orders', toInsert);
          total += inserted;
          console.log(`  ${xf}/${sheetName}: ${inserted} orders`);
        }
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
  console.log(`  Total Meesho: ${total}`);
  return total;
}

// ── 4. Inventory SKU → sku_mappings ──
async function importInventorySKU() {
  const filePath = path.resolve(__dirname, '../new dataset/Inventory SKU.xlsx');
  if (!fs.existsSync(filePath)) { console.log('\n=== 4. Inventory SKU: file not found ==='); return 0; }
  console.log('\n=== 4. Inventory SKU.xlsx → sku_mappings ===');
  const wb = XLSX.readFile(filePath, { raw: false });
  const sheet = wb.Sheets['Sheet1'];
  if (!sheet) { console.log('  Sheet1 not found'); return 0; }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (rows.length < 2) return 0;
  const h = rows[0].map(c => String(c || '').trim().toLowerCase());
  const skuIdx = h.findIndex(x => x.includes('sku') && !x.includes('display'));
  const prodIdx = h.findIndex(x => x.includes('product'));
  const platIdx = h.findIndex(x => x.includes('platform'));
  const dataRows = rows.slice(1).filter(r => r[skuIdx] !== null && r[skuIdx] !== undefined && String(r[skuIdx]).trim());
  const toInsert = dataRows.map(r => {
    const sku = String(r[skuIdx]).trim();
    const platform = platIdx >= 0 && r[platIdx] ? String(r[platIdx]).trim().toLowerCase() : '';
    const obj = {
      master_sku_id: sku,
      product_name: prodIdx >= 0 && r[prodIdx] ? String(r[prodIdx]).trim() : sku,
    };
    if (platform === 'firstcry') obj['firstcry_sku'] = sku;
    else if (platform === 'flipkart') obj['flipkart_sku'] = sku;
    else if (platform === 'amazon') obj['amazon_sku'] = sku;
    else if (platform === 'meesho') obj['meesho_sku'] = sku;
    return obj;
  });
  const inserted = await insertBatch('sku_mappings', toInsert);
  console.log(`  ${inserted}/${dataRows.length} rows`);
  return inserted;
}

// ── 5. URL Ecommerce ──
async function importUrlEcommerce() {
  console.log('\n=== 5. URL Ecommerce.xlsx: skipped (no target table) ===');
  return 0;
}

// ── 6. Flipkart 7z ──
async function checkFlipkart() {
  const fk7z = path.join(DATA_DIR, 'Flipkart Sept_Oct_Nov_Dec_2025.7z');
  if (!fs.existsSync(fk7z)) { console.log('\n=== 6. Flipkart: file not found ==='); return; }
  console.log('\n=== 6. Flipkart 7z: needs 7-Zip to extract ===');
  try {
    const { execSync } = await import('child_process');
    const tmpDir = path.join(__dirname, '../tmp_fk');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    execSync(`"C:\\Program Files\\7-Zip\\7z.exe" x "${fk7z}" -o"${tmpDir}" -y`, { stdio: 'pipe', timeout: 60000 });
    const files = fs.readdirSync(tmpDir);
    console.log(`  Extracted ${files.length} files: ${files.slice(0,5).join(', ')}${files.length > 5 ? '...' : ''}`);
    // check first file
    if (files.length > 0) {
      const firstFile = path.join(tmpDir, files[0]);
      const ext = path.extname(firstFile).toLowerCase();
      if (ext === '.csv' || ext === '.tsv' || ext === '.txt') {
        const head = fs.readFileSync(firstFile, 'utf-8').split('\n').slice(0,3).join('\n');
        console.log(`  Sample from ${files[0]}:\n${head}`);
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch(e) {
    console.log(`  Skipped: ${e.message}`);
  }
}

async function main() {
  let t = 0;
  t += await importAmazonReturns();
  t += await importAmazonReturnsXML();
  t += await importMeeshoOrders();
  t += await importInventorySKU();
  t += await importUrlEcommerce();
  await checkFlipkart();
  console.log(`\n=== DONE. Total records inserted: ${t} ===`);
}

main().catch(err => { console.error(err); process.exit(1); });
