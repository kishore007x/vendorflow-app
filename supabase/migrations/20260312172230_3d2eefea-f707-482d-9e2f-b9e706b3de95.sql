
-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  supplier_name text NOT NULL,
  supplier_gstin text,
  supplier_phone text,
  supplier_email text,
  supplier_address text,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery date,
  status text NOT NULL DEFAULT 'draft', -- draft, sent, confirmed, partial_received, received, cancelled
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  cgst numeric DEFAULT 0,
  sgst numeric DEFAULT 0,
  igst numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  payment_terms text,
  vendor_id uuid DEFAULT auth.uid(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor insert purchase_orders" ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update purchase_orders" ON public.purchase_orders FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor-isolated view purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated
  USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Admin delete purchase_orders" ON public.purchase_orders FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Purchase Invoices / Bills table
CREATE TABLE public.purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text NOT NULL,
  supplier_bill_number text,
  supplier_name text NOT NULL,
  supplier_gstin text,
  po_id uuid REFERENCES public.purchase_orders(id),
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  cgst numeric DEFAULT 0,
  sgst numeric DEFAULT 0,
  igst numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'unpaid', -- unpaid, partial, paid
  payment_mode text,
  notes text,
  vendor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor insert purchase_invoices" ON public.purchase_invoices FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update purchase_invoices" ON public.purchase_invoices FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor-isolated view purchase_invoices" ON public.purchase_invoices FOR SELECT TO authenticated
  USING (can_access_vendor_data(vendor_id));

-- Inward Stock / Goods Receipt table
CREATE TABLE public.inward_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number text NOT NULL, -- Goods Receipt Note number
  po_id uuid REFERENCES public.purchase_orders(id),
  purchase_invoice_id uuid REFERENCES public.purchase_invoices(id),
  supplier_name text NOT NULL,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{product_name, sku, ordered_qty, received_qty, rejected_qty, rate}]
  total_received integer DEFAULT 0,
  total_rejected integer DEFAULT 0,
  warehouse text,
  quality_status text DEFAULT 'pending', -- pending, passed, partial, failed
  notes text,
  vendor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inward_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor insert inward_stock" ON public.inward_stock FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update inward_stock" ON public.inward_stock FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor-isolated view inward_stock" ON public.inward_stock FOR SELECT TO authenticated
  USING (can_access_vendor_data(vendor_id));
