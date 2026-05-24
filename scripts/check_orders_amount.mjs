import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await s.from('orders').select('*').limit(3);
if (error) { console.log('ERR:', error.message); process.exit(0); }
console.log(JSON.stringify(data, null, 2));
