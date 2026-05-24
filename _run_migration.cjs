const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const SUPABASE_URL = dotenv.match(/SUPABASE_URL="([^"]+)"/)[1];
const SUPABASE_SERVICE_KEY = dotenv.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS public.support_tickets (
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
`;

async function main() {
  console.log('Trying to create support_tickets table via rest API...');
  // Try inserting into the table - if it doesn't exist, the error tells us
  const { error: testError } = await supabase.from('support_tickets').insert({
    subject: '_test_',
    issue_type: 'other',
    priority: 'low'
  }).single();
  
  if (testError && testError.message && testError.message.includes('does not exist')) {
    console.log('Table does not exist. You need to run this SQL in Supabase SQL editor:');
    console.log('\n' + sql);
  } else if (testError) {
    console.log('Other error:', testError.message);
  } else {
    console.log('Table already exists! Cleaning up test row...');
    await supabase.from('support_tickets').delete().eq('subject', '_test_');
    console.log('Ready to use support_tickets table.');
  }
}
main().catch(e => console.error('Fatal:', e.message));
