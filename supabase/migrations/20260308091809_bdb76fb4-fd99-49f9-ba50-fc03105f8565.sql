
-- Chat conversations table for persisting AI chat history
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  vendor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor view own chats" ON public.chat_conversations
  FOR SELECT USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor insert own chats" ON public.chat_conversations
  FOR INSERT WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendor update own chats" ON public.chat_conversations
  FOR UPDATE USING (vendor_id = auth.uid());

CREATE POLICY "Vendor delete own chats" ON public.chat_conversations
  FOR DELETE USING (vendor_id = auth.uid());

-- Automation settings table
CREATE TABLE public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  vendor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_id, vendor_id)
);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor view own automation" ON public.automation_settings
  FOR SELECT USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor insert own automation" ON public.automation_settings
  FOR INSERT WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor update own automation" ON public.automation_settings
  FOR UPDATE USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_automation_settings_updated_at
  BEFORE UPDATE ON public.automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
