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
  const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let page = 1;
  const perPage = 200;
  const allUsers = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    if (users.length === 0) break;

    allUsers.push(...users);
    if (users.length < perPage) break;
    page += 1;
  }

  const userIds = allUsers.map((u) => u.id);
  if (userIds.length === 0) {
    console.log(JSON.stringify({ usersFound: 0, insertedAdminRoles: 0 }, null, 2));
    return;
  }

  const { data: existingAdmins, error: existingError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .in('user_id', userIds);

  if (existingError) throw existingError;

  const existingSet = new Set((existingAdmins || []).map((r) => r.user_id));
  const toInsert = userIds
    .filter((id) => !existingSet.has(id))
    .map((id) => ({ user_id: id, role: 'admin' }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('user_roles').insert(toInsert);
    if (insertError) throw insertError;
  }

  console.log(JSON.stringify({
    usersFound: userIds.length,
    existingAdminRoles: existingSet.size,
    insertedAdminRoles: toInsert.length,
  }, null, 2));
}

main().catch((err) => {
  console.error('grant_admin_to_all_users failed:', err.message || err);
  process.exit(1);
});
