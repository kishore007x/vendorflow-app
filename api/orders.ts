import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!supabase) {
    return Response.json({ error: 'Orders API is not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const portal = url.searchParams.get('portal');
  const status = url.searchParams.get('status');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const search = url.searchParams.get('search');

  let query = supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  if (portal) query = query.eq('portal', portal);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('order_date', from);
  if (to) query = query.lte('order_date', to);
  if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: data || [] });
}