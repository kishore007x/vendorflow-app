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
    .select('order_date')
    .order('order_date', { ascending: false })
    .limit(1);
  if (latestErr) {
    console.error('Latest date query failed', latestErr);
    process.exit(1);
  }

  const latestDate = latestRows?.[0]?.order_date;
  console.log('latestDate:', latestDate);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id,order_number,total_amount,order_date,order_items(id,unit_price,total,quantity)')
    .eq('order_date', latestDate);
  if (error) {
    console.error('Order query failed', error);
    process.exit(1);
  }

  const sumTotal = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const sumItems = orders.reduce((sum, order) => {
    const orderItemTotal = (order.order_items || []).reduce((itemSum, item) => {
      const direct = Number(item.total || 0) || Number(item.unit_price || 0) * Number(item.quantity || 1);
      return itemSum + direct;
    }, 0);
    return sum + orderItemTotal;
  }, 0);
  const withItems = orders.filter((order) => (order.order_items || []).length > 0).length;

  console.log(JSON.stringify({
    count: orders.length,
    sumTotal,
    sumItems,
    withItems,
    noItems: orders.length - withItems,
  }, null, 2));
})();
