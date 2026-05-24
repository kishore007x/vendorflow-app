#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AMAZON_DIR = path.resolve(__dirname, '../new dataset/Data Oct_NoV_Dec (1)/Sample data/Amazon/Amazon');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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

function statusMap(amazonStatus) {
  const s = (amazonStatus || '').trim().toLowerCase();
  if (s === 'shipped') return 'shipped';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'pending') return 'pending';
  if (s === 'unshipped' || s === 'partiallyshipped') return 'processing';
  return 'pending';
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function insertBatch(rows) {
  if (!rows || rows.length === 0) return 0;
  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('orders').upsert(chunk, { onConflict: 'order_number', ignoreDuplicates: true });
      if (error) {
        console.error(`Insert error:`, error.message || error, `(row ${i}: ${chunk[0]?.order_number})`);
        return inserted;
      }
    inserted += chunk.length;
    console.log(`Inserted ${inserted} orders...`);
  }
  return inserted;
}

function parseTSV(content) {
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

async function main() {
  const files = fs.readdirSync(AMAZON_DIR).filter(f => /\.txt$/i.test(f));
  console.log(`Found ${files.length} Amazon TXT files`);
  let total = 0;

  for (const file of files.sort()) {
    const filePath = path.join(AMAZON_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parseTSV(content);
    console.log(`\n${file}: ${records.length} records`);

    const toInsert = records.map(r => {
      const itemPrice = parseNumber(r['item-price']) || 0;
      const shippingPrice = parseNumber(r['shipping-price']) || 0;
      return {
        order_number: r['amazon-order-id'] || r['merchant-order-id'] || `AMZ-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        portal: 'amazon',
        customer_name: 'Amazon Customer',
        customer_city: r['ship-city'] || null,
        customer_state: r['ship-state'] || null,
        customer_pincode: r['ship-postal-code'] || null,
        status: statusMap(r['order-status']),
        total_amount: itemPrice,
        shipping_fee: shippingPrice,
        order_date: parseDate(r['purchase-date']) || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const inserted = await insertBatch(toInsert);
    total += inserted;
    console.log(`  Inserted ${inserted} / ${records.length}`);
  }

  console.log(`\nDone. Total Amazon orders inserted: ${total}`);
}

main().catch(err => { console.error(err); process.exit(1); });
