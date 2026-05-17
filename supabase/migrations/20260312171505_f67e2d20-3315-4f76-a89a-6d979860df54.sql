
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS block_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone DEFAULT NULL;
