import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const tables = [
  {
    name: 'products',
    sql: `CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      brand TEXT,
      category TEXT,
      mrp NUMERIC NOT NULL DEFAULT 0,
      base_price NUMERIC,
      hsn_code TEXT,
      gst_percent NUMERIC,
      status TEXT DEFAULT 'active',
      image_url TEXT,
      portals_enabled TEXT[],
      vendor_id UUID,
      created_by UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  },
  {
    name: 'orders',
    sql: `CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number TEXT NOT NULL UNIQUE,
      portal TEXT NOT NULL,
      order_date TIMESTAMP NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      total_amount NUMERIC,
      status TEXT DEFAULT 'pending',
      shipped_date TIMESTAMP,
      delivered_date TIMESTAMP,
      vendor_id UUID,
      created_by UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  },
  {
    name: 'order_items',
    sql: `CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL,
      total_price NUMERIC,
      status TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  },
  {
    name: 'returns',
    sql: `CREATE TABLE IF NOT EXISTS returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      return_number TEXT UNIQUE,
      order_id UUID REFERENCES orders(id),
      product_id UUID REFERENCES products(id),
      quantity INTEGER,
      reason TEXT,
      status TEXT DEFAULT 'requested',
      requested_at TIMESTAMP,
      resolved_at TIMESTAMP,
      refund_amount NUMERIC,
      portal TEXT,
      vendor_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  },
  {
    name: 'invoices',
    sql: `CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number TEXT NOT NULL UNIQUE,
      type TEXT,
      portal TEXT,
      invoice_date TIMESTAMP,
      due_date TIMESTAMP,
      vendor_name TEXT,
      vendor_gst_no TEXT,
      total_amount NUMERIC,
      tax_amount NUMERIC,
      net_amount NUMERIC,
      status TEXT,
      finalized BOOLEAN DEFAULT FALSE,
      vendor_id UUID,
      created_by UUID,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  },
  {
    name: 'invoice_items',
    sql: `CREATE TABLE IF NOT EXISTS invoice_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      quantity INTEGER,
      unit_price NUMERIC,
      tax_amount NUMERIC,
      total_amount NUMERIC,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  },
  {
    name: 'customers',
    sql: `CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      vendor_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  },
  {
    name: 'inventory',
    sql: `CREATE TABLE IF NOT EXISTS inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id),
      quantity INTEGER DEFAULT 0,
      warehouse_location TEXT,
      last_updated TIMESTAMP DEFAULT NOW(),
      vendor_id UUID
    )`
  },
  {
    name: 'employees',
    sql: `CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      department TEXT,
      designation TEXT,
      vendor_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  }
];

async function createTables() {
  console.log('📊 Creating tables...\n');
  
  for (const table of tables) {
    try {
      // Try to create the table
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      
      if (error) {
        // If direct exec_sql doesn't work, try to verify table exists by querying it
        const { error: checkError } = await supabase.from(table.name).select('*').limit(0);
        
        if (checkError && checkError.code !== 'PGRST200') {
          console.log(`❌ ${table.name}: Could not create or verify table`);
          console.log(`   Error: ${error?.message || 'Unknown error'}`);
        } else {
          console.log(`✅ ${table.name}: Exists or created successfully`);
        }
      } else {
        console.log(`✅ ${table.name}: Created successfully`);
      }
    } catch (err) {
      // If RPC fails, try querying to check if table exists
      try {
        await supabase.from(table.name).select('*').limit(0);
        console.log(`✅ ${table.name}: Table exists`);
      } catch {
        console.log(`⚠️  ${table.name}: Unable to verify`);
      }
    }
  }
  
  console.log('\n📝 Note: If tables exist, the app will now display products!');
  console.log('   You can also manually paste the SQL from: supabase/migrations/create-app-tables.sql');
  console.log('   into the Supabase SQL Editor');
}

createTables().then(() => {
  console.log('\n✅ Table creation process completed');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
