import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(url, key);

const tables = [
  'orders', 'order_items', 'products', 'product_health', 'inventory',
  'returns', 'settlements', 'reconciliation_logs', 'invoices', 'invoice_items',
  'debit_notes', 'credit_notes', 'purchase_orders', 'purchase_invoices', 'inward_stock',
  'warehouses', 'vendors', 'customers', 'leads', 'brands',
  'employees', 'attendance', 'leave_requests', 'tasks',
  'broadcasts', 'social_messages', 'chat_conversations',
  'alerts', 'activity_logs', 'api_logs',
  'onboarding_requests', 'reports', 'videos',
  'marketing_config', 'automation_settings', 'dropdown_options',
  'sku_mappings', 'expenses', 'reviews', 'feedback', 'keywords',
  'support_tickets', 'gst_reconciliation',
  'firstcry_raw_files', 'firstcry_data', 'firstcry_invoices'
];

for (const name of tables) {
  try {
    const { count, error } = await supabase.from(name).select('*', { count: 'exact', head: true });
    if (error && error.code === '42P01') {
      console.log(`${name}: TABLE NOT FOUND`);
    } else if (error) {
      console.log(`${name}: ERROR ${error.code} - ${error.message}`);
    } else {
      console.log(`${name}: ${count}`);
    }
  } catch (e) {
    console.log(`${name}: EXCEPTION - ${e.message}`);
  }
}
