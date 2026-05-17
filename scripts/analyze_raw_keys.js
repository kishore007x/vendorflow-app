#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const limit = 2000;
  const { data, error } = await supabase.from('firstcry_raw_files').select('row_data').limit(limit);
  if(error){ console.error('Error', error); process.exit(1); }
  const counts = {};
  for(const r of (data||[])){
    try{
      const rd = r.row_data;
      const obj = typeof rd==='string'?JSON.parse(rd):rd || {};
      for(const k of Object.keys(obj)){
        const key = String(k).trim().toLowerCase(); counts[key] = (counts[key]||0)+1;
      }
    }catch(e){ }
  }
  const arr = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,100);
  console.log('Top keys and counts (sample):');
  for(const [k,c] of arr) console.log(k, c);
  process.exit(0);
})();
