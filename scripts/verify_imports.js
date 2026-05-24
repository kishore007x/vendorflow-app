#!/usr/bin/env node
/*
  verify_imports.js
  Simple verification script to report row counts for key tables and detect zero/NULL totals in `orders`.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify_imports.js
*/
(async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set env vars and retry.');
      process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    const tables = [
      'orders', 'order_items', 'inventory', 'sku_mappings', 'returns', 'settlements', 'products', 'invoices'
    ];

    const report = {};
    for (const t of tables) {
      try {
        const { count, error } = await supabase.from(t).select('id', { count: 'exact', head: true });
        if (error) {
          report[t] = { error: error.message };
        } else {
          report[t] = { count: count ?? 0 };
        }
      } catch (e) {
        report[t] = { error: e.message };
      }
    }

    // Special checks on orders
    try {
      const { count: zeros, error: zerosErr } = await supabase.from('orders').select('id', { count: 'exact', head: true }).or('total_amount.is.null,total_amount.eq.0');
      if (zerosErr) report.orders_zero_or_null = { error: zerosErr.message };
      else report.orders_zero_or_null = { count: zeros ?? 0 };
    } catch (e) {
      report.orders_zero_or_null = { error: e.message };
    }

    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(2);
  }
})();
