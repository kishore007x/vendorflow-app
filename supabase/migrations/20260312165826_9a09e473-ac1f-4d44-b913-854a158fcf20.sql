
CREATE TABLE public.dropdown_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid DEFAULT auth.uid(),
  field_type text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor view own dropdown_options" ON public.dropdown_options
  FOR SELECT TO authenticated
  USING (can_access_vendor_data(vendor_id));

CREATE POLICY "Vendor insert dropdown_options" ON public.dropdown_options
  FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendor update dropdown_options" ON public.dropdown_options
  FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendor delete dropdown_options" ON public.dropdown_options
  FOR DELETE TO authenticated
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
