const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const SUPABASE_URL = dotenv.match(/SUPABASE_URL="([^"]+)"/)[1];
const SUPABASE_SERVICE_KEY = dotenv.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // Try to call exec_sql RPC if it exists
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_text: `CREATE TABLE IF NOT EXISTS public.support_tickets (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        vendor_id uuid,
        subject text NOT NULL,
        issue_type text NOT NULL DEFAULT 'other',
        priority text NOT NULL DEFAULT 'medium',
        status text NOT NULL DEFAULT 'open',
        description text DEFAULT '',
        channel text DEFAULT 'internal',
        agent text DEFAULT 'Unassigned',
        handler text DEFAULT 'human',
        bot_transferred boolean DEFAULT false,
        bot_resolved boolean DEFAULT false,
        auto_replied boolean DEFAULT false,
        auto_reply_success boolean DEFAULT false,
        rating integer,
        sla_hours integer DEFAULT 48,
        timeline jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );`
    });
    if (error) {
      console.log('exec_sql RPC not available:', error.message);
      // Try with supabase_functions
      const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql_text: 'SELECT 1' })
      });
      const resultText = await result.text();
      console.log('exec_sql via REST:', result.status, resultText.slice(0, 200));
    } else {
      console.log('Table created:', data);
    }
  } catch(e) {
    console.error('Fatal:', e.message);
  }
  
  // Alternative: Use the postgres REST API
  console.log('\nTo create the table, run this SQL in Supabase SQL editor:\n');
  console.log(`CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid,
  subject text NOT NULL,
  issue_type text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  description text DEFAULT '',
  channel text DEFAULT 'internal',
  agent text DEFAULT 'Unassigned',
  handler text DEFAULT 'human',
  bot_transferred boolean DEFAULT false,
  bot_resolved boolean DEFAULT false,
  auto_replied boolean DEFAULT false,
  auto_reply_success boolean DEFAULT false,
  rating integer,
  sla_hours integer DEFAULT 48,
  timeline jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;`);

  // Save migration file
  const migrationDir = path.join(__dirname, 'supabase', 'migrations');
  const migrationFile = path.join(migrationDir, '20260524000000_create_support_tickets.sql');
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }
  fs.writeFileSync(migrationFile, `-- Create support_tickets table for the Support Dashboard module
${fs.readFileSync(__filename, 'utf8').split('console.log').slice(1).join('\n').replace(/.*To create the table.*/g, '')}`);
  console.log(`\nMigration file saved to: ${migrationFile}`);
}
main().catch(e => console.error('Fatal:', e.message));
