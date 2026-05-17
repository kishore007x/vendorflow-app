#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

async function main() {
  const excelData = JSON.parse(fs.readFileSync(new URL('../excel-data.json', import.meta.url), 'utf8'));
  const dashboardRows = excelData.dashboard_sales?.flatMap((file) => file.data ?? []) ?? [];
  const boxRows = excelData.product_box_details?.flatMap((file) => file.data ?? []) ?? [];

  const quantityByProductId = new Map();
  const brandByProductId = new Map();

  for (const row of dashboardRows) {
    const productId = String(row.ProductID ?? '').trim();
    if (!productId) continue;
    const quantity = Number(row.Quantity ?? 0) || 0;
    quantityByProductId.set(productId, (quantityByProductId.get(productId) ?? 0) + quantity);
    if (!brandByProductId.has(productId) && row['Brand Name']) {
      brandByProductId.set(productId, String(row['Brand Name']).trim());
    }
  }

  const inventoryRows = boxRows.map((row) => {
    const productId = String(row.ProductID ?? '').trim();
    const skuId = String(row.VendorStyleCode ?? productId).trim();
    const quantity = quantityByProductId.get(productId) ?? 0;

    return {
      sku_id: skuId,
      product_name: String(row.ProductName ?? skuId).trim(),
      brand: brandByProductId.get(productId) ?? null,
      portal: 'firstcry',
      available_quantity: quantity,
      master_quantity: quantity,
      reserved_quantity: 0,
      low_stock_threshold: 10,
      warehouse: null,
      channel_allocations: {},
      aging_days: 0,
    };
  });

  if (inventoryRows.length === 0) {
    console.log('No inventory rows found in excel-data.json');
    return;
  }

  const { error: deleteError } = await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    throw deleteError;
  }

  let inserted = 0;
  for (const group of chunk(inventoryRows, 100)) {
    const { error } = await supabase.from('inventory').insert(group);
    if (error) throw error;
    inserted += group.length;
  }

  const { count, error: countError } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
  if (countError) throw countError;

  console.log(JSON.stringify({ inserted, inventoryCount: count }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});