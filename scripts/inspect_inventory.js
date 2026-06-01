#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split(/\r?\n/);
  const res = {};
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    res[k] = v;
  }
  return res;
}

const env = { ...process.env, ...loadEnvFile(new URL('../.env', import.meta.url).pathname) };
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

(async()=>{
  try{
    const { data, error } = await supabase.from('inventory').select('*').limit(50);
    if(error) throw error;
    console.log('Sample inventory rows:', (data||[]).length);
    for(const r of data||[]) console.log(JSON.stringify(r));
  }catch(e){ console.error(e); process.exit(1); }
})();
