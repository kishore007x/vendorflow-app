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
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE_URL or key'); process.exit(1);} 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  // returns: find firstcry_sale_returns where poid not in app_returns.return_number
  const { data: srcReturns } = await supabase.from('firstcry_sale_returns').select('poid, id').limit(10000);
  const totalReturns = (srcReturns || []).length;
  const returnPoids = srcReturns.map(r => r.poid).filter(Boolean);
  const withPoid = returnPoids.length;
  const missingReturns = [];
  let matchedReturns = 0;
  if (returnPoids.length > 0) {
    const { data: app } = await supabase.from('app_returns').select('return_number').in('return_number', returnPoids);
    const existSet = new Set((app || []).map(a => a.return_number));
    for (const r of srcReturns) if (r.poid && !existSet.has(r.poid)) missingReturns.push(r.poid);
    matchedReturns = (app || []).length;
  }

  // inventory: firstcry_product_box_details vendor_style_code -> app_inventory.sku
  const { data: boxes } = await supabase.from('firstcry_product_box_details').select('vendor_style_code').limit(10000);
  const totalBoxes = (boxes || []).length;
  const skus = (boxes || []).map(b => b.vendor_style_code).filter(Boolean);
  const withSkus = skus.length;
  const missingSkus = [];
  let matchedSkus = 0;
  if (skus.length > 0) {
    const { data: appInv } = await supabase.from('app_inventory').select('sku').in('sku', skus);
    const skuSet = new Set((appInv || []).map(i => i.sku));
    for (const s of skus) if (!skuSet.has(s)) missingSkus.push(s);
    matchedSkus = (appInv || []).length;
  }

  console.log(JSON.stringify({
    returns: { total: totalReturns, withPoid, matchedInApp: matchedReturns, missingInApp: missingReturns.length, sampleMissing: missingReturns.slice(0,50) },
    product_boxes: { total: totalBoxes, withVendorStyleCode: withSkus, matchedInApp: matchedSkus, missingInApp: missingSkus.length, sampleMissing: missingSkus.slice(0,50) }
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
