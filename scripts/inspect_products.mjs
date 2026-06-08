#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf-8').split('\n').filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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

const products = await getAllRows('products');
console.log(`Products: ${products.length}`);

if (products.length > 0) {
  console.log('Sample products:');
  products.slice(0, 3).forEach(p => console.log(' ', JSON.stringify(p, null, 2).split('\n').slice(0, 12).join('\n')));
  console.log('\nKeys:', Object.keys(products[0]).join(', '));
}
