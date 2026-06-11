import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type OrdersCacheEntry = {
  fetchedAt: number;
  data: any[];
};

const ORDERS_CACHE_TTL_MS = 300_000; // 5 minutes
const ORDERS_CACHE_VERSION = 3; // Increment to bust cache after schema/query changes
const ordersCache = new Map<string, OrdersCacheEntry>();
const ordersInFlight = new Map<string, Promise<any[]>>();

function buildOrdersCacheKey(filters?: { portal?: string; status?: string; from?: string; to?: string; search?: string }) {
  return JSON.stringify({ v: ORDERS_CACHE_VERSION, ...(filters || {}) });
}

// Helper to get current user id for vendor_id
async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Supabase PostgREST caps responses at ~1000 rows by default (max_rows project setting).
// This helper paginates through all results using Range headers.
// buildQuery(pageFrom, pageTo) must return a Supabase query that already has .select() applied.
// Fetches pages in parallel batches of 4 for speed.
const PAGE_SIZE = 1000;
const PARALLEL_BATCH = 4;
async function fetchAllPaginated(
  buildQuery: (pageFrom: number, pageTo: number) => any,
): Promise<any[]> {
  // First page to discover total count
  const firstResult = await buildQuery(0, PAGE_SIZE - 1);
  if (firstResult.error) throw firstResult.error;
  const firstRows = firstResult.data || [];
  if (firstRows.length < PAGE_SIZE) return firstRows; // all fits in one page

  const allRows: any[] = [...firstRows];
  let from = PAGE_SIZE;

  // Fetch remaining pages in parallel batches
  while (true) {
    const batch = Array.from({ length: PARALLEL_BATCH }, (_, i) => {
      const pageFrom = from + i * PAGE_SIZE;
      const pageTo = pageFrom + PAGE_SIZE - 1;
      return buildQuery(pageFrom, pageTo);
    });

    const results = await Promise.all(batch);
    let hitEnd = false;

    for (const { data, error } of results) {
      if (error) throw error;
      const rows = data || [];
      allRows.push(...rows);
      if (rows.length < PAGE_SIZE) {
        hitEnd = true;
        break;
      }
    }

    if (hitEnd) break;
    from += PARALLEL_BATCH * PAGE_SIZE;
  }

  return allRows;
}

// ==================== PRODUCTS ====================
export const productsDb = {
  async getAll(search?: string) {
    let query = supabase.from('products').select('*').order('created_at', { ascending: false }).limit(10000);
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return data;

    try {
      const { data: mappings } = await supabase.from('sku_mappings').select('master_sku_id, product_name, brand, mrp');
      const mappingByMasterSku = new Map<string, any>();
      (mappings || []).forEach((m: any) => {
        if (m?.master_sku_id) mappingByMasterSku.set(String(m.master_sku_id).toLowerCase(), m);
      });

      const looksNumeric = (s: any) => typeof s === 'string' && /^\d{4,}$/.test(s.trim());

      return (data || []).map((p: any) => {
        const enriched = { ...p };
        const skuKey = String(p.sku || '').toLowerCase();
        const mapping = skuKey ? mappingByMasterSku.get(skuKey) : null;
        const mappingName = mapping?.product_name;
        const mappingBrand = mapping?.brand;

        if ((!enriched.name || looksNumeric(enriched.name)) && mappingName) {
          enriched.name = mappingName;
        }
        if ((!enriched.brand || enriched.brand === 'GET IT') && mappingBrand) {
          enriched.brand = mappingBrand;
        }
        if ((!enriched.mrp || Number(enriched.mrp) === 0) && mapping?.mrp) {
          enriched.mrp = mapping.mrp;
        }
        return enriched;
      });
    } catch (e) {
      console.debug('productsDb.getAll enrichment failed', e);
      return data;
    }
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(product: TablesInsert<'products'>) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('products').insert({ ...product, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: TablesUpdate<'products'>) {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },
};

// ==================== ORDERS ====================
export const ordersDb = {
  async getAll(filters?: { portal?: string; status?: string; from?: string; to?: string; search?: string }) {
    const cacheKey = buildOrdersCacheKey(filters);
    const cached = ordersCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < ORDERS_CACHE_TTL_MS) {
      return cached.data;
    }

    // Check if we have a superset cache with items (avoids re-fetching)
    const itemsKey = buildOrdersCacheKey({ ...(filters || {}), includeItems: true });
    const itemsCached = ordersCache.get(itemsKey);
    if (itemsCached && Date.now() - itemsCached.fetchedAt < ORDERS_CACHE_TTL_MS) {
      return itemsCached.data.map(({ order_items, ...rest }: any) => rest);
    }

    const inFlight = ordersInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const request = fetchAllPaginated((pageFrom, pageTo) => {
      let q = supabase.from('orders').select('*');
      if (filters?.portal) q = q.eq('portal', filters.portal);
      if (filters?.status) q = q.eq('status', filters.status as any);
      if (filters?.from) q = q.gte('order_date', filters.from);
      if (filters?.to) q = q.lte('order_date', filters.to);
      if (filters?.search) q = q.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      return q.order('created_at', { ascending: false }).range(pageFrom, pageTo);
    }).then((result) => {
      ordersCache.set(cacheKey, { fetchedAt: Date.now(), data: result });
      return result;
    }).finally(() => ordersInFlight.delete(cacheKey));

    ordersInFlight.set(cacheKey, request);
    return request;
  },
  async getAllWithItems(filters?: { portal?: string; status?: string; from?: string; to?: string; search?: string }) {
    // Two fast flat queries in parallel instead of one heavy JOIN per page
    const cacheKey = buildOrdersCacheKey({ ...(filters || {}), includeItems: true });
    const cached = ordersCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < ORDERS_CACHE_TTL_MS) {
      return cached.data;
    }

    const inFlight = ordersInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const request = (async () => {
      const buildOrderQuery = (pageFrom: number, pageTo: number) => {
        let q = supabase.from('orders').select('*');
        if (filters?.portal) q = q.eq('portal', filters.portal);
        if (filters?.status) q = q.eq('status', filters.status as any);
        if (filters?.from) q = q.gte('order_date', filters.from);
        if (filters?.to) q = q.lte('order_date', filters.to);
        if (filters?.search) q = q.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
        return q.order('created_at', { ascending: false }).range(pageFrom, pageTo);
      };

      // Fetch orders + items in parallel — both are flat, no JOINs
      const [orders, orderItems] = await Promise.all([
        fetchAllPaginated(buildOrderQuery),
        fetchAllPaginated((pageFrom, pageTo) =>
          supabase.from('order_items').select('*').range(pageFrom, pageTo)
        ),
      ]);

      // Index items by order_id and attach to orders
      const itemsByOrder = new Map<string, any[]>();
      for (const item of orderItems) {
        const oid = item.order_id;
        if (!oid) continue;
        if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
        itemsByOrder.get(oid)!.push(item);
      }

      return orders.map((o: any) => ({
        ...o,
        order_items: itemsByOrder.get(o.id) || [],
      }));
    })().then((result) => {
      ordersCache.set(cacheKey, { fetchedAt: Date.now(), data: result });
      return result;
    }).finally(() => ordersInFlight.delete(cacheKey));

    ordersInFlight.set(cacheKey, request);
    return request;
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(order: TablesInsert<'orders'>) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('orders').insert({ ...order, vendor_id: userId, created_by: userId }).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Duplicate order number. This order already exists.');
      throw error;
    }
    return data;
  },
  async updateStatus(id: string, status: string) {
    const updates: TablesUpdate<'orders'> = { status: status as any };
    if (status === 'shipped') updates.shipped_date = new Date().toISOString();
    if (status === 'delivered') updates.delivered_date = new Date().toISOString();
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: TablesUpdate<'orders'>) {
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== ORDER ITEMS ====================
export const orderItemsDb = {
  async getByOrderId(orderId: string) {
    const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (error) throw error;
    return data;
  },
  async create(item: TablesInsert<'order_items'>) {
    const { data, error } = await supabase.from('order_items').insert(item).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== RETURNS ====================
export const returnsDb = {
  async getAll(filters?: { portal?: string; status?: string; from?: string; to?: string }) {
    let query = supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(10000);
    if (filters?.portal) query = query.eq('portal', filters.portal);
    if (filters?.status) query = query.eq('status', filters.status as any);
    if (filters?.from) query = query.gte('requested_at', filters.from);
    if (filters?.to) query = query.lte('requested_at', filters.to);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async create(returnData: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('returns').insert({
      ...returnData,
      order_number: returnData.order_number || returnData.return_number || `RET-${Date.now()}`,
      customer_name: returnData.customer_name || 'Unknown',
      portal: returnData.portal || 'firstcry',
      status: returnData.status || 'requested',
      requested_at: returnData.requested_at || new Date().toISOString(),
      vendor_id: userId,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async updateStatus(id: string, status: string) {
    const updates: any = { status: status as any };
    if (['closed', 'refund_initiated'].includes(status)) updates.resolved_at = new Date().toISOString();
    const { data, error } = await supabase.from('returns').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== INVOICES ====================
export const invoicesDb = {
  async getAll(type?: string) {
    let query = supabase.from('invoices').select('*').order('invoice_date', { ascending: false });
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async create(invoice: TablesInsert<'invoices'>) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('invoices').insert({ ...invoice, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async finalize(id: string) {
    const { data, error } = await supabase.from('invoices').update({ status: 'finalized', finalized: true } as any).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async getItems(invoiceId: string) {
    const { data, error } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
    if (error) throw error;
    return data;
  },
  async addItem(item: TablesInsert<'invoice_items'>) {
    const { data, error } = await supabase.from('invoice_items').insert(item).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== DEBIT NOTES ====================
export const debitNotesDb = {
  async getAll() {
    const { data, error } = await supabase.from('debit_notes').select('*').order('note_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(note: TablesInsert<'debit_notes'>) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('debit_notes').insert({ ...note, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== CREDIT NOTES ====================
export const creditNotesDb = {
  async getAll() {
    const { data, error } = await supabase.from('credit_notes').select('*').order('note_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(note: TablesInsert<'credit_notes'>) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('credit_notes').insert({ ...note, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== SETTLEMENTS ====================
export const settlementsDb = {
  async getAll(filters?: { portal?: string; status?: string; from?: string; to?: string }) {
    let query = supabase.from('settlements').select('*').order('created_at', { ascending: false }).limit(10000);
    if (filters?.portal) query = query.eq('portal', filters.portal);
    if (filters?.status) query = query.eq('status', filters.status as any);
    if (filters?.from) query = query.gte('settlement_date', filters.from);
    if (filters?.to) query = query.lte('settlement_date', filters.to);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};

// ==================== RECONCILIATION ====================
export const reconciliationDb = {
  async getAll(filters?: { portal?: string; from?: string; to?: string }) {
    let query = supabase.from('reconciliation_logs').select('*').order('date', { ascending: false });
    if (filters?.portal) query = query.eq('portal', filters.portal);
    if (filters?.from) query = query.gte('date', filters.from);
    if (filters?.to) query = query.lte('date', filters.to);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};

// ==================== LEADS ====================
export const leadsDb = {
  async getAll(filters?: { status?: string; source?: string; search?: string }) {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status as any);
    if (filters?.source) query = query.eq('source', filters.source);
    if (filters?.search) query = query.or(`company_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async create(lead: TablesInsert<'leads'>) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('leads').insert({ ...lead, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: TablesUpdate<'leads'>) {
    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== ONBOARDING ====================
export const onboardingDb = {
  async getAll(filters?: { status?: string }) {
    let query = supabase.from('onboarding_requests').select('*').order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status as any);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async create(request: TablesInsert<'onboarding_requests'>) {
    const { data, error } = await supabase.from('onboarding_requests').insert(request).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: TablesUpdate<'onboarding_requests'>) {
    const { data, error } = await supabase.from('onboarding_requests').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== ACTIVITY LOGS ====================
export const activityLogsDb = {
  async getAll(filters?: { module?: string; limit?: number }) {
    let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
    if (filters?.module) query = query.eq('module', filters.module);
    if (filters?.limit) query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async log(entry: TablesInsert<'activity_logs'>) {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from('activity_logs').insert({ ...entry, user_id: userId, vendor_id: userId });
    if (error) console.error('Failed to log activity:', error);
  },
};

// ==================== BROADCASTS ====================
export const broadcastsDb = {
  async getAll(limit = 50) {
    const { data, error } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
};

// ==================== API LOGS ====================
export const apiLogsDb = {
  async getAll(limit = 50) {
    const { data, error } = await supabase.from('api_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
};

// ==================== REVIEWS / FEEDBACK / KEYWORDS ====================
export const reviewsDb = {
  async getAll(limit = 50) {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
};

export const feedbackDb = {
  async getAll(limit = 50) {
    const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
};

export const keywordsDb = {
  async getAll(limit = 100) {
    const { data, error } = await supabase.from('keywords').select('*').order('count', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
};

// ==================== FILE STORAGE ====================
export const storageService = {
  async upload(bucket: string, path: string, file: File) {
    const userId = await getCurrentUserId();
    const vendorPath = userId ? `${userId}/${path}` : path;
    const { data, error } = await supabase.storage.from(bucket).upload(vendorPath, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  },
  async delete(bucket: string, paths: string[]) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  },
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

// ==================== EXPENSES ====================
export const expensesDb = {
  async getAll(filters?: { category?: string; search?: string }) {
    let query = supabase.from('expenses' as any).select('*').order('expense_date', { ascending: false });
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.search) query = query.or(`description.ilike.%${filters.search}%,paid_by.ilike.%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(expense: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('expenses' as any).insert({ ...expense, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('expenses' as any).delete().eq('id', id);
    if (error) throw error;
  },
};

// ==================== EMPLOYEES ====================
export const employeesDb = {
  async getAll(search?: string) {
    let query = supabase.from('employees' as any).select('*').order('created_at', { ascending: false });
    if (search) query = query.ilike('name', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(employee: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('employees' as any).insert({ ...employee, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('employees' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== ATTENDANCE ====================
export const attendanceDb = {
  async getAll(filters?: { date?: string; employee_id?: string }) {
    let query = supabase.from('attendance' as any).select('*').order('attendance_date', { ascending: false });
    if (filters?.date) query = query.eq('attendance_date', filters.date);
    if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(record: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('attendance' as any).insert({ ...record, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== TAILOR WORK ====================
export const tailorWorkDb = {
  async getAll() {
    const { data, error } = await supabase.from('tailor_work' as any).select('*').order('work_date', { ascending: false });
    if (error) throw error;
    return data as any[];
  },
  async create(work: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('tailor_work' as any).insert({ ...work, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
};
// ==================== LEAVE REQUESTS ====================
export const leaveRequestsDb = {
  async getAll(filters?: { employee_id?: string; status?: string }) {
    let query = supabase.from('leave_requests' as any).select('*').order('created_at', { ascending: false });
    if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(record: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('leave_requests' as any).insert({ ...record, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('leave_requests' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== TASKS ====================
export const tasksDb = {
  async getAll(filters?: { status?: string; priority?: string; assigned_to?: string }) {
    let query = supabase.from('tasks' as any).select('*').order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(task: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('tasks' as any).insert({ ...task, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('tasks' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('tasks' as any).delete().eq('id', id);
    if (error) throw error;
  },
};

// ==================== WAREHOUSES ====================
export const warehousesDb = {
  async getAll() {
    const { data, error } = await supabase.from('warehouses' as any).select('*').order('name');
    if (error) throw error;
    return data as any[];
  },
  async create(warehouse: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('warehouses' as any).insert({ ...warehouse, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('warehouses' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== VENDORS ====================
export const vendorsDb = {
  async getAll() {
    const { data, error } = await supabase.from('vendors' as any).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },
  async create(vendor: any) {
    const { data, error } = await supabase.from('vendors' as any).insert(vendor).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('vendors' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== CUSTOMERS ====================
export const customersDb = {
  async getAll(filters?: { search?: string }) {
    let query = supabase.from('customers' as any).select('*').order('created_at', { ascending: false });
    if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,pincode.ilike.%${filters.search}%,state.ilike.%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(customer: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('customers' as any).insert({ ...customer, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('customers' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== INVENTORY ====================
export const inventoryDb = {
  async getAll(filters?: { portal?: string; warehouse?: string; search?: string }) {
    let query = supabase.from('inventory' as any).select('*').order('updated_at', { ascending: false }).limit(10000);
    if (filters?.portal) query = query.eq('portal', filters.portal);
    if (filters?.warehouse) query = query.eq('warehouse', filters.warehouse);
    if (filters?.search) query = query.or(`sku.ilike.%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(item: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('inventory' as any).insert({
      sku_id: item.sku_id || item.sku || item.skuId || item.vendor_style_code,
      product_name: item.product_name || item.name || item.sku || item.skuId || 'Unknown product',
      brand: item.brand || null,
      portal: item.portal || 'firstcry',
      available_quantity: item.available_quantity ?? item.quantity_available ?? item.availableQuantity ?? 0,
      master_quantity: item.master_quantity ?? item.quantity_available ?? item.availableQuantity ?? 0,
      reserved_quantity: item.reserved_quantity ?? item.quantity_reserved ?? item.reservedQuantity ?? 0,
      low_stock_threshold: item.low_stock_threshold ?? 10,
      warehouse: item.warehouse || item.warehouse_location || null,
      channel_allocations: item.channel_allocations || {},
      aging_days: item.aging_days ?? 0,
      vendor_id: userId,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('inventory' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== SKU MAPPINGS ====================
export const skuMappingsDb = {
  async getAll(search?: string) {
    let query = supabase.from('sku_mappings' as any).select('*').order('created_at', { ascending: false }).limit(10000);
    if (search) query = query.or(`master_sku_id.ilike.%${search}%,product_name.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(mapping: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('sku_mappings' as any).insert({ ...mapping, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('sku_mappings' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('sku_mappings' as any).delete().eq('id', id);
    if (error) throw error;
  },
};

// ==================== ALERTS ====================
export const alertsDb = {
  async getAll(filters?: { severity?: string; type?: string; unread?: boolean }) {
    let query = supabase.from('alerts' as any).select('*').order('created_at', { ascending: false });
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.unread) query = query.eq('read', false);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async markAsRead(id: string) {
    const { error } = await supabase.from('alerts' as any).update({ read: true }).eq('id', id);
    if (error) throw error;
  },
  async markAllAsRead() {
    const { error } = await supabase.from('alerts' as any).update({ read: true }).eq('read', false);
    if (error) throw error;
  },
  async create(alert: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('alerts' as any).insert({ ...alert, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== VIDEOS ====================
export const videosDb = {
  async getAll(filters?: { status?: string; search?: string }) {
    let query = supabase.from('videos' as any).select('*').order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('video_status', filters.status);
    if (filters?.search) query = query.or(`order_id.ilike.%${filters.search}%,file_name.ilike.%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(video: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('videos' as any).insert({ ...video, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('videos' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== REPORTS ====================
export const reportsDb = {
  async getAll() {
    const { data, error } = await supabase.from('reports' as any).select('*').order('generated_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },
  async create(report: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('reports' as any).insert({ ...report, vendor_id: userId, created_by: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('reports' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== MARKETING CONFIG ====================
export const marketingConfigDb = {
  async getAll() {
    const { data, error } = await supabase.from('marketing_config' as any).select('*').order('channel');
    if (error) throw error;
    return data as any[];
  },
  async upsert(channel: string, config: any, enabled: boolean) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('marketing_config' as any).upsert({
      vendor_id: userId, channel, config, enabled
    }, { onConflict: 'vendor_id,channel' }).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== SOCIAL MESSAGES ====================
export const socialMessagesDb = {
  async getAll(filters?: { channel?: string; category?: string; search?: string }) {
    let query = supabase.from('social_messages' as any).select('*').order('created_at', { ascending: false });
    if (filters?.channel && filters.channel !== 'all') query = query.eq('channel', filters.channel);
    if (filters?.category && filters.category !== 'all') query = query.eq('category', filters.category);
    if (filters?.search) query = query.or(`sender.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,preview.ilike.%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(message: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('social_messages' as any).insert({ ...message, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('social_messages' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== PRODUCT HEALTH ====================
export const productHealthDb = {
  async getAll(filters?: { search?: string }) {
    let query = supabase.from('product_health' as any).select('*').order('product_name');
    if (filters?.search) query = query.ilike('product_name', `%${filters.search}%`);
    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      const { data: products } = await supabase.from('products').select('id, name, sku, portals_enabled');
      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      const productBySku = new Map((products || []).map((p: any) => [String(p.sku || '').toLowerCase(), p]));

      const { data: mappings } = await supabase.from('sku_mappings').select('*');
      const mappingById = new Map((mappings || []).map((m: any) => [m.id, m]));
      const mappingByMasterSku = new Map(
        (mappings || []).map((m: any) => [String(m.master_sku_id || '').toLowerCase(), m])
      );

      const urlToPortal: Record<string, string> = {
        amazon_url: 'amazon', flipkart_url: 'flipkart', meesho_url: 'meesho',
        firstcry_url: 'firstcry', blinkit_url: 'blinkit', own_website_url: 'own_website',
      };
      const urlKeys = Object.keys(urlToPortal);

      return data.map((record: any) => {
        const enriched = { ...record };
        const productId = record.product_id;

        const looksNumeric = (s: any) => typeof s === 'string' && /^\d{4,}$/.test(s.trim());

        const resolveFromProduct = (product: any) => {
          if (!product) return null;
          if (product.name && !looksNumeric(product.name)) return product.name;
          const skuKey = String(product.sku || '').toLowerCase();
          const mapping = skuKey ? mappingByMasterSku.get(skuKey) : null;
          return mapping?.product_name || null;
        };

        if (productId && productMap.has(productId)) {
          const product = productMap.get(productId);
          const resolved = resolveFromProduct(product);
          if (resolved && (looksNumeric(enriched.product_name) || enriched.product_name === productId)) {
            enriched.product_name = resolved;
          }
        } else {
          const skuKey = String(record.sku || record.master_sku || '').toLowerCase();
          if (skuKey) {
            const mapping = mappingByMasterSku.get(skuKey);
            if (mapping?.product_name && (looksNumeric(enriched.product_name) || !enriched.product_name)) {
              enriched.product_name = mapping.product_name;
            }
            const product = productBySku.get(skuKey);
            if (product) {
              const resolved = resolveFromProduct(product);
              if (resolved && (looksNumeric(enriched.product_name) || !enriched.product_name)) {
                enriched.product_name = resolved;
              }
            }
          }
        }

        if (!enriched.portal_status || Object.keys(enriched.portal_status).length === 0) {
          const portalStatus: Record<string, string> = {};
          const mappingId = record.sku_mapping_id;
          const mapping = mappingById.get(mappingId);
          if (mapping) {
            for (const urlKey of urlKeys) {
              if (mapping[urlKey]) {
                portalStatus[urlToPortal[urlKey]] = 'live';
              }
            }
          }
          if (Object.keys(portalStatus).length === 0 && productId && productMap.has(productId)) {
            const product = productMap.get(productId);
            if (product.portals_enabled && Array.isArray(product.portals_enabled)) {
              for (const portal of product.portals_enabled) {
                portalStatus[portal] = 'live';
              }
            }
          }
          enriched.portal_status = portalStatus;
        }

        return enriched;
      });
    }

    return data as any[];
  },
  async create(record: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('product_health' as any).insert({ ...record, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('product_health' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== CHAT CONVERSATIONS ====================
export const chatConversationsDb = {
  async getAll() {
    const { data, error } = await supabase.from('chat_conversations' as any).select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },
  async create(title: string, messages: any[]) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('chat_conversations' as any).insert({ title, messages, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('chat_conversations' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('chat_conversations' as any).delete().eq('id', id);
    if (error) throw error;
  },
};

// ==================== AUTOMATION SETTINGS ====================
export const automationSettingsDb = {
  async getAll() {
    const { data, error } = await supabase.from('automation_settings' as any).select('*');
    if (error) throw error;
    return data as any[];
  },
  async upsert(featureId: string, enabled: boolean) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('automation_settings' as any).upsert({
      feature_id: featureId, enabled, vendor_id: userId
    }, { onConflict: 'feature_id,vendor_id' }).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== DROPDOWN OPTIONS ====================
export const dropdownOptionsDb = {
  async getByFieldType(fieldType: string) {
    const { data, error } = await supabase
      .from('dropdown_options' as any)
      .select('*')
      .eq('field_type', fieldType)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as any[];
  },
  async getAll() {
    const { data, error } = await supabase
      .from('dropdown_options' as any)
      .select('*')
      .order('field_type')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as any[];
  },
  async create(option: { field_type: string; label: string; value: string; is_default?: boolean; sort_order?: number }) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('dropdown_options' as any)
      .insert({ ...option, vendor_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: { label?: string; value?: string; sort_order?: number }) {
    const { data, error } = await supabase
      .from('dropdown_options' as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('dropdown_options' as any).delete().eq('id', id);
    if (error) throw error;
  },
};

// ==================== PURCHASE ORDERS ====================
export const purchaseOrdersDb = {
  async getAll(search?: string) {
    let query = supabase.from('purchase_orders' as any).select('*').order('created_at', { ascending: false });
    if (search) query = query.or(`po_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(record: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('purchase_orders' as any).insert({ ...record, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('purchase_orders' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== PURCHASE INVOICES ====================
export const purchaseInvoicesDb = {
  async getAll(search?: string) {
    let query = supabase.from('purchase_invoices' as any).select('*').order('created_at', { ascending: false });
    if (search) query = query.or(`bill_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(record: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('purchase_invoices' as any).insert({ ...record, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('purchase_invoices' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ==================== INWARD STOCK ====================
export const inwardStockDb = {
  async getAll(search?: string) {
    let query = supabase.from('inward_stock' as any).select('*').order('created_at', { ascending: false });
    if (search) query = query.or(`grn_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  },
  async create(record: any) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('inward_stock' as any).insert({ ...record, vendor_id: userId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('inward_stock' as any).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};
