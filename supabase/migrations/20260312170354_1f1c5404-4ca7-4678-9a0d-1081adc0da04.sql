
ALTER TABLE public.product_health
  ADD COLUMN IF NOT EXISTS rating numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
