import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(url, key);
const { data, error } = await s.from('invoices').select('type');
if (error) { console.log('ERR:', error.message); process.exit(0); }
const m = {};
for (const x of data) { m[x.type] = (m[x.type] || 0) + 1; }
console.log(JSON.stringify(m));
