#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function upsertDemo() {
  // invoice_items: add one item per invoice if none exist
  const { data: invCounts } = await supabase.from('invoice_items').select('id', { head: true, count: 'exact' });
  if ((invCounts === null) || invCounts === 0) {
    const { data: invoices } = await supabase.from('invoices').select('id, total_amount').limit(100);
    const items = (invoices || []).map(inv => ({ invoice_id: inv.id, product_name: 'Demo product', sku: 'DEMO-SKU', quantity: 1, unit_price: inv.total_amount ? Number((inv.total_amount / 1).toFixed(2)) : 100, total: inv.total_amount || 100 }));
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100);
      const { error } = await supabase.from('invoice_items').insert(chunk);
      if (error) console.error('invoice_items insert error', error.message);
    }
    console.log('Inserted demo invoice_items:', items.length);
  } else console.log('invoice_items already has data');

  // settlements
  const { data: settlementsCount } = await supabase.from('settlements').select('id', { head: true, count: 'exact' });
  if (!settlementsCount) {
    const rows = [
      { settlement_number: 'SET-001', amount: 1000, status: 'paid', vendor_id: null },
      { settlement_number: 'SET-002', amount: 2000, status: 'pending', vendor_id: null }
    ];
    const { error } = await supabase.from('settlements').insert(rows);
    if (error) console.error('settlements insert error', error.message); else console.log('Inserted demo settlements');
  } else console.log('settlements already has data');

  // product_health
  const { data: phCount } = await supabase.from('product_health').select('id', { head: true, count: 'exact' });
  if (!phCount) {
    // pick up to 10 products
    const { data: products } = await supabase.from('products').select('id, sku, name').limit(10);
    const rows = (products || []).map(p => ({ product_id: p.id, product_name: p.name || p.sku || 'Demo', score: 80, issues: [], vendor_id: null }));
    const { error } = await supabase.from('product_health').insert(rows);
    if (error) console.error('product_health insert error', error.message); else console.log('Inserted demo product_health rows');
  } else console.log('product_health already has data');

  // employees
  const { data: empCount } = await supabase.from('employees').select('id', { head: true, count: 'exact' });
  if (!empCount) {
    const rows = [
      { name: 'Alice Admin', role: 'admin', phone: '9999999999' },
      { name: 'Bob Ops', role: 'operations', phone: '8888888888' }
    ];
    const { error } = await supabase.from('employees').insert(rows);
    if (error) console.error('employees insert error', error.message); else console.log('Inserted demo employees');
  } else console.log('employees already has data');

  // warehouses
  const { data: whCount } = await supabase.from('warehouses').select('id', { head: true, count: 'exact' });
  if (!whCount) {
    const rows = [ { name: 'Main Warehouse', location: 'Mumbai', capacity: 10000 }, { name: 'Secondary Warehouse', location: 'Delhi', capacity: 5000 } ];
    const { error } = await supabase.from('warehouses').insert(rows);
    if (error) console.error('warehouses insert error', error.message); else console.log('Inserted demo warehouses');
  } else console.log('warehouses already has data');

  // tasks
  const { data: tasksCount } = await supabase.from('tasks').select('id', { head: true, count: 'exact' });
  if (!tasksCount) {
    const rows = [ { title: 'Verify imported data', description: 'Manual check of FirstCry import', status: 'pending' }, { title: 'Review invoices', description: 'Check purchase invoices', status: 'pending' } ];
    const { error } = await supabase.from('tasks').insert(rows);
    if (error) console.error('tasks insert error', error.message); else console.log('Inserted demo tasks');
  } else console.log('tasks already has data');

  // expenses
  const { data: expCount } = await supabase.from('expenses').select('id', { head: true, count: 'exact' });
  if (!expCount) {
    const rows = [ { category: 'Office', description: 'Sample expense', amount: 1000 }, { category: 'Logistics', description: 'Sample expense 2', amount: 2000 } ];
    const { error } = await supabase.from('expenses').insert(rows);
    if (error) console.error('expenses insert error', error.message); else console.log('Inserted demo expenses');
  } else console.log('expenses already has data');

  // videos
  const { data: vidCount } = await supabase.from('videos').select('id', { head: true, count: 'exact' });
  if (!vidCount) {
    const rows = [ { file_name: 'demo.mp4', video_status: 'uploaded', created_at: new Date().toISOString() } ];
    const { error } = await supabase.from('videos').insert(rows);
    if (error) console.error('videos insert error', error.message); else console.log('Inserted demo videos');
  } else console.log('videos already has data');

  // affiliates/partners: insert sample if table exists
  try {
    const { data: affCount } = await supabase.from('affiliates').select('id', { head: true, count: 'exact' });
    if (!affCount) {
      const rows = [ { name: 'Demo Partner', contact: 'partner@example.com', commission_percent: 5 } ];
      const { error } = await supabase.from('affiliates').insert(rows);
      if (error) console.error('affiliates insert error', error.message); else console.log('Inserted demo affiliates');
    } else console.log('affiliates already has data');
  } catch (e) {
    console.log('affiliates table not present or error', e.message);
  }

  // invoice_items already handled

  // inward_stock: create sample GRNs using some purchase_orders
  const { data: inwardCount } = await supabase.from('inward_stock').select('id', { head: true, count: 'exact' });
  if (!inwardCount) {
    const { data: pos } = await supabase.from('purchase_orders').select('id,po_number').limit(10);
    const rows = (pos || []).map(p => ({ grn_number: 'GRN-' + p.po_number, po_id: p.id, supplier_name: 'Demo Supplier', received_date: new Date().toISOString().split('T')[0], items: [], total_received: 0, warehouse: null }));
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await supabase.from('inward_stock').insert(chunk);
      if (error) console.error('inward_stock insert error', error.message);
    }
    console.log('Inserted demo inward_stock rows:', rows.length);
  } else console.log('inward_stock already has data');

  console.log('Demo population complete');
}

upsertDemo().catch(e=>{ console.error('Demo population failed', e); process.exit(1); });
