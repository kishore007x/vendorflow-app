const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const SUPABASE_URL = dotenv.match(/SUPABASE_URL="([^"]+)"/)[1];
const SUPABASE_SERVICE_KEY = dotenv.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // Check if support_tickets table exists
  const { data, error } = await supabase.from('support_tickets').select('id').limit(1);
  if (error) {
    console.log('support_tickets table:', error.message);
  } else {
    console.log('support_tickets table exists, has data:', data.length > 0);
  }

  // Check if gstin table exists  
  const { data: gData, error: gError } = await supabase.from('gstin_registry').select('id').limit(1);
  if (gError) {
    console.log('gstin_registry table:', gError.message);
  } else {
    console.log('gstin_registry table exists');
  }

  // Try querying information_schema for relevant table names
  const { data: tables, error: tError } = await supabase.rpc('get_tables').maybeSingle();
  if (tError) {
    // Try direct query
    const { data: names } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    if (names) {
      const relevant = names.map(t => t.table_name).filter(n => n && (n.includes('ticket') || n.includes('support') || n.includes('gst') || n.includes('pnl')));
      console.log('Relevant tables:', relevant);
    }
  }
}
main().catch(e => console.error(e));
