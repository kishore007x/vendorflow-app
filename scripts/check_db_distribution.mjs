#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function getAllRows(table, select = 'portal') {
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

console.log('=== ORDERS BY PORTAL (all rows) ===');
const orderPortals = await getAllRows('orders', 'portal');
const op = {};
orderPortals.forEach(o => { const p = o.portal || '(null)'; op[p] = (op[p] || 0) + 1; });
console.log(`Total: ${orderPortals.length}`);
for (const [p, c] of Object.entries(op).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${c}`);

console.log('\n=== INVENTORY BY PORTAL (all rows) ===');
const invPortals = await getAllRows('inventory', 'portal');
const ip = {};
invPortals.forEach(o => { const p = o.portal || '(null)'; ip[p] = (ip[p] || 0) + 1; });
console.log(`Total: ${invPortals.length}`);
for (const [p, c] of Object.entries(ip).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${c}`);

console.log('\n=== ORDERS BY STATUS (all rows) ===');
const orderStatus = await getAllRows('orders', 'status');
const os = {};
orderStatus.forEach(o => { const s = o.status || '(null)'; os[s] = (os[s] || 0) + 1; });
console.log(`Total: ${orderStatus.length}`);
for (const [p, c] of Object.entries(os).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${c}`);

console.log('\n=== ORDERS DATE RANGE ===');
const orderDates = await getAllRows('orders', 'order_date,created_at');
const dates = orderDates.map(o => o.order_date || o.created_at).filter(Boolean).sort();
console.log(`Min: ${dates[0]}`);
console.log(`Max: ${dates[dates.length - 1]}`);
