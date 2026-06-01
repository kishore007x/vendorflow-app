#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

(async () => {
  const { data: latestRows, error: latestErr } = await supabase
    .from('orders')
    .select('*')
    .order('order_date', { ascending: false })
    .limit(1);
  if (latestErr) {
    console.error('Latest order query failed', latestErr);
    process.exit(1);
  }
  const row = latestRows?.[0];
  if (!row) {
    console.log('No orders found');
    return;
  }
  console.log('Latest order keys:', Object.keys(row));
  const interesting = Object.fromEntries(Object.entries(row).filter(([key]) => /item|json|raw|data|payload|detail/i.test(key)));
  console.log('Interesting fields:', JSON.stringify(interesting, null, 2));
  console.log('Latest order row (selected):', JSON.stringify({
    id: row.id,
    order_number: row.order_number,
    portal: row.portal,
    order_date: row.order_date,
    total_amount: row.total_amount,
    status: row.status,
    customer_name: row.customer_name,
    vendor_id: row.vendor_id,
  }, null, 2));
})();
