#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// second cry sample data location
const SECONDCRY_DIR = path.resolve(__dirname, '../second cry/Sample data');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
  console.error('Set them and re-run: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

function parseNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
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
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(.*))?$/);
  if (m) {
    const day = Number(m[1]), month = Number(m[2]) - 1, year = Number(m[3]);
    const dt = new Date(year, month, day);
    if (!isNaN(dt)) return dt.toISOString();
  }
  return null;
}

async function insertBatch(table, rows) {
  if (!rows || rows.length === 0) return { count: 0 };
  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`Insert error into ${table}:`, error.message || error);
      return { count: inserted, error };
    }
    inserted += chunk.length;
    console.log(`Inserted ${inserted} rows into ${table}...`);
  }
  return { count: inserted };
}

function headerAllBlank(headers) {
  if (!headers) return true;
  return headers.every(h => h === null || h === undefined || String(h).trim() === '');
}

function normalizeKey(k) {
  if (!k) return k;
  return String(k).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    const key = normalizeKey(headers[i] || `col${i+1}`);
    obj[key] = row[i] === undefined ? null : row[i];
  }
  return obj;
}

async function processFile(filePath) {
  const file = path.basename(filePath);
  console.log('\nProcessing', file);
  const wb = XLSX.readFile(filePath, { raw: false });
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!rows || rows.length === 0) continue;
    const headers = rows[0].map(h => (h === null ? '' : String(h)));
    const allBlank = headerAllBlank(headers);
    const dataRows = rows.slice(1);

    // Heuristics: try to match the file/sheet to known FirstCry shapes so app can consume
    if (file.toLowerCase().includes('sales') || sheetName.toLowerCase().includes('sales')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        return {
          poid: obj.poid || obj['po id'] || null,
          order_date: parseDate(obj.orderdate || obj.order_date || obj['order date']),
          product_id: parseNumber(obj.productid || obj['product id']),
          brand_name: obj['brand name'] || obj.brand_name || obj.brand || null,
          business_type: obj['business type'] || obj.business_type || null,
          quantity: parseNumber(obj.quantity),
          mrp: parseNumber(obj.mrp),
          mrp_sales: parseNumber(obj['mrp sales'] || obj.mrp_sales),
          subcategory_name: obj.subcategoryname || obj.subcategory_name || null,
          category_name: obj.categoryname || obj.category_name || null,
          stock_type: obj.stocktype || obj.stock_type || null,
          vendor_style_code: obj.vendorstylecode || obj.vendor_style_code || null,
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_sales', toInsert.filter(Boolean));
      continue;
    }

    // Generic fallback: store raw rows
    const rawInserts = dataRows.map((r, idx) => ({
      filename: file,
      sheet_name: sheetName,
      row_index: idx + 2,
      row_data: rowToObject(headers, r),
      source_file: file
    }));
    await insertBatch('firstcry_raw_files', rawInserts);
  }
}

async function main() {
  if (!fs.existsSync(SECONDCRY_DIR)) {
    console.error('SecondCry directory not found:', SECONDCRY_DIR);
    process.exit(1);
  }
  // Recursively find files in nested folders
  function collectFiles(dir) {
    const out = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...collectFiles(full));
      else if (/\.xlsx$|\.xls$|\.csv$/i.test(e.name)) out.push(full);
    }
    return out;
  }

  const files = collectFiles(SECONDCRY_DIR);
  console.log('Found', files.length, 'files (recursive) in', SECONDCRY_DIR);
  for (const fp of files) {
    try {
      await processFile(fp);
    } catch (err) {
      console.error('Failed processing', fp, err && err.message ? err.message : err);
    }
  }
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
