#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split(/\r?\n/);
  const res = {};
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    res[k] = v;
  }
  return res;
}

const env = { ...process.env, ...loadEnvFile(new URL('../.env', import.meta.url).pathname), ...loadEnvFile(new URL('../.env.local', import.meta.url).pathname) };
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL_RAW || env.VITE_SUPABASE_URL?.replace(/\"/g, '');
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase connection info. Set SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in environment or .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function count(table, filter) {
  try {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter && Array.isArray(filter) && filter.length > 0) q = q.filter(...filter);
    const { error, count: c } = await q;
    if (error) return { error };
    return { count: c || 0 };
  } catch (err) {
    return { error: err };
  }
}

async function main() {
  const tables = [
    'firstcry_sales',
    'firstcry_gst_reconciliation',
    'firstcry_product_box_details',
    'firstcry_sale_returns',
    'firstcry_vendor_invoices',
    'firstcry_vendor_reconciliation',
    'firstcry_payment_advice',
    'firstcry_debit_notes',
    'firstcry_raw_files'
  ];

  const appTables = [
    'orders', 'order_items', 'products', 'returns', 'invoices', 'inventory', 'app_returns', 'app_invoices', 'app_inventory'
  ];

  const out = {};
  for (const t of tables) {
    const r = await count(t);
    out[t] = r.error ? String(r.error) : (r.count || 0);
  }
  for (const t of appTables) {
    const r = await count(t);
    out[t] = r.error ? String(r.error) : (r.count || 0);
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
