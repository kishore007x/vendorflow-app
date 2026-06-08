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

const tables = ['orders', 'order_items', 'inventory', 'products', 'returns', 'customers', 'expenses', 'alerts', 'sku_mappings', 'product_health', 'invoices', 'settlements'];

console.log('=== DB STATE ===');
for (const t of tables) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (error) console.log(`  ${t}: ERROR ${error.message}`);
  else console.log(`  ${t}: ${count} rows`);
}

console.log('\n=== ORDERS BY PORTAL ===');
const { data: orderPortals } = await supabase.from('orders').select('portal');
const op = {};
(orderPortals || []).forEach(o => { const p = o.portal || '(null)'; op[p] = (op[p] || 0) + 1; });
for (const [p, c] of Object.entries(op).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${c}`);

console.log('\n=== INVENTORY BY PORTAL ===');
const { data: invPortals } = await supabase.from('inventory').select('portal');
const ip = {};
(invPortals || []).forEach(o => { const p = o.portal || '(null)'; ip[p] = (ip[p] || 0) + 1; });
for (const [p, c] of Object.entries(ip).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${c}`);

console.log('\n=== RETURNS BY PORTAL ===');
const { data: retPortals } = await supabase.from('returns').select('portal');
const rp = {};
(retPortals || []).forEach(o => { const p = o.portal || '(null)'; rp[p] = (rp[p] || 0) + 1; });
for (const [p, c] of Object.entries(rp).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${c}`);
