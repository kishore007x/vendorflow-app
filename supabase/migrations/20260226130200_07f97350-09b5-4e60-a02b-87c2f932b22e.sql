
-- Tighten order insert/update to use created_by
DROP POLICY "Authenticated users can insert orders" ON public.orders;
DROP POLICY "Authenticated users can update orders" ON public.orders;
CREATE POLICY "Auth users can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations'));
CREATE POLICY "Auth users can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations') OR created_by = auth.uid());

-- Tighten order_items
DROP POLICY "Authenticated users can insert order items" ON public.order_items;
CREATE POLICY "Auth users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations'))));

-- Tighten returns
DROP POLICY "Authenticated users can manage returns" ON public.returns;
CREATE POLICY "Auth users can insert returns" ON public.returns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update returns" ON public.returns FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations'));
CREATE POLICY "Auth users can delete returns" ON public.returns FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tighten leads
DROP POLICY "Authenticated can manage leads" ON public.leads;
CREATE POLICY "Auth users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth users can update leads" ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
CREATE POLICY "Auth users can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tighten activity logs insert
DROP POLICY "Authenticated can insert logs" ON public.activity_logs;
CREATE POLICY "Auth users can insert own logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
