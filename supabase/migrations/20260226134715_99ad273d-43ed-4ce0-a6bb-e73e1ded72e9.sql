
-- ================================================
-- MULTI-VENDOR ISOLATION: Add vendor_id columns
-- ================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.reconciliation_logs ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.debit_notes ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS vendor_id uuid;

-- Set defaults for new inserts
ALTER TABLE public.products ALTER COLUMN vendor_id SET DEFAULT auth.uid();
ALTER TABLE public.orders ALTER COLUMN vendor_id SET DEFAULT auth.uid();
ALTER TABLE public.returns ALTER COLUMN vendor_id SET DEFAULT auth.uid();
ALTER TABLE public.invoices ALTER COLUMN vendor_id SET DEFAULT auth.uid();
ALTER TABLE public.leads ALTER COLUMN vendor_id SET DEFAULT auth.uid();
ALTER TABLE public.credit_notes ALTER COLUMN vendor_id SET DEFAULT auth.uid();
ALTER TABLE public.debit_notes ALTER COLUMN vendor_id SET DEFAULT auth.uid();
ALTER TABLE public.activity_logs ALTER COLUMN vendor_id SET DEFAULT auth.uid();

-- Backfill existing data
UPDATE public.products SET vendor_id = created_by WHERE vendor_id IS NULL AND created_by IS NOT NULL;
UPDATE public.orders SET vendor_id = created_by WHERE vendor_id IS NULL AND created_by IS NOT NULL;
UPDATE public.invoices SET vendor_id = created_by WHERE vendor_id IS NULL AND created_by IS NOT NULL;
UPDATE public.leads SET vendor_id = created_by WHERE vendor_id IS NULL AND created_by IS NOT NULL;
UPDATE public.credit_notes SET vendor_id = created_by WHERE vendor_id IS NULL AND created_by IS NOT NULL;
UPDATE public.debit_notes SET vendor_id = created_by WHERE vendor_id IS NULL AND created_by IS NOT NULL;
UPDATE public.activity_logs SET vendor_id = user_id WHERE vendor_id IS NULL AND user_id IS NOT NULL;

-- ================================================
-- FINANCIAL INTEGRITY
-- ================================================

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS finalized boolean NOT NULL DEFAULT false;
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- Unique order number prevents duplicates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_unique') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);
  END IF;
END $$;

-- Indexes for vendor_id filtering
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_returns_vendor_id ON public.returns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON public.invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_settlements_vendor_id ON public.settlements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_leads_vendor_id ON public.leads(vendor_id);

-- ================================================
-- VENDOR ACCESS HELPER
-- ================================================

CREATE OR REPLACE FUNCTION public.can_access_vendor_data(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operations')
    OR auth.uid() = _vendor_id
$$;

-- ================================================
-- INVOICE FINALIZATION TRIGGER
-- ================================================

CREATE OR REPLACE FUNCTION public.guard_finalized_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.finalized = true THEN
    RAISE EXCEPTION 'Cannot modify a finalized invoice';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_finalized_invoice ON public.invoices;
CREATE TRIGGER trg_guard_finalized_invoice
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.guard_finalized_invoice();

-- ================================================
-- SETTLEMENT LOCK TRIGGER
-- ================================================

CREATE OR REPLACE FUNCTION public.guard_locked_settlement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.locked = true THEN
    RAISE EXCEPTION 'Cannot modify a locked settlement';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_locked_settlement ON public.settlements;
CREATE TRIGGER trg_guard_locked_settlement
BEFORE UPDATE ON public.settlements
FOR EACH ROW
EXECUTE FUNCTION public.guard_locked_settlement();

-- ================================================
-- REPLACE RLS POLICIES: VENDOR ISOLATION
-- ================================================

-- PRODUCTS
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins and vendors can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins and vendors can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Vendor-isolated view products" ON public.products FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update products" ON public.products FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ORDERS
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Auth users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Auth users can update orders" ON public.orders;

CREATE POLICY "Vendor-isolated view orders" ON public.orders FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations'));
CREATE POLICY "Vendor update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.can_access_vendor_data(vendor_id));

-- ORDER ITEMS
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Auth users can insert order items" ON public.order_items;

CREATE POLICY "View order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND public.can_access_vendor_data(orders.vendor_id)));
CREATE POLICY "Insert order items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations'))));

-- RETURNS
DROP POLICY IF EXISTS "Authenticated users can view returns" ON public.returns;
DROP POLICY IF EXISTS "Auth users can insert returns" ON public.returns;
DROP POLICY IF EXISTS "Auth users can update returns" ON public.returns;
DROP POLICY IF EXISTS "Auth users can delete returns" ON public.returns;

CREATE POLICY "Vendor-isolated view returns" ON public.returns FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert returns" ON public.returns FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations'));
CREATE POLICY "Update returns" ON public.returns FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations'));
CREATE POLICY "Admin delete returns" ON public.returns FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INVOICES
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins and vendors can manage invoices" ON public.invoices;

CREATE POLICY "Vendor-isolated view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING ((vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) AND finalized = false);
CREATE POLICY "Admin delete invoices" ON public.invoices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INVOICE ITEMS
DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins and vendors can manage invoice items" ON public.invoice_items;

CREATE POLICY "View invoice items" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND public.can_access_vendor_data(invoices.vendor_id)));
CREATE POLICY "Manage invoice items" ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND (invoices.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) AND invoices.finalized = false));

-- SETTLEMENTS
DROP POLICY IF EXISTS "Authenticated can view settlements" ON public.settlements;
DROP POLICY IF EXISTS "Admins can manage settlements" ON public.settlements;

CREATE POLICY "Vendor-isolated view settlements" ON public.settlements FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Admin manage settlements" ON public.settlements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RECONCILIATION
DROP POLICY IF EXISTS "Authenticated can view reconciliation" ON public.reconciliation_logs;
DROP POLICY IF EXISTS "Admins can manage reconciliation" ON public.reconciliation_logs;

CREATE POLICY "Vendor-isolated view reconciliation" ON public.reconciliation_logs FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Admin manage reconciliation" ON public.reconciliation_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- LEADS
DROP POLICY IF EXISTS "Authenticated can view leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users can delete leads" ON public.leads;

CREATE POLICY "Vendor-isolated view leads" ON public.leads FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update leads" ON public.leads FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete leads" ON public.leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CREDIT NOTES
DROP POLICY IF EXISTS "Authenticated can view credit notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Admins vendors can manage credit notes" ON public.credit_notes;

CREATE POLICY "Vendor-isolated view credit notes" ON public.credit_notes FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor manage credit notes" ON public.credit_notes FOR ALL TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- DEBIT NOTES
DROP POLICY IF EXISTS "Authenticated can view debit notes" ON public.debit_notes;
DROP POLICY IF EXISTS "Admins vendors can manage debit notes" ON public.debit_notes;

CREATE POLICY "Vendor-isolated view debit notes" ON public.debit_notes FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor manage debit notes" ON public.debit_notes FOR ALL TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ACTIVITY LOGS
DROP POLICY IF EXISTS "Authenticated can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Auth users can insert own logs" ON public.activity_logs;

CREATE POLICY "Vendor-isolated view logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.can_access_vendor_data(vendor_id));
CREATE POLICY "Insert own logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ONBOARDING (keep admin-only management, add vendor self-view)
DROP POLICY IF EXISTS "Authenticated can view onboarding" ON public.onboarding_requests;
DROP POLICY IF EXISTS "Admins can manage onboarding" ON public.onboarding_requests;

CREATE POLICY "View onboarding" ON public.onboarding_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations') OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admin manage onboarding" ON public.onboarding_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- STORAGE POLICIES: Vendor-isolated file access
-- ================================================

-- Clear any existing custom policies on storage.objects
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname NOT LIKE 'storage_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Product images: public read, vendor-isolated write
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "Vendor upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Vendor manage product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Vendor delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- Documents: vendor-isolated
CREATE POLICY "Vendor view documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Vendor upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Invoices storage: vendor-isolated
CREATE POLICY "Vendor view invoices files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Vendor upload invoices files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Return evidence: vendor-isolated
CREATE POLICY "Vendor view return evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'return-evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Vendor upload return evidence" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'return-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
