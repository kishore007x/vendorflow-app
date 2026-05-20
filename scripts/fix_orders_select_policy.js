import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

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
  const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in environment/.env');
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'orders'
            AND policyname = 'Authenticated users can view all orders'
        ) THEN
          CREATE POLICY "Authenticated users can view all orders"
          ON public.orders
          FOR SELECT
          TO authenticated
          USING (true);
        END IF;
      END
      $$;
    `);

    const { rows } = await client.query(`
      SELECT policyname, roles, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'orders' AND cmd = 'SELECT'
      ORDER BY policyname;
    `);

    await client.query('COMMIT');
    console.log(JSON.stringify({
      message: 'Orders SELECT policy repaired',
      selectPolicies: rows,
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('fix_orders_select_policy failed:', error.message || error);
  process.exit(1);
});
