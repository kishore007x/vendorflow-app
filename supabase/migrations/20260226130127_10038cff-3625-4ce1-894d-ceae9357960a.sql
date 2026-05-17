
-- Create enum types
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rto', 'returned');
CREATE TYPE public.return_status AS ENUM ('requested', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'received', 'refund_initiated', 'closed');
CREATE TYPE public.settlement_status AS ENUM ('pending', 'processing', 'completed', 'disputed', 'failed');
CREATE TYPE public.subscription_status AS ENUM ('trial', 'fully_paid', 'partially_paid', 'expired', 'suspended');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost');
CREATE TYPE public.lead_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.onboarding_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor', 'operations');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'vendor',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  brand TEXT,
  category TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  mrp NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 18,
  hsn_code TEXT,
  image_url TEXT,
  portals_enabled TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and vendors can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vendor'));
CREATE POLICY "Admins and vendors can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vendor'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  portal TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_pincode TEXT,
  customer_city TEXT,
  customer_state TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission NUMERIC(12,2) DEFAULT 0,
  shipping_fee NUMERIC(12,2) DEFAULT 0,
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  shipped_date TIMESTAMPTZ,
  delivered_date TIMESTAMPTZ,
  video_captured BOOLEAN DEFAULT false,
  video_quality TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orders" ON public.orders FOR UPDATE TO authenticated USING (true);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 18,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view order items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);

-- Returns & Claims
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  order_number TEXT NOT NULL,
  portal TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  reason TEXT,
  status return_status NOT NULL DEFAULT 'requested',
  refund_amount NUMERIC(12,2) DEFAULT 0,
  claim_status TEXT DEFAULT 'pending',
  evidence_urls TEXT[] DEFAULT '{}',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view returns" ON public.returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage returns" ON public.returns FOR ALL TO authenticated USING (true);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'sales', -- sales, purchase
  order_id UUID REFERENCES public.orders(id),
  party_name TEXT NOT NULL,
  gstin TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(12,2) DEFAULT 0,
  sgst NUMERIC(12,2) DEFAULT 0,
  igst NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and vendors can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vendor'));

-- Invoice line items
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  hsn_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 18,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and vendors can manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vendor'));

-- Debit Notes
CREATE TABLE public.debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  party_name TEXT NOT NULL,
  reason TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(12,2) DEFAULT 0,
  sgst NUMERIC(12,2) DEFAULT 0,
  igst NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  note_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view debit notes" ON public.debit_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins vendors can manage debit notes" ON public.debit_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vendor'));

-- Credit Notes
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  party_name TEXT NOT NULL,
  reason TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(12,2) DEFAULT 0,
  sgst NUMERIC(12,2) DEFAULT 0,
  igst NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  note_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view credit notes" ON public.credit_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins vendors can manage credit notes" ON public.credit_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'vendor'));

-- Settlements
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id TEXT NOT NULL UNIQUE,
  portal TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status settlement_status NOT NULL DEFAULT 'pending',
  settlement_date TIMESTAMPTZ,
  reference_orders TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view settlements" ON public.settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settlements" ON public.settlements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reconciliation Logs
CREATE TABLE public.reconciliation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  portal TEXT NOT NULL,
  expected_orders INTEGER DEFAULT 0,
  processed_orders INTEGER DEFAULT 0,
  difference INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reconciliation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view reconciliation" ON public.reconciliation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage reconciliation" ON public.reconciliation_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'website',
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority DEFAULT 'medium',
  assigned_to TEXT,
  value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage leads" ON public.leads FOR ALL TO authenticated USING (true);

-- Onboarding Requests
CREATE TABLE public.onboarding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gstin TEXT,
  business_type TEXT,
  platforms TEXT[] DEFAULT '{}',
  status onboarding_status NOT NULL DEFAULT 'submitted',
  subscription_status subscription_status DEFAULT 'trial',
  subscription_expiry TIMESTAMPTZ,
  access_enabled BOOLEAN DEFAULT true,
  documents TEXT[] DEFAULT '{}',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view onboarding" ON public.onboarding_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage onboarding" ON public.onboarding_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Activity Logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendor');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_onboarding_updated_at BEFORE UPDATE ON public.onboarding_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('return-evidence', 'return-evidence', false);

-- Storage policies
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Auth users upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Auth users read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('documents', 'invoices', 'return-evidence'));
CREATE POLICY "Auth users upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('documents', 'invoices', 'return-evidence'));
CREATE POLICY "Auth users delete own uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('product-images', 'documents', 'invoices', 'return-evidence'));
