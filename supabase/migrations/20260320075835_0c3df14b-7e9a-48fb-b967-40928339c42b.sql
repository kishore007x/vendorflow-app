
ALTER TABLE public.sku_mappings
  ADD COLUMN IF NOT EXISTS amazon_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flipkart_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meesho_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS firstcry_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blinkit_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS own_website_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrp numeric DEFAULT 0;
