#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const { data: rows, error } = await supabase.from('orders').select('id,portal,order_number').limit(2000);
  if(error){ console.error(error); process.exit(1); }
  const map = {};
  (rows||[]).forEach(r => { const p = r.portal || 'null'; map[p] = (map[p]||0) + 1; });
  console.log('Order counts by portal (sample):', map);
})();
