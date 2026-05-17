import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PortalUrlKey = 'amazon_url' | 'flipkart_url' | 'meesho_url' | 'firstcry_url' | 'blinkit_url' | 'own_website_url';
type PortalKey = 'amazon' | 'flipkart' | 'meesho' | 'firstcry' | 'blinkit' | 'own_website';

const URL_TO_PORTAL: Record<PortalUrlKey, PortalKey> = {
  amazon_url: 'amazon',
  flipkart_url: 'flipkart',
  meesho_url: 'meesho',
  firstcry_url: 'firstcry',
  blinkit_url: 'blinkit',
  own_website_url: 'own_website',
};

async function checkUrl(url: string): Promise<'live' | 'not_active'> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    // 200-299 = live, 404/410 = not active, others = not active
    if (response.ok) {
      // Check for common "product not found" indicators in the page
      const text = await response.text();
      const notFoundPatterns = [
        'currently unavailable',
        'product is no longer available',
        'page not found',
        'item is not available',
        'out of stock',
        'sold out',
        'no longer available',
        'this item cannot be shipped',
      ];
      const lowerText = text.toLowerCase();
      for (const pattern of notFoundPatterns) {
        if (lowerText.includes(pattern)) {
          return 'not_active';
        }
      }
      return 'live';
    }
    return 'not_active';
  } catch (e) {
    console.error(`Error checking URL ${url}:`, e);
    return 'not_active';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional: check a specific vendor_id or mapping_id
    let vendorId: string | null = null;
    let mappingId: string | null = null;
    try {
      const body = await req.json();
      vendorId = body.vendor_id || null;
      mappingId = body.mapping_id || null;
    } catch { /* no body = check all */ }

    // Fetch all SKU mappings with URLs
    let query = supabase.from('sku_mappings').select('*');
    if (vendorId) query = query.eq('vendor_id', vendorId);
    if (mappingId) query = query.eq('id', mappingId);
    const { data: mappings, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const results: any[] = [];
    const statusChanges: any[] = [];

    for (const mapping of (mappings || [])) {
      const portalStatus: Record<string, string> = {};
      const urlKeys = Object.keys(URL_TO_PORTAL) as PortalUrlKey[];

      for (const urlKey of urlKeys) {
        const url = mapping[urlKey];
        if (url && url.trim()) {
          const portal = URL_TO_PORTAL[urlKey];
          const status = await checkUrl(url.trim());
          portalStatus[portal] = status;
        }
      }

      if (Object.keys(portalStatus).length === 0) continue;

      // Check if product_health record exists for this mapping
      const { data: existing } = await supabase
        .from('product_health')
        .select('*')
        .eq('sku_mapping_id', mapping.id)
        .maybeSingle();

      const now = new Date().toISOString();

      if (existing) {
        // Compare old vs new status for change detection
        const oldStatus = existing.portal_status as Record<string, string>;
        const changes: string[] = [];
        for (const [portal, newStatus] of Object.entries(portalStatus)) {
          if (oldStatus[portal] && oldStatus[portal] !== newStatus) {
            changes.push(`${portal}: ${oldStatus[portal]} → ${newStatus}`);
          }
        }

        // Merge: keep existing statuses, override with new checks
        const mergedStatus = { ...oldStatus, ...portalStatus };
        await supabase.from('product_health').update({
          portal_status: mergedStatus,
          last_checked_at: now,
          updated_at: now,
        }).eq('id', existing.id);

        if (changes.length > 0) {
          statusChanges.push({ product: mapping.product_name, changes, vendor_id: mapping.vendor_id });
        }
      } else {
        // Create new record
        await supabase.from('product_health').insert({
          product_name: mapping.product_name,
          portal_status: portalStatus,
          sku_mapping_id: mapping.id,
          vendor_id: mapping.vendor_id,
          last_checked_at: now,
        });
      }

      results.push({ sku: mapping.master_sku_id, product: mapping.product_name, status: portalStatus });
    }

    // Create alerts for status changes
    for (const change of statusChanges) {
      const hasDowngrade = change.changes.some((c: string) => c.includes('→ not_active'));
      if (hasDowngrade) {
        await supabase.from('alerts').insert({
          title: `⚠️ Product status changed: ${change.product}`,
          message: `Health check detected changes:\\n${change.changes.join('\\n')}`,
          severity: 'warning',
          type: 'order_issue',
          vendor_id: change.vendor_id,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checked: results.length,
      statusChanges: statusChanges.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-health-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
