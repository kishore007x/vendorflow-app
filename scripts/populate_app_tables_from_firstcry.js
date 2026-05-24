import { createClient } from '@supabase/supabase-js';
import process from 'process';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// helper to fetch actual column names for a table so inserts only include valid cols
async function getColumns(table) {
  try {
    const { data: cols, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', table)
      .eq('table_schema', 'public');
    if (!error && cols) return cols.map(c => c.column_name);
  } catch (e) {
    // fall through to rpc fallback
  }
  // Fallback: use exec_sql RPC if available
  try {
    const sql = `select column_name from information_schema.columns where table_name='${table}' and table_schema='public'`;
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) { console.error('exec_sql error', error); return []; }
    if (!data) return [];
    // data may be array of objects with column_name
    return data.map(r => r.column_name || Object.values(r)[0]);
  } catch (e) {
    console.error('Failed to fetch columns via rpc for', table, e);
    return [];
  }
}

function filterToColumns(obj, cols) {
  const out = {};
  for (const k of Object.keys(obj)) if (cols.includes(k)) out[k] = obj[k];
  return out;
}

let returnsCols = [];
let invoicesCols = [];
let inventoryCols = [];

async function copyReturns() {
  console.log('Copying firstcry_sale_returns -> app_returns');
  const { data: rows, error } = await supabase.from('firstcry_sale_returns').select('*');
  if (error) throw error;
  if (!rows || rows.length === 0) { console.log('No firstcry_sale_returns rows'); return; }
  console.log('Sample firstcry_sale_returns row keys:', Object.keys(rows[0] || {}));
  const mapped = rows.map(r => ({
    return_number: r.poid || r.id || (`RET-${Math.random().toString(36).slice(2,9)}`),
    order_id: null,
    product_id: null, // Firstcry product_id is numeric, not UUID; skip for now
    quantity: r.quantity || r.ordered_quantity || 1,
    reason: r.reason || r.subreason || null,
    status: 'requested',
    requested_at: r.sales_return_date || r.order_date || null,
    portal: r.portal || 'firstcry',
    metadata: {
      poid: r.poid,
      vendor_style_code: r.vendor_style_code,
      brand_names: r.brand_names,
      mrp: r.mrp,
      subtype_reason: r.subtype_reason,
      source_file: r.source_file,
      sheet_name: r.sheet_name,
      firstcry_product_id: r.product_id,
    },
  }));
  for (let i = 0; i < mapped.length; i += 200) {
    const rawChunk = mapped.slice(i, i + 200);
    try {
      const onConflict = 'return_number';
      // dedupe by conflict key to avoid multiple rows with same return_number in same upsert
      let deduped = rawChunk;
      if (onConflict) {
        const m = new Map();
        for (const r of rawChunk) {
          const k = r[onConflict] || null;
          if (k === null) continue;
          m.set(k, r);
        }
        deduped = Array.from(m.values());
      }
      const chunk = (returnsCols && returnsCols.length > 0) ? deduped.map(r => filterToColumns(r, returnsCols)) : deduped;
      // batch-check which return_numbers already exist to avoid per-row selects
      if (onConflict) {
        const keys = chunk.map(r => r[onConflict]).filter(Boolean);
        if (keys.length > 0) {
          const { data: existing } = await supabase.from('app_returns').select(onConflict).in(onConflict, keys);
          const existingSet = new Set((existing || []).map(e => e[onConflict]));
          for (const row of chunk) {
            try {
              const k = row[onConflict] || null;
              if (k && existingSet.has(k)) {
                const { error: updErr } = await supabase.from('app_returns').update(row).eq(onConflict, k);
                if (updErr) console.error('Update return row error', updErr, k);
                else console.log('Updated return', k);
              } else {
                const { error: insErr } = await supabase.from('app_returns').insert([row]);
                if (insErr) console.error('Insert return row error', insErr, k);
                else console.log('Inserted return', k);
              }
            } catch (e) {
              console.error('Failed to upsert return row', e, row[onConflict]);
            }
          }
        }
      } else {
        // no conflict key; just insert chunk
        const { error: insErr } = await supabase.from('app_returns').insert(chunk);
        if (insErr) console.error('Insert returns chunk error', insErr);
        else console.log('Inserted returns chunk', chunk.length);
      }
    } catch (err) {
      console.error('Upsert returns chunk failed', err);
    }
  }
}

async function copyInvoices() {
  console.log('Copying firstcry_vendor_invoices -> app_invoices');
  const { data: rows, error } = await supabase.from('firstcry_vendor_invoices').select('*');
  if (error) throw error;
  if (!rows || rows.length === 0) { console.log('No firstcry_vendor_invoices rows'); return; }
  const mapped = rows.map(r => ({
    invoice_number: r.invoice_no || r.vendor_invoice_no || r.invoice_number || null,
    type: r.type || 'vendor',
    portal: r.portal || 'firstcry',
    invoice_date: r.invoice_date || r.date || null,
    vendor_name: r.vendor_name || r.supplier_name || r.party_name || null,
    total_amount: r.total_amount || r.amount || 0,
    tax_amount: (r.cgst || 0) + (r.sgst || 0) + (r.igst || 0) || 0,
    status: r.invoice_status || 'received',
    metadata: {
      gstin: r.vendor_gst_no || r.gstin,
      cgst: r.cgst,
      sgst: r.sgst,
      igst: r.igst,
      due_date: r.due_date,
      pdf_url: r.pdf_url || r.pdf,
      vendor_id: r.vendor_id,
      finalized: r.finalized,
      source_file: r.source_file,
      sheet_name: r.sheet_name,
    },
  }));
  for (let i = 0; i < mapped.length; i += 200) {
    const rawChunk = mapped.slice(i, i + 200);
    try {
      const onConflict = 'invoice_number';
      let deduped = rawChunk;
      if (onConflict) {
        const m = new Map();
        for (const r of rawChunk) {
          const k = r[onConflict] || null;
          if (k === null) continue;
          m.set(k, r);
        }
        deduped = Array.from(m.values());
      }
      const chunk = (invoicesCols && invoicesCols.length > 0) ? deduped.map(r => filterToColumns(r, invoicesCols)) : deduped;
      // batch-check existing invoice numbers and update/insert accordingly
      if (onConflict) {
        const keys = chunk.map(r => r[onConflict]).filter(Boolean);
        if (keys.length > 0) {
          const { data: existing } = await supabase.from('app_invoices').select(onConflict).in(onConflict, keys);
          const existingSet = new Set((existing || []).map(e => e[onConflict]));
          for (const row of chunk) {
            try {
              const k = row[onConflict] || null;
              if (k && existingSet.has(k)) {
                const { error: updErr } = await supabase.from('app_invoices').update(row).eq(onConflict, k);
                if (updErr) console.error('Update invoice row error', updErr, k);
                else console.log('Updated invoice', k);
              } else {
                const { error: insErr } = await supabase.from('app_invoices').insert([row]);
                if (insErr) console.error('Insert invoice row error', insErr, k);
                else console.log('Inserted invoice', k);
              }
            } catch (e) {
              console.error('Failed to upsert invoice row', e, row[onConflict]);
            }
          }
        }
      } else {
        const { error: insErr } = await supabase.from('app_invoices').insert(chunk);
        if (insErr) console.error('Insert invoices chunk error', insErr);
        else console.log('Inserted invoices chunk', chunk.length);
      }
    } catch (err) {
      console.error('Upsert invoices chunk failed', err);
    }
  }
}

async function buildInventory() {
  console.log('Building inventory -> app_inventory from firstcry_product_box_details and firstcry_sales');
  const { data: boxes } = await supabase.from('firstcry_product_box_details').select('*');
  console.log('Sample firstcry_product_box_details row keys:', Object.keys((boxes || [])[0] || {}));
  const { data: sales } = await supabase.from('firstcry_sales').select('product_id, qty');
  const qtyMap = {};
  if (sales) sales.forEach(s => { qtyMap[s.product_id] = (qtyMap[s.product_id] || 0) + (s.qty || 0); });
  const items = (boxes || []).map(b => ({
    sku: b.vendor_style_code || b.sku || (`SKU-${b.product_id || Math.random().toString(36).slice(2,6)}`),
    product_id: null, // Firstcry product_id is numeric, not UUID; skip for now
    quantity_available: qtyMap[b.product_id] || 0,
    quantity_reserved: 0,
    quantity_damaged: 0,
    quantity_sold: qtyMap[b.product_id] || 0,
    metadata: {
      product_name: b.product_name,
      packaging_id: b.packaging_id,
      length_cm: b.length_cm,
      breadth_cm: b.breadth_cm,
      height_cm: b.height_cm,
      weight_kg: b.weight_kg,
      multiple_packaging_required: b.multiple_packaging_required,
      source_file: b.source_file,
      sheet_name: b.sheet_name,
      firstcry_product_id: b.product_id,
    },
  }));
  if (items.length === 0) { console.log('No inventory items to insert'); return; }
  for (let i = 0; i < items.length; i += 200) {
    const rawChunk = items.slice(i, i + 200);
    try {
      const onConflict = 'sku';
      let deduped = rawChunk;
      if (onConflict) {
        const m = new Map();
        for (const r of rawChunk) {
          const k = r[onConflict] || null;
          if (k === null) continue;
          m.set(k, r);
        }
        deduped = Array.from(m.values());
      }
      const chunk = (inventoryCols && inventoryCols.length > 0) ? deduped.map(r => filterToColumns(r, inventoryCols)) : deduped;
      if (onConflict) {
        const keys = chunk.map(r => r[onConflict]).filter(Boolean);
        if (keys.length > 0) {
          const { data: existing } = await supabase.from('app_inventory').select(onConflict).in(onConflict, keys);
          const existingSet = new Set((existing || []).map(e => e[onConflict]));
          for (const row of chunk) {
            try {
              const k = row[onConflict] || null;
              if (k && existingSet.has(k)) {
                const { error: updErr } = await supabase.from('app_inventory').update(row).eq(onConflict, k);
                if (updErr) console.error('Update inventory row error', updErr, k);
                else console.log('Updated inventory', k);
              } else {
                const { error: insErr } = await supabase.from('app_inventory').insert([row]);
                if (insErr) console.error('Insert inventory row error', insErr, k);
                else console.log('Inserted inventory', k);
              }
            } catch (e) {
              console.error('Failed to upsert inventory row', e, row[onConflict]);
            }
          }
        }
      } else {
        const { error: insErr } = await supabase.from('app_inventory').insert(chunk);
        if (insErr) console.error('Insert inventory chunk error', insErr);
        else console.log('Inserted inventory chunk', chunk.length);
      }
    } catch (err) {
      console.error('Upsert inventory chunk failed', err);
    }
  }
}

async function main() {
  try {
    // fetch current table columns to avoid inserting unknown columns
    returnsCols = await getColumns('app_returns');
    invoicesCols = await getColumns('app_invoices');
    inventoryCols = await getColumns('app_inventory');

    await copyReturns();
    await copyInvoices();
    await buildInventory();
    console.log('Done populating app tables from Firstcry data');
  } catch (e) {
    console.error('Failed to populate app tables', e);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
