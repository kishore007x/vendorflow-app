-- ================================================
-- GST RECONCILIATION TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.gst_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  state TEXT NOT NULL,
  gstr_type TEXT NOT NULL,
  credit_type TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  transaction_month TEXT NOT NULL,
  return_frequency TEXT NOT NULL,
  gstin TEXT NOT NULL,
  reference_id TEXT,
  invoice_no TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  cgst NUMERIC(12,2) DEFAULT 0,
  sgst NUMERIC(12,2) DEFAULT 0,
  igst NUMERIC(12,2) DEFAULT 0,
  gst_type TEXT,
  total_tax NUMERIC(12,2) DEFAULT 0,
  created_by TEXT,
  status TEXT DEFAULT 'Pending',
  exp_id TEXT,
  vendor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gst_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor-isolated view gst_reconciliation" ON public.gst_reconciliation FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor insert gst_reconciliation" ON public.gst_reconciliation FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor update gst_reconciliation" ON public.gst_reconciliation FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete gst_reconciliation" ON public.gst_reconciliation FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_gst_reconciliation_updated_at BEFORE UPDATE ON public.gst_reconciliation
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create index on vendor_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_gst_reconciliation_vendor_id ON public.gst_reconciliation(vendor_id);
CREATE INDEX IF NOT EXISTS idx_gst_reconciliation_invoice_no ON public.gst_reconciliation(invoice_no);
