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
  const pageSize = 1000;
  let from = 0;
  const counts = {};
  let total = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('orders')
      .select('portal')
      .range(from, to);

    if (error) {
      console.error('Error reading orders:', error.message);
      process.exit(1);
    }

    const rows = data || [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const portal = row.portal || 'null';
      counts[portal] = (counts[portal] || 0) + 1;
      total += 1;
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  console.log('Total orders scanned:', total);
  console.log('Order counts by portal (full):', counts);
})();
