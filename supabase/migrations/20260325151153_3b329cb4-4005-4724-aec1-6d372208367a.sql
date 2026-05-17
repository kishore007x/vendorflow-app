CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid DEFAULT auth.uid(),
  name text NOT NULL,
  logo_url text,
  about text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor insert brands" ON public.brands
  FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendor update brands" ON public.brands
  FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendor-isolated view brands" ON public.brands
  FOR SELECT TO authenticated
  USING (can_access_vendor_data(vendor_id));

CREATE POLICY "Admin delete brands" ON public.brands
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();