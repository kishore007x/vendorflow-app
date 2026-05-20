import fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const envRaw = fs.existsSync('./.env') ? fs.readFileSync('./.env','utf8') : '';
const env = envRaw.split(/\r?\n/).reduce((acc,line)=>{ const m=line.match(/^([^=]+)=(.*)$/); if(m){ const key = m[1].trim(); let val = m[2] === undefined ? '' : m[2].trim(); val = val.replace(/^\"|\"$/g, ''); val = val.replace(/^\'+|\'+$/g, ''); acc[key] = val; } return acc; },{});
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key){ console.error('Missing SUPABASE URL or SERVICE_ROLE key in .env or env vars'); process.exit(2); }

const supabase = createClient(url, key);
const path = 'new dataset/Inventory SKU.xlsx';
if(!fs.existsSync(path)){ console.error('Excel file not found at', path); process.exit(3); }

const wb = XLSX.read(fs.readFileSync(path), { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

const sampleSkus = [];
for (const r of rows) {
  const sku = r['SKU ID'] || r['SKU'] || r['sku'] || r['sku_id'] || r.Sku || r['Sku ID'];
  if (sku && !sampleSkus.includes(String(sku))) sampleSkus.push(String(sku));
  if (sampleSkus.length >= 5) break;
}

console.log('SAMPLE_SKUS:', sampleSkus);
if (sampleSkus.length === 0) { console.error('No SKU values found in the sheet'); process.exit(4); }

const { data, error } = await supabase
  .from('inventory')
  .select('id,sku_id,product_name,available_quantity,brand,created_at')
  .in('sku_id', sampleSkus);

if (error) { console.error('Supabase query error:', error); process.exit(5); }

console.log('MATCHED_ROWS:', data.length);
console.log(JSON.stringify(data, null, 2));
