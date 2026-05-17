-- Drop orphaned staging and Firstcry import tables now that the app uses the canonical schema.
-- Keep the production tables (orders, products, returns, invoices, inventory, etc.) intact.

DROP TABLE IF EXISTS public.app_returns CASCADE;
DROP TABLE IF EXISTS public.app_invoices CASCADE;
DROP TABLE IF EXISTS public.app_inventory CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;

DROP TABLE IF EXISTS public.firstcry_sales CASCADE;
DROP TABLE IF EXISTS public.firstcry_gst_reconciliation CASCADE;
DROP TABLE IF EXISTS public.firstcry_product_box_details CASCADE;
DROP TABLE IF EXISTS public.firstcry_sale_returns CASCADE;
DROP TABLE IF EXISTS public.firstcry_vendor_invoices CASCADE;
DROP TABLE IF EXISTS public.firstcry_vendor_reconciliation CASCADE;
DROP TABLE IF EXISTS public.firstcry_payment_advice CASCADE;
DROP TABLE IF EXISTS public.firstcry_debit_notes CASCADE;
DROP TABLE IF EXISTS public.firstcry_raw_files CASCADE;

DROP TABLE IF EXISTS public.dashboard_sales CASCADE;
DROP TABLE IF EXISTS public.gst_reconciliation CASCADE;
DROP TABLE IF EXISTS public.payment_advice CASCADE;
DROP TABLE IF EXISTS public.post_orders CASCADE;
DROP TABLE IF EXISTS public.pre_orders CASCADE;
DROP TABLE IF EXISTS public.product_box_details CASCADE;
DROP TABLE IF EXISTS public.sale_returns CASCADE;
DROP TABLE IF EXISTS public.vendor_invoices CASCADE;
DROP TABLE IF EXISTS public.vendor_reconciliation CASCADE;
