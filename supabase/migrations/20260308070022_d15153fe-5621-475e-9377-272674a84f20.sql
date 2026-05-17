
-- ═══════════════════════════════════════════════════════════
-- EXPENSES TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_by TEXT DEFAULT 'Self',
  payment_mode TEXT DEFAULT 'Cash',
  receipt BOOLEAN DEFAULT false,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view expenses" ON public.expenses FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert expenses" ON public.expenses FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update expenses" ON public.expenses FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- EMPLOYEES TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'piece_rate')),
  phone TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  monthly_salary NUMERIC DEFAULT 0,
  per_piece_rate NUMERIC DEFAULT 0,
  department TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view employees" ON public.employees FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert employees" ON public.employees FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update employees" ON public.employees FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete employees" ON public.employees FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- ATTENDANCE TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TEXT,
  check_out TEXT,
  method TEXT DEFAULT 'manual',
  network TEXT DEFAULT 'manual',
  hours_worked NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'half_day', 'absent', 'late')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view attendance" ON public.attendance FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert attendance" ON public.attendance FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update attendance" ON public.attendance FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- TAILOR WORK (PIECE RATE TRACKING)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.tailor_work (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  received INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0,
  rate_per_piece NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tailor_work ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view tailor_work" ON public.tailor_work FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert tailor_work" ON public.tailor_work FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update tailor_work" ON public.tailor_work FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- TASKS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'under_review', 'completed', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  portal TEXT,
  due_date TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view tasks" ON public.tasks FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert tasks" ON public.tasks FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));
CREATE POLICY "Vendor update tasks" ON public.tasks FOR UPDATE USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Admin delete tasks" ON public.tasks FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- WAREHOUSES TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER DEFAULT 0,
  utilized INTEGER DEFAULT 0,
  storage_cost_per_day NUMERIC DEFAULT 0.5,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view warehouses" ON public.warehouses FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert warehouses" ON public.warehouses FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update warehouses" ON public.warehouses FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete warehouses" ON public.warehouses FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- VENDORS TABLE (vendor business profiles)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  gst_verified BOOLEAN DEFAULT false,
  gst_business_name TEXT,
  gst_address TEXT,
  gst_status TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  subscription_plan TEXT DEFAULT 'trial',
  subscription_status TEXT DEFAULT 'trial',
  total_products INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  join_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage vendors" ON public.vendors FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));
CREATE POLICY "View own vendor" ON public.vendors FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));

-- ═══════════════════════════════════════════════════════════
-- CUSTOMERS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  pincode TEXT,
  city TEXT,
  state TEXT,
  total_orders INTEGER DEFAULT 0,
  total_returns INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  first_order_date DATE,
  last_order_date DATE,
  channels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view customers" ON public.customers FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert customers" ON public.customers FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));
CREATE POLICY "Vendor update customers" ON public.customers FOR UPDATE USING (can_access_vendor_data(vendor_id));

-- ═══════════════════════════════════════════════════════════
-- INVENTORY TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  sku_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  portal TEXT,
  warehouse TEXT,
  master_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  channel_allocations JSONB DEFAULT '{}',
  aging_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view inventory" ON public.inventory FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert inventory" ON public.inventory FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));
CREATE POLICY "Vendor update inventory" ON public.inventory FOR UPDATE USING (can_access_vendor_data(vendor_id));

-- ═══════════════════════════════════════════════════════════
-- SKU MAPPINGS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.sku_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  master_sku_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  amazon_sku TEXT,
  flipkart_sku TEXT,
  meesho_sku TEXT,
  firstcry_sku TEXT,
  blinkit_sku TEXT,
  own_website_sku TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sku_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view sku_mappings" ON public.sku_mappings FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert sku_mappings" ON public.sku_mappings FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update sku_mappings" ON public.sku_mappings FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete sku_mappings" ON public.sku_mappings FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- ALERTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
  type TEXT NOT NULL DEFAULT 'order_issue',
  portal TEXT,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view alerts" ON public.alerts FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Insert alerts" ON public.alerts FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));
CREATE POLICY "Update alerts" ON public.alerts FOR UPDATE USING (can_access_vendor_data(vendor_id));

-- ═══════════════════════════════════════════════════════════
-- VIDEOS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  order_id TEXT NOT NULL,
  video_status TEXT DEFAULT 'not_captured' CHECK (video_status IN ('not_captured', 'video_captured', 'invoice_captured', 'verified', 'completed')),
  invoice_image BOOLEAN DEFAULT false,
  internal_status TEXT DEFAULT 'Processing',
  file_name TEXT DEFAULT '—',
  resolution TEXT DEFAULT 'medium' CHECK (resolution IN ('low', 'medium', 'high')),
  captured_at TEXT DEFAULT '—',
  verified_by TEXT DEFAULT '—',
  retention_days INTEGER DEFAULT 90,
  expires_at TEXT DEFAULT '—',
  file_size TEXT DEFAULT '—',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view videos" ON public.videos FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert videos" ON public.videos FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));
CREATE POLICY "Vendor update videos" ON public.videos FOR UPDATE USING (can_access_vendor_data(vendor_id));

-- ═══════════════════════════════════════════════════════════
-- REPORTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  format TEXT DEFAULT 'Excel',
  size TEXT DEFAULT '0 KB',
  file_url TEXT,
  scheduled BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view reports" ON public.reports FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Insert reports" ON public.reports FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Update reports" ON public.reports FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- MARKETING CONFIG TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.marketing_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  channel TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, channel)
);
ALTER TABLE public.marketing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view marketing_config" ON public.marketing_config FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert marketing_config" ON public.marketing_config FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update marketing_config" ON public.marketing_config FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- SOCIAL MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.social_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  channel TEXT NOT NULL,
  sender TEXT NOT NULL,
  sender_phone TEXT,
  subject TEXT,
  preview TEXT,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'replied', 'pending', 'escalated')),
  category TEXT DEFAULT 'new_lead',
  auto_reply_triggered BOOLEAN DEFAULT false,
  auto_reply_flow TEXT,
  converted_to_task BOOLEAN DEFAULT false,
  task_category TEXT,
  saved_to_contacts BOOLEAN DEFAULT false,
  ai_confidence NUMERIC DEFAULT 0,
  escalated_to TEXT,
  follow_up_status TEXT DEFAULT 'none',
  follow_up_date DATE,
  human_replied BOOLEAN DEFAULT false,
  conversation_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view social_messages" ON public.social_messages FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert social_messages" ON public.social_messages FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations'));
CREATE POLICY "Vendor update social_messages" ON public.social_messages FOR UPDATE USING (can_access_vendor_data(vendor_id));

-- ═══════════════════════════════════════════════════════════
-- PRODUCT HEALTH TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.product_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID DEFAULT auth.uid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  portal_status JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor-isolated view product_health" ON public.product_health FOR SELECT USING (can_access_vendor_data(vendor_id));
CREATE POLICY "Vendor insert product_health" ON public.product_health FOR INSERT WITH CHECK ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor update product_health" ON public.product_health FOR UPDATE USING ((vendor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- Add updated_at triggers for new tables
-- ═══════════════════════════════════════════════════════════
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sku_mappings_updated_at BEFORE UPDATE ON public.sku_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_marketing_config_updated_at BEFORE UPDATE ON public.marketing_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_social_messages_updated_at BEFORE UPDATE ON public.social_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_product_health_updated_at BEFORE UPDATE ON public.product_health FOR EACH ROW EXECUTE FUNCTION update_updated_at();
