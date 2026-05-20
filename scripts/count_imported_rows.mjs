import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envRaw = fs.existsSync('./.env') ? fs.readFileSync('./.env','utf8') : '';
const env = envRaw.split(/\r?\n/).reduce((acc,line)=>{ const m=line.match(/^([^=]+)=(.*)$/); if(m){ const key = m[1].trim(); let val = m[2] === undefined ? '' : m[2].trim(); val = val.replace(/^\"|\"$/g, ''); val = val.replace(/^\'+|\'+$/g, ''); acc[key] = val; } return acc; },{});
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key){ console.error('Missing SUPABASE URL or SERVICE_ROLE key in .env or env vars'); process.exit(2); }

const supabase = createClient(url, key);

const start = process.argv[2] || '2026-05-19T00:00:00Z';
const end = process.argv[3] || new Date().toISOString();

console.log('Counting inventory rows between', start, 'and', end);

const { data, error, count } = await supabase
  .from('inventory')
  .select('id', { count: 'exact' })
  .gte('created_at', start)
  .lte('created_at', end);

if (error) { console.error('Supabase query error:', error); process.exit(3); }

console.log('COUNT:', count || (data && data.length) || 0);
if (data && data.length) console.log('SAMPLE_ROWS:', JSON.stringify(data.slice(0,5), null, 2));
