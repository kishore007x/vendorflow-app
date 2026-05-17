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

function toNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function main() {
  const excelData = JSON.parse(fs.readFileSync(new URL('../excel-data.json', import.meta.url), 'utf8'));
  const salesRows = excelData.dashboard_sales?.flatMap((file) => file.data ?? []) ?? [];
  const invoiceRows = excelData.vendor_invoices?.flatMap((file) => file.data ?? []) ?? [];

  const { data: products, error: productsError } = await supabase.from('products').select('id, name, sku');
  if (productsError) throw productsError;

  const productByFirstcryId = new Map((products ?? []).map((product) => [String(product.name), product.id]));
  const productBySku = new Map((products ?? []).map((product) => [String(product.sku), product.id]));

  const orderGroups = new Map();
  for (const row of salesRows) {
    const poid = String(row.POID ?? '').trim();
    if (!poid) continue;
    if (!orderGroups.has(poid)) {
      orderGroups.set(poid, []);
    }
    orderGroups.get(poid).push(row);
  }

  const orders = [];
  const orderItemsByNumber = [];

  for (const [poid, rows] of orderGroups.entries()) {
    const orderDate = rows.map((row) => toIso(row.OrderDate)).find(Boolean) ?? new Date().toISOString();
    const totalAmount = rows.reduce((sum, row) => sum + toNumber(row['MRP Sales'] ?? row.MRP ?? 0), 0);

    orders.push({
      order_number: poid,
      portal: 'firstcry',
      customer_name: 'Firstcry Customer',
      customer_email: null,
      customer_phone: null,
      customer_address: null,
      customer_pincode: null,
      customer_city: null,
      customer_state: null,
      status: 'delivered',
      total_amount: totalAmount,
      commission: 0,
      shipping_fee: 0,
      order_date: orderDate,
      shipped_date: null,
      delivered_date: orderDate,
    });

    rows.forEach((row) => {
      const firstcryProductId = String(row.ProductID ?? '').trim();
      const vendorStyleCode = String(row.VendorStyleCode ?? '').trim();
      const productId = productByFirstcryId.get(firstcryProductId) ?? productBySku.get(vendorStyleCode) ?? null;
      const quantity = toNumber(row.Quantity ?? 1) || 1;
      const unitPrice = toNumber(row.MRP ?? row['MRP Sales'] ?? 0);
      const total = toNumber(row['MRP Sales'] ?? unitPrice * quantity);

      orderItemsByNumber.push({
        order_number: poid,
        product_id: productId,
        product_name: vendorStyleCode || firstcryProductId || 'Firstcry product',
        sku: vendorStyleCode || null,
        quantity,
        unit_price: unitPrice,
        total,
        gst_percent: null,
      });
    });
  }

  const invoiceMap = new Map();
  for (const row of invoiceRows) {
    const invoiceNo = String(row['Invoice No'] ?? '').trim();
    if (!invoiceNo) continue;
    if (!invoiceMap.has(invoiceNo)) {
      invoiceMap.set(invoiceNo, row);
    }
  }

  const invoices = Array.from(invoiceMap.values()).map((row) => ({
    invoice_number: String(row['Invoice No']).trim(),
    type: 'purchase',
    party_name: String(row['Vendor Name'] ?? 'Firstcry Vendor').trim(),
    gstin: String(row['Vendor GST No'] ?? '').trim() || null,
    total_amount: toNumber(row['Net Amount']),
    cgst: 0,
    sgst: 0,
    igst: toNumber(row['Tax Amount']),
    status: String(row['Invoice Status'] ?? 'approved').toLowerCase(),
    invoice_date: toIso(row['Invoice Date']) ?? new Date().toISOString(),
    due_date: null,
    pdf_url: null,
    finalized: true,
  }));

  await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  for (const group of chunk(orders, 100)) {
    const { error } = await supabase.from('orders').insert(group);
    if (error) throw error;
  }

  const { data: insertedOrders, error: orderLookupError } = await supabase.from('orders').select('id, order_number');
  if (orderLookupError) throw orderLookupError;
  const orderIdByNumber = new Map((insertedOrders ?? []).map((order) => [order.order_number, order.id]));

  const orderItems = orderItemsByNumber
    .map((item) => ({
      order_id: orderIdByNumber.get(item.order_number),
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      gst_percent: item.gst_percent,
    }))
    .filter((item) => item.order_id);

  for (const group of chunk(orderItems, 200)) {
    const { error } = await supabase.from('order_items').insert(group);
    if (error) throw error;
  }

  for (const group of chunk(invoices, 100)) {
    const { error } = await supabase.from('invoices').insert(group);
    if (error) throw error;
  }

  const [{ count: orderCount }, { count: orderItemCount }, { count: invoiceCount }] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('order_items').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
  ]);

  console.log(JSON.stringify({ orders: orderCount, orderItems: orderItemCount, invoices: invoiceCount }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});