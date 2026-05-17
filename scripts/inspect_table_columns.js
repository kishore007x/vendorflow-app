#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  try{
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if(error){ console.error('Error selecting orders', error); process.exit(1); }
    if(!data || data.length===0){ console.log('Orders table exists but has no rows; cannot infer columns from data.'); process.exit(0); }
    console.log('Sample order keys:', Object.keys(data[0]));
  }catch(e){ console.error('Failed', e); process.exit(1); }
})();
