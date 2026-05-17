-- Canonical inventory table used by the app

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  portal TEXT,
  available_quantity INTEGER DEFAULT 0,
  master_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  warehouse TEXT,
  channel_allocations JSONB DEFAULT '{}'::jsonb,
  aging_days INTEGER DEFAULT 0,
  vendor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_sku_id ON public.inventory (sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_portal ON public.inventory (portal);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON public.inventory (warehouse);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory'
      AND policyname = 'Authenticated users can view inventory'
  ) THEN
    CREATE POLICY "Authenticated users can view inventory"
      ON public.inventory
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory'
      AND policyname = 'Authenticated users can manage inventory'
  ) THEN
    CREATE POLICY "Authenticated users can manage inventory"
      ON public.inventory
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();