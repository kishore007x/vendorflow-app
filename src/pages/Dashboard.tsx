import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAIAccess } from '@/contexts/AIAccessContext';
import { Portal } from '@/types';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { ordersDb, productsDb, inventoryDb, returnsDb, settlementsDb, expensesDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import { KPICard } from '@/components/dashboard/KPICard';
import { InventoryChart, PortalSalesChart, CHART_COLORS } from '@/components/dashboard/Charts';
import { FinancialOverview } from '@/components/dashboard/FinancialOverview';
import { DashboardCustomizer } from '@/components/DashboardCustomizer';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';

import { GlobalDateFilter, DateRange } from '@/components/GlobalDateFilter';
import { EmptyState } from '@/components/EmptyState';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, ShoppingCart, Package, AlertTriangle, RotateCcw, CreditCard,
  TrendingUp, TrendingDown, Star, Users, UserPlus, UserCheck, Percent,
  Plus, ShieldCheck, ShieldAlert, Hash, UserX, CheckCircle2, BarChart3,
  ArrowUpRight, ArrowDownRight, Clock, ShieldX, PackageCheck, PackageX,
  CalendarClock, Truck, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';

function deriveLineItemRevenue(item: any, priceLookup: Map<string, number>) {
  const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
  const directAmount = Number(item.total ?? item.total_price ?? item.line_total ?? 0) || 0;
  if (directAmount > 0) return directAmount;

  const directUnitPrice = Number(item.unit_price ?? item.price ?? item.selling_price ?? 0) || 0;
  if (directUnitPrice > 0) return directUnitPrice * quantity;

  const lookupKeys = [item.product_id, item.sku, item.productName, item.product_name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  for (const key of lookupKeys) {
    const matchedPrice = priceLookup.get(key);
    if (matchedPrice && matchedPrice > 0) return matchedPrice * quantity;
  }

  return 0;
}

function deriveOrderRevenue(order: any, priceLookup: Map<string, number>) {
  const items = order.items || order.order_items || order.orderItems || [];
  const itemRevenue = items.reduce((sum: number, item: any) => sum + deriveLineItemRevenue(item, priceLookup), 0);
  const directRevenue = Number(order.totalAmount ?? order.total_amount ?? order.total ?? order.amount ?? 0) || 0;
  return directRevenue > 0 ? directRevenue : itemRevenue;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { criticalDecisionToggle } = useAIAccess();
  const [selectedPortal, setSelectedPortal] = useState<Portal | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [salesViewMode, setSalesViewMode] = useState<'revenue' | 'units'>('revenue');
  const [sortMode, setSortMode] = useState<'revenue' | 'units' | 'returns'>('revenue');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { widgets, toggleWidget, moveWidget, isVisible, resetWidgets } = useDashboardWidgets();

  const [orders, setOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const userId = user?.id ?? null;

  const latestOrderDate = useMemo(() => {
    const latest = orders.reduce((currentLatest, order) => {
      const candidate = new Date(order.orderDate);
      if (isNaN(candidate.getTime())) return currentLatest;
      return candidate > currentLatest ? candidate : currentLatest;
    }, new Date(0));

    return latest.getTime() > 0 ? latest : new Date();
  }, [orders]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      setOrders([]);
      setReturns([]);
      setSalesData([]);
      setInventoryItems([]);
      setSettlements([]);
      setExpenses([]);
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const [ordersData, productsData, returnsData, inventoryData, settlementsData, expensesData, invoicesData] = await Promise.all([
          ordersDb.getAllWithItems(),
          productsDb.getAll().catch(() => []),
          returnsDb.getAll(),
          inventoryDb.getAll(),
          settlementsDb.getAll(),
          expensesDb.getAll(),
          supabase.from('invoices').select('*').then(r => r.data || []),
        ]);
        const normalizedOrders = ordersData.map((o: any) => {
          const items = o.order_items || o.orderItems || [];
          const totalAmount = Number(o.total_amount ?? o.totalAmount ?? o.total ?? o.amount ?? 0) || 0;

          return {
            ...o,
            orderId: o.order_number || o.id,
            orderDate: o.order_date || o.created_at,
            totalAmount,
            customerName: o.customer_name,
            customerId: o.id,
            customerEmail: o.customer_email,
            customerPhone: o.customer_phone,
            customerPinCode: o.customer_pincode,
            customerCity: o.customer_city,
            customerState: o.customer_state,
            shippingAddress: o.customer_address,
            deliveryDate: o.delivered_date,
            portalOrderId: o.order_number,
            items,
          };
        });

        const productPriceLookup = new Map<string, number>();
        (productsData || []).forEach((product: any) => {
          const price = Number(product.base_price ?? product.price ?? product.selling_price ?? product.portal_price ?? 0) || 0;
          if (price <= 0) return;
          [product.id, product.sku, product.name, product.product_name].filter(Boolean).forEach((key) => {
            productPriceLookup.set(String(key).toLowerCase(), price);
          });
        });

        const revenueNormalizedOrders = normalizedOrders.map((order: any) => ({
          ...order,
          totalAmount: deriveOrderRevenue(order, productPriceLookup),
        }));

        // If some orders still have zero totalAmount, try to fetch order_items rows
        // from the DB for those orders and compute a fallback total from actual items.
        const zeroOrders = revenueNormalizedOrders.filter((o: any) => !o.totalAmount || Number(o.totalAmount) === 0);
        if (zeroOrders.length > 0) {
          try {
            const zeroIds = zeroOrders.map((o: any) => o.id).filter(Boolean);
            if (zeroIds.length > 0) {
              const { data: rawItems, error: itemsErr } = await supabase.from('order_items')
                .select('order_id,product_id,product_name,sku,quantity,unit_price,total')
                .in('order_id', zeroIds);
              if (!itemsErr && rawItems && rawItems.length > 0) {
                const itemsByOrder = new Map<string, any[]>();
                rawItems.forEach((it: any) => {
                  const key = it.order_id;
                  if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
                  itemsByOrder.get(key)!.push(it);
                });

                // compute sums and merge into revenueNormalizedOrders
                const merged = revenueNormalizedOrders.map((ord: any) => {
                  if (ord.totalAmount && Number(ord.totalAmount) > 0) return ord;
                  const its = itemsByOrder.get(ord.id) || [];
                  if (its.length === 0) return ord;
                  const sum = its.reduce((s: number, it: any) => {
                    const derived = deriveLineItemRevenue(it, productPriceLookup);
                    // if derive returns 0, fall back to explicit total or unit_price*quantity
                    const explicit = Number(it.total ?? 0) || (Number(it.unit_price ?? 0) * Number(it.quantity ?? 1));
                    return s + (derived > 0 ? derived : explicit);
                  }, 0);
                  return { ...ord, totalAmount: sum };
                });
                if (cancelled) return;
                setOrders(merged);
                setSalesData(merged.map((o: any) => ({ date: o.orderDate, revenue: Number(o.totalAmount || 0), orders: 1, portal: o.portal })));
              } else {
                if (cancelled) return;
                setOrders(revenueNormalizedOrders);
                setSalesData(revenueNormalizedOrders.map((o: any) => ({ date: o.orderDate, revenue: Number(o.totalAmount || 0), orders: 1, portal: o.portal })));
              }
            } else {
              if (cancelled) return;
              setOrders(revenueNormalizedOrders);
              setSalesData(revenueNormalizedOrders.map((o: any) => ({ date: o.orderDate, revenue: Number(o.totalAmount || 0), orders: 1, portal: o.portal })));
            }
          } catch (e) {
            console.error('Error fetching fallback order_items', e);
            if (cancelled) return;
            setOrders(revenueNormalizedOrders);
            setSalesData(revenueNormalizedOrders.map((o: any) => ({ date: o.orderDate, revenue: Number(o.totalAmount || 0), orders: 1, portal: o.portal })));
          }
        } else {
          if (cancelled) return;
          setOrders(revenueNormalizedOrders);
          setSalesData(revenueNormalizedOrders.map((o: any) => ({ date: o.orderDate, revenue: Number(o.totalAmount || 0), orders: 1, portal: o.portal })));
        }
        if (cancelled) return;
        setReturns(returnsData.map((r: any) => ({
          ...r, orderId: r.order_number, requestDate: r.requested_at, items: [],
          claimEligible: false,
        })));
        setInventoryItems(inventoryData.map((i: any) => ({
          ...i, skuId: i.sku_id, productName: i.product_name,
          availableQuantity: i.available_quantity ?? 0,
          lowStockThreshold: i.low_stock_threshold ?? 10,
        })));
        setSettlements(settlementsData.map((s: any) => ({
          ...s, settlementId: s.settlement_id, netAmount: s.net_amount,
          settlementDate: s.settlement_date,
        })));
        setExpenses(expensesData);
        setInvoices(invoicesData);
      } catch (e) { console.error(e); }
      if (!cancelled) setIsLoading(false);
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  // Filtered orders by portal & date
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (selectedPortal !== 'all' && o.portal !== selectedPortal) return false;
      if (dateRange.from && new Date(o.orderDate) < dateRange.from) return false;
      if (dateRange.to && new Date(o.orderDate) > dateRange.to) return false;
      return true;
    });
  }, [orders, selectedPortal, dateRange]);

  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      if (selectedPortal !== 'all' && r.portal !== selectedPortal) return false;
      if (dateRange.from && new Date(r.requestDate) < dateRange.from) return false;
      if (dateRange.to && new Date(r.requestDate) > dateRange.to) return false;
      return true;
    });
  }, [returns, selectedPortal, dateRange]);

  // ─── DAILY SALES SUMMARY ───
  const dailySummary = useMemo(() => {
    // Use latestOrderDate as the source-of-truth for "today" in the dashboard.
    const today = latestOrderDate.toDateString();
    const yesterday = new Date(latestOrderDate.getTime() - 86400000).toDateString();
    const todayOrders = orders.filter(o => new Date(o.orderDate).toDateString() === today && (selectedPortal === 'all' || o.portal === selectedPortal));
    const yesterdayOrders = orders.filter(o => new Date(o.orderDate).toDateString() === yesterday && (selectedPortal === 'all' || o.portal === selectedPortal));
    const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.totalAmount || 0) || 0), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + (Number(o.totalAmount || 0) || 0), 0);
    const revenueGrowth = yesterdayRevenue > 0 ? +((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : 0;
    const orderGrowth = yesterdayOrders.length > 0 ? +((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length * 100).toFixed(1) : 0;

    // If the latest day has orders but zero revenue (likely missing item-level data),
    // fall back to the most recent prior day that has non-zero revenue so the dashboard
    // doesn't misleadingly show ₹0. Also surface a flag so UI can warn users.
    let displayRevenue = todayRevenue;
    let fallbackUsed = false;
    let fallbackDate: string | null = null;
    if (todayOrders.length > 0 && todayRevenue === 0) {
      // find most recent date before latestOrderDate with revenue > 0
      const byDate: Record<string, number> = {};
      orders.forEach(o => {
        const d = new Date(o.orderDate).toDateString();
        if (selectedPortal !== 'all' && o.portal !== selectedPortal) return;
        byDate[d] = (byDate[d] || 0) + (Number(o.totalAmount || 0) || 0);
      });
      const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      for (const d of sortedDates) {
        if (d === today) continue;
        if ((byDate[d] || 0) > 0) {
          displayRevenue = byDate[d];
          fallbackUsed = true;
          fallbackDate = d;
          break;
        }
      }
    }

    return { todayCount: todayOrders.length, todayRevenue: displayRevenue, revenueGrowth, orderGrowth, fallbackUsed, fallbackDate, rawTodayRevenue: todayRevenue };
  }, [orders, selectedPortal, latestOrderDate]);

  // ─── TOP 5 PRODUCTS BY ORDER COUNT ───
  const topProductsByOrders = useMemo(() => {
    const map: Record<string, { name: string; units: number; revenue: number }> = {};
    filteredOrders.forEach(o => o.items.forEach(item => {
      if (!map[item.productName]) map[item.productName] = { name: item.productName, units: 0, revenue: 0 };
      map[item.productName].units += item.quantity;
      map[item.productName].revenue += item.price * item.quantity;
    }));
    return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 5);
  }, [filteredOrders]);

  // ─── TOP 5 BRANDS BY REVENUE ───
  const topBrandsByRevenue = useMemo(() => {
    const map: Record<string, { brand: string; units: number; revenue: number }> = {};
    filteredOrders.forEach(o => o.items.forEach(item => {
      if (!map[item.brand]) map[item.brand] = { brand: item.brand, units: 0, revenue: 0 };
      map[item.brand].units += item.quantity;
      map[item.brand].revenue += item.price * item.quantity;
    }));
    const arr = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const totalRev = arr.reduce((s, b) => s + b.revenue, 0);
    return arr.map(b => ({ ...b, contribution: totalRev > 0 ? +((b.revenue / totalRev) * 100).toFixed(1) : 0 }));
  }, [filteredOrders]);

  // ─── TOP 5 RETURN PRODUCTS ───
  const topReturnProducts = useMemo(() => {
    const map: Record<string, { name: string; returnCount: number; totalSold: number }> = {};
    filteredOrders.forEach(o => o.items.forEach(item => {
      if (!map[item.productName]) map[item.productName] = { name: item.productName, returnCount: 0, totalSold: 0 };
      map[item.productName].totalSold += item.quantity;
    }));
    filteredReturns.forEach(r => {
      r.items.forEach(item => {
        if (!map[item.productName]) map[item.productName] = { name: item.productName, returnCount: 0, totalSold: 0 };
        map[item.productName].returnCount += item.quantity;
      });
    });
    return Object.values(map)
      .filter(p => p.returnCount > 0)
      .map(p => ({ ...p, returnRate: p.totalSold > 0 ? +((p.returnCount / p.totalSold) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.returnCount - a.returnCount)
      .slice(0, 5);
  }, [filteredOrders, filteredReturns]);

  // ─── RETURN CATEGORY COUNTS ───
  const returnCategories = useMemo(() => {
    const total = filteredReturns.length;
    const pending = filteredReturns.filter(r => r.status === 'pending').length;
    const approved = filteredReturns.filter(r => r.status === 'approved' || r.status === 'completed').length;
    const rejected = filteredReturns.filter(r => r.status === 'rejected' || r.status === 'ineligible').length;
    return { total, pending, approved, rejected };
  }, [filteredReturns]);

  // ─── ELIGIBLE FOR CLAIM ───
  const eligibleForClaim = useMemo(() => {
    return filteredReturns.filter(r => r.claimEligible && r.status === 'eligible').length;
  }, [filteredReturns]);

  // ─── UPCOMING RETURN PRODUCTS (within 7-30 day return window) ───
  const upcomingReturns = useMemo(() => {
    const now = Date.now();
    return filteredOrders
      .filter(o => o.status === 'delivered' && o.deliveryDate)
      .map(o => {
        const deliveredMs = new Date(o.deliveryDate!).getTime();
        const daysElapsed = Math.floor((now - deliveredMs) / 86400000);
        const daysRemaining = 30 - daysElapsed;
        return { orderId: o.orderId, product: o.items[0]?.productName || 'N/A', daysRemaining };
      })
      .filter(o => o.daysRemaining >= 0 && o.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }, [filteredOrders]);

  // ─── DELIVERED RETURN PRODUCTS ───
  const deliveredReturns = useMemo(() => {
    return filteredReturns
      .filter(r => r.status === 'completed')
      .slice(0, 5)
      .map(r => ({
        orderId: r.orderId,
        product: r.items[0]?.productName || 'N/A',
        status: r.status,
      }));
  }, [filteredReturns]);

  // ─── SALES CHART ───
  const salesChartData = useMemo(() => {
    const grouped: Record<string, { date: string; revenue: number; orders: number }> = {};
    salesData
      .filter(d => selectedPortal === 'all' || d.portal === selectedPortal)
      .forEach(d => {
        const dateKey = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
        grouped[dateKey].revenue += d.revenue;
        grouped[dateKey].orders += d.orders;
      });
    return Object.values(grouped).slice(-10);
  }, [selectedPortal]);

  const totalUnitsSold = useMemo(() =>
    salesData.filter(d => selectedPortal === 'all' || d.portal === selectedPortal).reduce((s, d) => s + (d.orders || 0), 0),
  [salesData, selectedPortal]);

  const duplicateCustomerCount = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach(o => { m[o.customerEmail || o.customerId] = (m[o.customerEmail || o.customerId] || 0) + 1; });
    return Object.values(m).filter(c => c > 1).length;
  }, [orders]);

  const inventoryStatusData = useMemo(() => {
    const items = selectedPortal === 'all' ? inventoryItems : inventoryItems.filter(i => i.portal === selectedPortal);
    return [
      { name: 'Healthy', value: items.filter(i => i.availableQuantity > i.lowStockThreshold).length, color: CHART_COLORS.success },
      { name: 'Low Stock', value: items.filter(i => i.availableQuantity <= i.lowStockThreshold && i.availableQuantity > 0).length, color: CHART_COLORS.warning },
      { name: 'Out of Stock', value: items.filter(i => i.availableQuantity === 0).length, color: CHART_COLORS.destructive },
    ];
  }, [selectedPortal]);

  const portalRevenueData = useMemo(() =>
    getChannels().map(portal => ({
      portal: portal.name,
      revenue: salesData.filter(d => d.portal === portal.id).reduce((s, d) => s + (d.revenue || 0), 0),
    })).sort((a, b) => b.revenue - a.revenue),
  [salesData]);

  const kpiData = useMemo(() => {
    const defaultKpi = { totalSales: orders.reduce((s, o) => s + (o.totalAmount || 0), 0), ordersToday: orders.filter(o => new Date(o.orderDate).toDateString() === new Date().toDateString()).length, inventoryValue: inventoryItems.reduce((s, i) => s + (i.availableQuantity * 500), 0), lowStockItems: inventoryItems.filter(i => i.availableQuantity <= i.lowStockThreshold).length, pendingReturns: returns.filter(r => r.status === 'requested' || r.status === 'pending').length, pendingSettlements: settlements.filter(s => s.status === 'pending').length, salesGrowth: 0, ordersGrowth: 0 };
    if (selectedPortal === 'all') return defaultKpi;
    const po = orders.filter(o => o.portal === selectedPortal);
    const pi = inventoryItems.filter(i => i.portal === selectedPortal);
    const pr = returns.filter(r => r.portal === selectedPortal);
    const ps = settlements.filter(s => s.portal === selectedPortal);
    return {
      totalSales: po.reduce((s, o) => s + o.totalAmount, 0),
      ordersToday: po.filter(o => new Date(o.orderDate).toDateString() === new Date().toDateString()).length,
      inventoryValue: pi.reduce((s, i) => s + (i.availableQuantity * 500), 0),
      lowStockItems: pi.filter(i => i.availableQuantity <= i.lowStockThreshold).length,
      pendingReturns: pr.filter(r => r.status === 'pending').length,
      pendingSettlements: ps.filter(s => s.status === 'pending').length,
      salesGrowth: 8.2, ordersGrowth: 5.4,
    };
  }, [orders, inventoryItems, returns, settlements, selectedPortal]);

  const maxProductUnits = topProductsByOrders.length > 0 ? topProductsByOrders[0].units : 1;
  const maxBrandRevenue = topBrandsByRevenue.length > 0 ? topBrandsByRevenue[0].revenue : 1;

  const hasNoData = orders.length === 0 && inventoryItems.length === 0 && !isLoading;
  void topBrandsByRevenue;

  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* ═══ EMPTY STATE ═══ */}
      {hasNoData && (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Your dashboard is ready!</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Start by adding products and importing orders, or load sample data to explore the platform instantly.
              </p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Button variant="outline" onClick={() => window.location.href = '/products'} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Products
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/data-import'} className="gap-2">
                  <Upload className="w-4 h-4" /> Import Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Sales Dashboard</h1>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-4 hidden md:block">
          <p className="text-lg font-semibold text-muted-foreground">Welcome back, {user?.name}!</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-medium text-blue-600">AI Access Control</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${criticalDecisionToggle ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <ShieldAlert className={`w-3.5 h-3.5 ${criticalDecisionToggle ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className={`text-xs font-medium ${criticalDecisionToggle ? 'text-emerald-600' : 'text-amber-600'}`}>Human Approval</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">VendorFlow v1.2</Badge>
        </div>
      </div>

      {/* ═══ FILTER CONTROLS ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedPortal} onValueChange={(v) => setSelectedPortal(v as Portal | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {getChannels().map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2"><ChannelIcon channelId={p.id} fallbackIcon={p.icon} size={16} /> {p.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <GlobalDateFilter value={dateRange} onChange={setDateRange} />
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Sort: Revenue</SelectItem>
            <SelectItem value="units">Sort: Units</SelectItem>
            <SelectItem value="returns">Sort: Returns</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate('/channels')}>
          <Plus className="w-3.5 h-3.5" />
          Add Channel
        </Button>
        <DashboardCustomizer widgets={widgets} onToggle={toggleWidget} onMove={moveWidget} onReset={resetWidgets} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           BLOCK 1: DAILY SUMMARY
         ═══════════════════════════════════════════════════════════════ */}
      {isVisible('daily-summary') && <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Daily Summary
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Updated
          </Badge>
        </h2>
        {dailySummary.fallbackUsed && (
          <div className="mb-3 p-3 rounded border border-amber-300 bg-amber-50 text-sm text-amber-800">
            Latest orders contain no item-level revenue; showing figures for <strong>{dailySummary.fallbackDate}</strong> instead. Raw latest-day revenue is ₹{dailySummary.rawTodayRevenue}.
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Daily Orders</p>
                <div className="p-2 rounded-lg bg-primary/10"><ShoppingCart className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold">{dailySummary.todayCount}</p>
              <div className={`flex items-center gap-1 text-xs mt-1 ${dailySummary.orderGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {dailySummary.orderGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(dailySummary.orderGrowth)}% vs yesterday
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Daily Revenue</p>
                <div className="p-2 rounded-lg bg-emerald-500/10"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(dailySummary.todayRevenue)}</p>
              <div className={`flex items-center gap-1 text-xs mt-1 ${dailySummary.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {dailySummary.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(dailySummary.revenueGrowth)}% vs yesterday
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Units Sold</p>
                <div className="p-2 rounded-lg bg-blue-500/10"><Hash className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold">{totalUnitsSold}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Duplicate Customers</p>
                <div className="p-2 rounded-lg bg-amber-500/10"><UserX className="w-4 h-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold">{duplicateCustomerCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>}

      {isVisible('kpi-row') && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Sales" value={formatCurrency(kpiData.totalSales)} icon={DollarSign} change={kpiData.salesGrowth} variant="success" />
        <KPICard title="Orders Today" value={kpiData.ordersToday} icon={ShoppingCart} change={kpiData.ordersGrowth} />
        <KPICard title="Inventory Value" value={formatCurrency(kpiData.inventoryValue)} icon={Package} />
        <KPICard title="Low Stock" value={kpiData.lowStockItems} icon={AlertTriangle} variant={kpiData.lowStockItems > 10 ? 'warning' : 'default'} />
        <KPICard title="Pending Returns" value={kpiData.pendingReturns} icon={RotateCcw} variant={kpiData.pendingReturns > 20 ? 'warning' : 'default'} />
        <KPICard title="Pending Settlements" value={kpiData.pendingSettlements} icon={CreditCard} variant={kpiData.pendingSettlements > 5 ? 'danger' : 'default'} />
      </div>}

      {isVisible('sales-trend') && <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Sales Trend</CardTitle>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> Updated
            </Badge>
          </div>
          <Tabs value={salesViewMode} onValueChange={(v) => setSalesViewMode(v as 'revenue' | 'units')}>
            <TabsList className="h-8">
              <TabsTrigger value="revenue" className="text-xs px-3 h-6">Revenue (₹)</TabsTrigger>
              <TabsTrigger value="units" className="text-xs px-3 h-6">Units Sold</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={salesViewMode === 'revenue' ? (v) => `₹${(v/1000).toFixed(0)}K` : undefined} />
              <Tooltip formatter={(v: number) => salesViewMode === 'revenue' ? `₹${v.toLocaleString()}` : `${v} units`} />
              <Bar dataKey={salesViewMode === 'revenue' ? 'revenue' : 'orders'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey={salesViewMode === 'revenue' ? 'revenue' : 'orders'} position="top" className="fill-muted-foreground" fontSize={10} formatter={(v: number) => salesViewMode === 'revenue' ? `₹${(v/1000).toFixed(0)}K` : v} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}

      {isVisible('top-products') && <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Performance Insights
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Updated
          </Badge>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Products by Order Count */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Top 5 Products by Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProductsByOrders.map((p, idx) => (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{idx + 1}</span>
                        <span className="text-sm font-medium truncate max-w-[180px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{p.units} units</span>
                        <span className="font-semibold">{formatCurrency(p.revenue)}</span>
                      </div>
                    </div>
                    <Progress value={(p.units / maxProductUnits) * 100} className="h-2" />
                  </div>
                ))}
                {topProductsByOrders.length === 0 && <p className="text-sm text-muted-foreground">No order data available.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Brands by Revenue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Top 5 Brands by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topBrandsByRevenue.map((b, idx) => (
                  <div key={b.brand} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-600">{idx + 1}</span>
                        <span className="text-sm font-medium">{b.brand}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{b.units} units</span>
                        <span className="font-semibold">{formatCurrency(b.revenue)}</span>
                        <Badge variant="outline" className="text-[10px]">{b.contribution}%</Badge>
                      </div>
                    </div>
                    <Progress value={(b.revenue / maxBrandRevenue) * 100} className="h-2" />
                  </div>
                ))}
                {topBrandsByRevenue.length === 0 && <p className="text-sm text-muted-foreground">No brand data available.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>}

      {isVisible('inventory-chart') && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryChart data={inventoryStatusData} />
        <PortalSalesChart data={portalRevenueData} />
      </div>}

      {isVisible('financial-overview') && <FinancialOverview orders={orders} settlements={settlements} expenses={expenses} invoices={invoices} />}


      {/* ═══════════════════════════════════════════════════════════════
           BLOCK 3: RETURN INSIGHTS
         ═══════════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Return Insights
          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20 gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Updated
          </Badge>
        </h2>

        {/* Return KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-l-4 border-l-muted-foreground">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Total Returns</p>
              <p className="text-xl font-bold">{returnCategories.total}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Return Pending</p>
              <p className="text-xl font-bold text-amber-600">{returnCategories.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Return Approved</p>
              <p className="text-xl font-bold text-emerald-600">{returnCategories.approved}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Return Rejected</p>
              <p className="text-xl font-bold text-rose-600">{returnCategories.rejected}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Eligible for Claim</p>
              <p className="text-xl font-bold text-blue-600">{eligibleForClaim}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 Return Products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PackageX className="w-4 h-4 text-rose-500" />
                Top Return Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topReturnProducts.map((p, idx) => (
                  <div key={p.name} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center text-xs font-bold text-rose-600">{idx + 1}</span>
                      <span className="text-sm font-medium truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-rose-600">{p.returnCount}</span>
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20">{p.returnRate}%</Badge>
                    </div>
                  </div>
                ))}
                {topReturnProducts.length === 0 && <p className="text-sm text-muted-foreground">No return data.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Return Window */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" />
                Upcoming Return Window
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingReturns.map(r => (
                  <div key={r.orderId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{r.orderId}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{r.product}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${r.daysRemaining <= 7 ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                      {r.daysRemaining}d left
                    </Badge>
                  </div>
                ))}
                {upcomingReturns.length === 0 && <p className="text-sm text-muted-foreground">No upcoming returns.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Delivered Returns */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-500" />
                Delivered Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deliveredReturns.map(r => (
                  <div key={r.orderId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{r.orderId}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{r.product}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 capitalize">{r.status}</Badge>
                  </div>
                ))}
                {deliveredReturns.length === 0 && <p className="text-sm text-muted-foreground">No delivered returns.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
