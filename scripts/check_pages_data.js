#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env if present (simple parser) to avoid external deps
let env = {};
try {
  const raw = fs.readFileSync('.env', 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.*))\s*$/);
    if (m) env[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  });
} catch (e) {}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const report = {};
  // Orders
  const { count: ordersCount, error: ordersErr } = await supabase.from('orders').select('id', { count: 'exact', head: true });
  report.orders_count = ordersErr ? null : ordersCount;

  const { count: firstcryCount, error: fcErr } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('portal', 'firstcry');
  report.orders_firstcry = fcErr ? null : firstcryCount;

  const { count: zeroAmountCount, error: zaErr } = await supabase.from('orders').select('id', { count: 'exact', head: true }).or('total_amount.is.null,total_amount.eq.0');
  report.orders_zero_or_null_total = zaErr ? null : zeroAmountCount;

  // Products
  const { data: productsCount } = await supabase.from('products').select('id', { count: 'exact', head: true });
  report.products_count = productsCount ?? null;

  // Insights: simple aggregates
  const { data: totalRevenue } = await supabase.from('orders').select('sum:total_amount');
  report.orders_total_sample = totalRevenue ?? null;

  // sample rows
  const { data: sampleOrders } = await supabase.from('orders').select('id, order_number, portal, vendor_id, total_amount, created_at').limit(5).order('created_at', { ascending: false });
  report.sample_orders = sampleOrders || [];

  console.log(JSON.stringify(report, null, 2));
}

main().catch(err=>{ console.error(err); process.exit(1); });
