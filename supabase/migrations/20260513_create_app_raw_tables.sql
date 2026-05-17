-- Create lightweight app staging tables to hold Firstcry raw data

CREATE TABLE IF NOT EXISTS public.app_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poid TEXT,
  sr_no TEXT,
  order_date TIMESTAMP,
  sales_return_date TIMESTAMP,
  product_id TEXT,
  product_name TEXT,
  vendor_style_code TEXT,
  ordered_quantity INTEGER,
  quantity INTEGER,
  reason TEXT,
  subtype_reason TEXT,
  subreason TEXT,
  source_file TEXT,
  sheet_name TEXT,
  inserted_at TIMESTAMPTZ,
  raw JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT,
  vendor_invoice_no TEXT,
  invoice_number TEXT,
  type TEXT,
  party_name TEXT,
  gstin TEXT,
  total_amount NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  status TEXT,
  invoice_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  pdf_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  vendor_id UUID,
  finalized BOOLEAN DEFAULT FALSE,
  raw JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.app_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT,
  vendor_style_code TEXT,
  product_name TEXT,
  packaging_id TEXT,
  length_cm NUMERIC,
  breadth_cm NUMERIC,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  multiple_packaging_required BOOLEAN,
  master_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  warehouse TEXT,
  channel_allocations JSONB DEFAULT '{}',
  raw JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
