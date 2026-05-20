import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^"|"$/g, '');
    out[key] = value;
  }

  return out;
}

async function main() {
  const env = parseEnvFile('.env');

  const supabaseUrl = process.env.SUPABASE_URL
    ? process.env.SUPABASE_URL
    : (env.SUPABASE_URL ? env.SUPABASE_URL : env.VITE_SUPABASE_URL);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : (env.SUPABASE_SERVICE_ROLE_KEY ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_SERVICE_KEY);

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or service key in environment/.env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const total = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const nullVendor = await supabase.from('orders').select('*', { count: 'exact', head: true }).is('vendor_id', null);
  const withVendor = await supabase.from('orders').select('*', { count: 'exact', head: true }).not('vendor_id', 'is', null);

  const sampleOrders = await supabase
    .from('orders')
    .select('id,order_number,vendor_id,created_by,portal,created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const roles = await supabase
    .from('user_roles')
    .select('user_id,role')
    .limit(20);

  const result = {
    counts: {
      total: total.count,
      nullVendorId: nullVendor.count,
      withVendorId: withVendor.count,
    },
    errors: {
      total: total.error ? total.error.message : null,
      nullVendor: nullVendor.error ? nullVendor.error.message : null,
      withVendor: withVendor.error ? withVendor.error.message : null,
      sampleOrders: sampleOrders.error ? sampleOrders.error.message : null,
      roles: roles.error ? roles.error.message : null,
    },
    sampleOrders: sampleOrders.data || [],
    sampleRoles: roles.data || [],
  };

  console.log(JSON.stringify(result, null, 2));

  const hasErrors = Object.values(result.errors).some((err) => Boolean(err));
  if (hasErrors) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('diagnose_orders_visibility failed:', err);
  process.exit(1);
});
