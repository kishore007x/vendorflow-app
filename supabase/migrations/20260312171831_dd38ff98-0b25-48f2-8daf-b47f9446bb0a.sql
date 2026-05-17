
-- Leave/Permission requests table
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  vendor_id uuid DEFAULT auth.uid(),
  type text NOT NULL DEFAULT 'leave', -- leave, permission, half_day
  leave_type text DEFAULT 'casual', -- casual, sick, earned, unpaid
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by text,
  approved_at timestamptz,
  permission_from text, -- for permission type: time range
  permission_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor insert leave_requests" ON public.leave_requests FOR INSERT TO public
  WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor update leave_requests" ON public.leave_requests FOR UPDATE TO public
  USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor-isolated view leave_requests" ON public.leave_requests FOR SELECT TO public
  USING (can_access_vendor_data(vendor_id));

-- Add biometric_id to employees for device integration
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS biometric_id text DEFAULT NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS total_leaves integer DEFAULT 18;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS leaves_used integer DEFAULT 0;
