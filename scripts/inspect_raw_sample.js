#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });
(async()=>{
  const { data, error } = await supabase.from('firstcry_raw_files').select('*').order('id',{ascending:true}).limit(5);
  if(error) { console.error('Error', error); process.exit(1); }
  for(const r of (data||[])){
    console.log('--- RAW ID', r.id, 'source_file', r.source_file, 'sheet', r.sheet_name);
    try{ const rd = r.row_data || r.row_data_json || r.row_data; const obj = typeof rd==='string'?JSON.parse(rd):rd; console.log(Object.keys(obj||{}).slice(0,50)); console.log(JSON.stringify(obj, null, 2).slice(0,1000)); }catch(e){ console.error('parse error', e); }
  }
  process.exit(0);
})();
