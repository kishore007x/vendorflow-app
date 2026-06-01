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
  const { data, error } = await supabase.from('vendors').select('*').limit(20);
  if (error) {
    console.error('Error reading vendors:', error.message);
    process.exit(1);
  }
  console.log('Vendors rows:', (data || []).length);
  console.log(JSON.stringify(data || [], null, 2));
})();
