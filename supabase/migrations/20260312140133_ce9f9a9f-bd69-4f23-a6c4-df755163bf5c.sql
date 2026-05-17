ALTER TABLE public.sku_mappings 
  ADD COLUMN IF NOT EXISTS amazon_url text,
  ADD COLUMN IF NOT EXISTS flipkart_url text,
  ADD COLUMN IF NOT EXISTS meesho_url text,
  ADD COLUMN IF NOT EXISTS firstcry_url text,
  ADD COLUMN IF NOT EXISTS blinkit_url text,
  ADD COLUMN IF NOT EXISTS own_website_url text;

ALTER TABLE public.product_health 
  ADD COLUMN IF NOT EXISTS last_checked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sku_mapping_id uuid REFERENCES public.sku_mappings(id) ON DELETE SET NULL;