-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  brand TEXT,
  category TEXT,
  mrp NUMERIC NOT NULL,
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
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
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
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
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
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
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
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER,
  unit_price NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
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
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER DEFAULT 0,
  warehouse_location TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  vendor_id UUID
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  department TEXT,
  designation TEXT,
  vendor_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_portal ON orders(portal);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
