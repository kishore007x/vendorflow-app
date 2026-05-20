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
    throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: roleRows, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'admin')
    .limit(1);

  if (rolesError) throw rolesError;
  if (!roleRows || roleRows.length === 0) {
    throw new Error('No admin user found in user_roles');
  }

  const adminUserId = roleRows[0].user_id;

  const before = await supabase.from('orders').select('*', { count: 'exact', head: true }).is('vendor_id', null);
  if (before.error) throw before.error;

  const rowsWithCreatedBy = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .is('vendor_id', null)
    .not('created_by', 'is', null);

  if (rowsWithCreatedBy.error) throw rowsWithCreatedBy.error;

  const fallback = await supabase
    .from('orders')
    .update({ vendor_id: adminUserId })
    .is('vendor_id', null)
    .select('id', { count: 'exact' });

  if (fallback.error) throw fallback.error;

  const after = await supabase.from('orders').select('*', { count: 'exact', head: true }).is('vendor_id', null);
  if (after.error) throw after.error;

  console.log(JSON.stringify({
    adminUserId,
    nullVendorBefore: before.count,
    rowsWithCreatedBy: rowsWithCreatedBy.count || 0,
    rowsSetToAdminFallback: fallback.count || 0,
    nullVendorAfter: after.count,
  }, null, 2));
}

main().catch((err) => {
  console.error('backfill_orders_vendor_id failed:', err.message || err);
  process.exit(1);
});
