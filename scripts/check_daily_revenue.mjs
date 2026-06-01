import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total_amount, total, amount');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Fetched ${orders.length} orders (default limit test)`);
}

main();
