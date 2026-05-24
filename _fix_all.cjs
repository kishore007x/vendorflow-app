const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const SUPABASE_URL = dotenv.match(/SUPABASE_URL="([^"]+)"/)[1];
const SUPABASE_SERVICE_KEY = dotenv.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // Check feedback table structure
  const { data, error } = await supabase.from('feedback').select('*').limit(3);
  if (error) {
    console.log('feedback error:', error.message);
  } else {
    console.log('feedback columns:', data.length > 0 ? Object.keys(data[0]) : 'no rows');
    if (data.length > 0) console.log('sample:', JSON.stringify(data[0], null, 2));
  }
  
  // Check products table count
  const { data: prodData } = await supabase.from('products').select('id');
  console.log('Products count:', prodData?.length || 0);
  
  // Check orders count
  const { data: ordData } = await supabase.from('orders').select('id').limit(5);
  console.log('Orders have data:', ordData && ordData.length > 0);
}
main().catch(e => console.error(e));
