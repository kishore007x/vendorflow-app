#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if(error){ console.error('Error selecting products', error); process.exit(1); }
  if(!data || data.length===0){ console.log('products exists but has no rows'); process.exit(0); }
  console.log('Sample products keys:', Object.keys(data[0]));
  const priceCandidates = ['price','base_price','mrp','retail_price','selling_price','default_price','cost_price','list_price'];
  const found = priceCandidates.filter(k=>k in data[0]);
  console.log('Found candidate price fields in product sample:', found);
  console.log('Sample product row (selected fields):', JSON.stringify(Object.fromEntries(Object.entries(data[0]).filter(([k])=>found.includes(k)).slice(0,10)), null, 2));
})();
