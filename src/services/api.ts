// Centralized API service structure
// This file contains mock endpoints that are ready for real backend integration

import { 
  Product, 
  InventoryItem, 
  Order, 
  ReturnOrder, 
  Settlement, 
  Vendor, 
  Warehouse,
  Alert,
  Task,
  KPIData,
  SalesData,
  Portal,
  ApiResponse 
} from '@/types';
// mockData removed — use DB wrappers instead
import {
  inventoryDb,
  ordersDb,
  returnsDb,
  settlementsDb,
  alertsDb,
  invoicesDb,
  productsDb,
} from './database';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_DELAY = 300;

// Base API configuration - ready for real backend
const API_BASE_URL = '/api/v1';

// Generic fetch wrapper for future backend integration
async function fetchApi<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<ApiResponse<T>> {
  // In production, this would be a real fetch call
  // return fetch(`${API_BASE_URL}${endpoint}`, options).then(res => res.json());
  
  // For now, we simulate with mock data
  await delay(API_DELAY);
  
  // This is where the mock data mapping happens
  // Each endpoint returns appropriate mock data
  throw new Error(`Endpoint ${endpoint} not implemented in mock mode`);
}

// Dashboard API
export const dashboardApi = {
  getKPIs: async (portal?: Portal): Promise<ApiResponse<KPIData>> => {
    try {
      const orders = await ordersDb.getAll({ portal: portal as any });
      const returns = await returnsDb.getAll({ portal: portal as any });
      const invoices = await invoicesDb.getAll();
      const totalOrders = (orders || []).length;
      const totalReturns = (returns || []).length;
      const totalRevenue = (orders || []).reduce((s: number, o: any) => s + (o.total || o.amount || o.grand_total || 0), 0);
      const kpi: KPIData = {
        totalOrders,
        totalRevenue,
        totalReturns,
        invoices: (invoices || []).length,
      } as any;
      return { data: kpi, success: true };
    } catch (err) {
      return { data: {} as any, success: false, message: String(err) };
    }
  },
  
  getSalesData: async (
    startDate: string, 
    endDate: string, 
    portal?: Portal
  ): Promise<ApiResponse<SalesData[]>> => {
    try {
      const orders = await ordersDb.getAll({ portal: portal as any, from: startDate, to: endDate });
      // aggregate by date
      const map: Record<string, number> = {};
      (orders || []).forEach((o: any) => {
        const d = new Date(o.order_date || o.created_at || o.order_date_time || o.date).toISOString().slice(0,10);
        map[d] = (map[d] || 0) + (o.total || o.amount || o.grand_total || 0);
      });
      const arr: SalesData[] = Object.keys(map).sort().map(d => ({ date: d, revenue: map[d] } as any));
      return { data: arr, success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
};

// Products API
export const productsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<ApiResponse<Product[]>> => {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const data = await productsDb.getAll(params?.search || undefined);
      const start = (page - 1) * limit;
      const paginatedData = (data || []).slice(start, start + limit);
      return {
        data: paginatedData as Product[],
        success: true,
        pagination: { page, limit, total: (data || []).length, totalPages: Math.ceil(((data || []).length) / limit) },
      };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  getById: async (productId: string): Promise<ApiResponse<Product | null>> => {
    try {
      const product = await productsDb.getById(productId);
      return { data: product || null, success: !!product, message: product ? undefined : 'Product not found' };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
  
  create: async (product: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> => {
    try {
      const created = await productsDb.create(product as any);
      return { data: created as Product, success: true };
    } catch (err) {
      return { data: null as any, success: false, message: String(err) };
    }
  },
  
  update: async (productId: string, updates: Partial<Product>): Promise<ApiResponse<Product | null>> => {
    try {
      const updated = await productsDb.update(productId, updates as any);
      return { data: updated as Product, success: true };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
};

// Inventory API
export const inventoryApi = {
  getAll: async (params?: {
    portal?: Portal;
    warehouse?: string;
    lowStock?: boolean;
  }): Promise<ApiResponse<InventoryItem[]>> => {
    try {
      const data = await inventoryDb.getAll({ portal: params?.portal, warehouse: params?.warehouse, lowStock: params?.lowStock });
      return { data: data as InventoryItem[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  getAgingReport: async (): Promise<ApiResponse<InventoryItem[]>> => {
    try {
      const all = await inventoryDb.getAll();
      const agingItems = (all || []).filter((i: any) => (i.agingDays || 0) > 60);
      return { data: agingItems as InventoryItem[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  updateStock: async (
    skuId: string, 
    quantity: number, 
    type: 'add' | 'remove'
  ): Promise<ApiResponse<InventoryItem | null>> => {
    try {
      const items = await inventoryDb.getAll({ search: skuId });
      const item = (items || []).find((i: any) => i.sku_id === skuId || i.sku === skuId || i.skuId === skuId);
      if (!item) return { data: null, success: false, message: 'SKU not found' };
      const newQty = (item.available_quantity ?? item.availableQuantity ?? 0) + (type === 'add' ? quantity : -quantity);
      const updated = await inventoryDb.update(item.id, { available_quantity: Math.max(0, newQty) });
      return { data: updated as InventoryItem, success: true };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
};

// Orders API
export const ordersApi = {
  getAll: async (params?: {
    portal?: Portal;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Order[]>> => {
    try {
      const data = await ordersDb.getAll({ portal: params?.portal, status: params?.status, from: params?.startDate, to: params?.endDate, search: undefined });
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const start = (page - 1) * limit;
      const paginatedData = (data || []).slice(start, start + limit);
      return {
        data: paginatedData as Order[],
        success: true,
        pagination: {
          page,
          limit,
          total: (data || []).length,
          totalPages: Math.ceil(((data || []).length) / limit),
        },
      };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  getById: async (orderId: string): Promise<ApiResponse<Order | null>> => {
    try {
      const order = await ordersDb.getById(orderId);
      return { data: order as Order | null, success: !!order, message: order ? undefined : 'Order not found' };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
  
  updateStatus: async (
    orderId: string, 
    status: string, 
    note?: string
  ): Promise<ApiResponse<Order | null>> => {
    try {
      const updated = await ordersDb.updateStatus(orderId, status);
      return { data: updated as Order, success: true };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
  
  exportOrders: async (params?: { portal?: Portal; status?: string }): Promise<ApiResponse<string>> => {
    // production: generate CSV and return URL; here return placeholder
    return { data: 'export-url-placeholder', success: true };
  },
};

// Returns API
export const returnsApi = {
  getAll: async (params?: {
    portal?: Portal;
    status?: string;
  }): Promise<ApiResponse<ReturnOrder[]>> => {
    try {
      const data = await returnsDb.getAll({ portal: params?.portal, status: params?.status });
      return { data: data as ReturnOrder[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  getById: async (returnId: string): Promise<ApiResponse<ReturnOrder | null>> => {
    try {
      const all = await returnsDb.getAll();
      const ret = (all || []).find((r: any) => r.id === returnId || r.return_id === returnId || r.returnId === returnId);
      return { data: ret as ReturnOrder | null, success: !!ret };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
};

// Settlements API
export const settlementsApi = {
  getAll: async (params?: {
    portal?: Portal;
    status?: string;
  }): Promise<ApiResponse<Settlement[]>> => {
    try {
      const data = await settlementsDb.getAll({ portal: params?.portal, status: params?.status });
      return { data: data as Settlement[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  getById: async (settlementId: string): Promise<ApiResponse<Settlement | null>> => {
    try {
      const data = await settlementsDb.getAll();
      const settlement = (data || []).find((s: any) => s.settlement_id === settlementId || s.settlementId === settlementId);
      return { data: settlement || null, success: !!settlement };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
};

// Vendors API
export const vendorsApi = {
  getAll: async (): Promise<ApiResponse<Vendor[]>> => {
    try {
      const data = await (await import('./database')).vendorsDb.getAll();
      return { data: data as Vendor[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  getById: async (vendorId: string): Promise<ApiResponse<Vendor | null>> => {
    try {
      const db = await import('./database');
      const v = await db.vendorsDb.getById(vendorId);
      return { data: v || null, success: !!v };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
  
  getWarehouses: async (vendorId: string): Promise<ApiResponse<Warehouse[]>> => {
    try {
      const db = await import('./database');
      const warehouses = await db.warehousesDb.getAllForVendor ? await db.warehousesDb.getAllForVendor(vendorId) : await db.warehousesDb.getAll();
      // if getAllForVendor not available, filter locally
      const list = (warehouses || []).filter((w: any) => !w.vendor_id || w.vendor_id === vendorId || w.vendorId === vendorId);
      return { data: list as Warehouse[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
};

// Warehouses API
export const warehousesApi = {
  getAll: async (): Promise<ApiResponse<Warehouse[]>> => {
    await delay(API_DELAY);
    return { data: mockWarehouses, success: true };
  },
};

// Alerts API
export const alertsApi = {
  getAll: async (params?: {
    severity?: string;
    type?: string;
    unreadOnly?: boolean;
  }): Promise<ApiResponse<Alert[]>> => {
    try {
      const data = await alertsDb.getAll({ severity: params?.severity, type: params?.type, unread: params?.unreadOnly });
      return { data: data as Alert[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  markAsRead: async (alertId: string): Promise<ApiResponse<boolean>> => {
    try {
      await alertsDb.markAsRead(alertId);
      return { data: true, success: true };
    } catch (err) {
      return { data: false, success: false, message: String(err) };
    }
  },
  
  markAllAsRead: async (): Promise<ApiResponse<boolean>> => {
    try {
      await alertsDb.markAllAsRead();
      return { data: true, success: true };
    } catch (err) {
      return { data: false, success: false, message: String(err) };
    }
  },
};

// Tasks API
export const tasksApi = {
  getAll: async (params?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<ApiResponse<Task[]>> => {
    try {
      const db = await import('./database');
      let data = await db.tasksDb.getAll();
      if (params?.status) data = (data || []).filter((t: any) => t.status === params.status);
      if (params?.priority) data = (data || []).filter((t: any) => t.priority === params.priority);
      return { data: data as Task[], success: true };
    } catch (err) {
      return { data: [], success: false, message: String(err) };
    }
  },
  
  updateStatus: async (taskId: string, status: string): Promise<ApiResponse<Task | null>> => {
    try {
      const db = await import('./database');
      const updated = await db.tasksDb.updateStatus(taskId, status).catch(() => null);
      return { data: updated as Task, success: !!updated };
    } catch (err) {
      return { data: null, success: false, message: String(err) };
    }
  },
};
