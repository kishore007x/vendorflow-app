#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path){ if(!fs.existsSync(path)) return {}; const c=fs.readFileSync(path,'utf8'); return Object.fromEntries(c.split(/\r?\n/).filter(Boolean).map(l=>{const i=l.indexOf('='); const k=l.slice(0,i); let v=l.slice(i+1); if(v.startsWith('"')&&v.endsWith('"')) v=v.slice(1,-1); return [k,v];})); }
const env = { ...process.env, ...loadEnv(new URL('../.env', import.meta.url).pathname) };
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key){ console.error('Missing public supabase env'); process.exit(1); }
const supabase = createClient(url, key, { auth: { persistSession:false }});
(async()=>{
  try{
    const tables = ['orders','order_items','inventory','products'];
    for(const t of tables){
      const { data, error } = await supabase.from(t).select('id').limit(1);
      if(error) console.log(t, 'ERR', error.message); else console.log(t, 'ROWS', (data||[]).length>0 ? 'visible' : 'no rows visible');
    }
  }catch(e){ console.error(e); process.exit(1); }
})();
