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
// Prefer a service role key when available; fall back to anon/publishable key for read-only checks
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase connection info. Set SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in environment or .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  try {
    const { data: ordersData, error: ordersErr } = await supabase.from('orders').select('id,order_number').eq('portal', 'firstcry');
    if (ordersErr) throw ordersErr;
    const orderIds = (ordersData || []).map(o => o.id).filter(Boolean);

    const ordersCount = ordersData?.length || 0;

    let orderItemsCount = 0;
    if (orderIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < orderIds.length; i += 200) chunks.push(orderIds.slice(i, i + 200));
      for (const c of chunks) {
        const { data, error, count } = await supabase.from('order_items').select('*', { count: 'exact' }).in('order_id', c);
        if (error) throw error;
        orderItemsCount += count || (data || []).length || 0;
      }
    }

    const { data: productsData, error: productsErr, count: productsCountHead } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (productsErr) throw productsErr;
    const productsCount = productsCountHead || (productsData || []).length;

    const { data: returnsData, error: returnsErr, count: returnsCountHead } = await supabase.from('returns').select('*', { count: 'exact', head: true }).eq('portal', 'firstcry');
    if (returnsErr) throw returnsErr;
    const returnsCount = returnsCountHead || (returnsData || []).length;

    const { data: invoicesData, error: invoicesErr, count: invoicesCountHead } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    if (invoicesErr) throw invoicesErr;
    const invoicesCount = invoicesCountHead || (invoicesData || []).length;

    const { data: inventoryData, error: inventoryErr, count: inventoryCountHead } = await supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('portal', 'firstcry');
    if (inventoryErr) throw inventoryErr;
    const inventoryCount = inventoryCountHead || (inventoryData || []).length;

    console.log(JSON.stringify({
      orders: ordersCount,
      orderItems: orderItemsCount,
      products: productsCount,
      returns: returnsCount,
      invoices: invoicesCount,
      inventory: inventoryCount,
    }, null, 2));
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

main();
