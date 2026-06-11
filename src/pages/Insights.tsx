import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  TrendingUp, TrendingDown, IndianRupee, Users, ShoppingCart, Package,
  BarChart3, HeadphonesIcon, Clock, AlertTriangle, Activity, Zap,
  ArrowUpRight, ArrowDownRight, ShieldAlert, CheckCircle2, Filter, LayoutDashboard,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts';
import { ordersDb, productsDb, inventoryDb, returnsDb } from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';
import { getChannels } from '@/services/channelManager';
import Dashboard from '@/pages/Dashboard';
import { ExecutiveWidgets } from '@/components/dashboard/ExecutiveWidgets';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

// Channel options
const channels = [
  { id: 'all', name: 'All Channels' },
  ...getChannels().map(c => ({ id: c.id, name: c.name })),
];

// Sort options
const sortOptions = [
  { id: 'date', name: 'Date' },
  { id: 'revenue', name: 'Revenue' },
  { id: 'units', name: 'Units' },
];

type SalesPeriod = 'day' | 'month' | 'year';

interface DBOrder { totalAmount?: number; total_amount?: number; total?: number; portal?: string; order_date?: string; created_at?: string; commission?: number; shipping_fee?: number; }

const defaultDaily = Array.from({ length: 14 }, (_, i) => ({ day: `Day ${i + 1}`, revenue: 0, orders: 0, cost: 0 }));

function buildPriceLookup(products: any[]): Map<string, number> {
  const map = new Map<string, number>();
  (products || []).forEach((p: any) => {
    const price = Number(p.base_price ?? p.price ?? p.selling_price ?? p.mrp ?? 0) || 0;
    if (price <= 0) return;
    [p.id, p.sku, p.name, p.product_name].filter(Boolean).forEach((k: any) => {
      map.set(String(k).toLowerCase(), price);
    });
  });
  return map;
}

function deriveOrderRevenue(order: any, priceLookup?: Map<string, number>): number {
  const items = order.order_items || order.items || order.orderItems || [];
  const itemRevenue = items.reduce((sum: number, item: any) => {
    const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
    const directAmount = Number(item.total ?? item.total_price ?? item.line_total ?? 0) || 0;
    if (directAmount > 0) return sum + directAmount;
    const unit = Number(item.unit_price ?? item.price ?? item.selling_price ?? 0) || 0;
    if (unit > 0) return sum + unit * quantity;
    if (priceLookup && priceLookup.size > 0) {
      const keys = [item.product_id, item.sku, item.product_name].filter(Boolean);
      for (const k of keys) {
        const lk = String(k).toLowerCase();
        if (priceLookup.has(lk)) return sum + (priceLookup.get(lk) || 0) * quantity;
      }
    }
    return sum;
  }, 0);
  const direct = Number(order.totalAmount ?? order.total_amount ?? order.total ?? order.amount ?? 0) || 0;
  return direct > 0 ? direct : itemRevenue;
}

// ---- Filter bar component ----
function InsightsFilterBar({ channel, onChannelChange, sortBy, onSortChange, children }: {
  channel: string; onChannelChange: (v: string) => void;
  sortBy: string; onSortChange: (v: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Filter className="w-3.5 h-3.5" />
        <span>Filters:</span>
      </div>
      <Select value={channel} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Channel" />
        </SelectTrigger>
        <SelectContent>
          {channels.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </div>
  );
}

function groupOrdersByPeriod(orders: any[], period: SalesPeriod, priceLookup?: Map<string, number>) {
  const grouped: Record<string, { day: string; revenue: number; orders: number; cost: number; sortKey: number }> = {};

  orders.forEach((order: any) => {
    const orderDate = new Date(order.order_date || order.created_at || null);
    if (isNaN(orderDate.getTime())) return;

    let key: string;
    let label: string;
    let sortKey: number;

    if (period === 'year') {
      key = `${orderDate.getFullYear()}`;
      label = key;
      sortKey = orderDate.getFullYear();
    } else if (period === 'month') {
      const month = orderDate.getMonth() + 1;
      key = `${orderDate.getFullYear()}-${String(month).padStart(2, '0')}`;
      label = orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      sortKey = orderDate.getFullYear() * 100 + month;
    } else {
      key = orderDate.toISOString().slice(0, 10);
      label = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      sortKey = orderDate.getTime();
    }

    if (!grouped[key]) grouped[key] = { day: label, revenue: 0, orders: 0, cost: 0, sortKey };
    grouped[key].revenue += deriveOrderRevenue(order, priceLookup);
    grouped[key].orders += 1;
  });

  return Object.values(grouped)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...row }) => row);
}

// ---- Stat card component ----
function StatCard({ icon: Icon, label, value, change, variant = 'default' }: {
  icon: React.ElementType; label: string; value: string; change?: number; variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colors: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-rose-500/10 text-rose-600',
  };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${colors[variant]}`}><Icon className="w-4 h-4" /></div>
          {change !== undefined && (
            <Badge variant="secondary" className={`text-xs gap-0.5 ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ---- Executive Dashboard ----
function ExecutiveDashboard() {
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState(defaultDaily);
  const [activeVendorCount, setActiveVendorCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const priceLookup = useMemo(() => buildPriceLookup(products), [products]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ords, prds, vends, alts] = await Promise.all([
          ordersDb.getAllWithItems().catch(() => []),
          productsDb.getAll().catch(() => []),
          (await import('@/services/database')).vendorsDb.getAll().catch(() => []),
          (await import('@/services/database')).alertsDb.getAll().catch(() => []),
        ]);
        if (!mounted) return;
        setOrders(ords || []);
        setProducts(prds || []);
        setActiveVendorCount((vends || []).length);
        setAlertsCount((alts || []).filter((a: any) => a.type === 'risk' || a.severity === 'high').length);

        const lookup = buildPriceLookup(prds || []);

        const byMonth: Record<string, { revenue: number; orders: number }> = {};
        (ords || []).forEach((o: any) => {
          const od = new Date(o.order_date || o.created_at || null);
          if (isNaN(od.getTime())) return;
          const key = `${od.getFullYear()}-${(od.getMonth()+1).toString().padStart(2,'0')}`;
          if (!byMonth[key]) byMonth[key] = { revenue: 0, orders: 0 };
          byMonth[key].revenue += deriveOrderRevenue(o, lookup);
          byMonth[key].orders += 1;
        });
        const ds = Object.keys(byMonth).sort().map(k => ({ day: k, revenue: Math.round(byMonth[k].revenue), orders: byMonth[k].orders, cost: 0 }));
        setDailySales(ds.length ? ds : defaultDaily);
      } catch (e) {
        console.debug('Failed to load executive data', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const channelRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o: any) => {
      const portal = o.portal || 'unknown';
      map[portal] = (map[portal] || 0) + deriveOrderRevenue(o, priceLookup);
    });
    const palette = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(340, 82%, 52%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(173, 80%, 40%)'];
    return Object.entries(map).map(([k, v], i) => ({ id: k, name: k, value: v, color: palette[i % palette.length] }));
  }, [orders, priceLookup]);

  const filteredChannelRevenue = useMemo(() => {
    let res = channel === 'all' ? channelRevenue : channelRevenue.filter(c => c.name.toLowerCase() === channel);
    if (sortBy === 'revenue') res = [...res].sort((a, b) => b.value - a.value);
    return res;
  }, [channel, sortBy, channelRevenue]);

  const totalRevenue = filteredChannelRevenue.reduce((s, c) => s + c.value, 0);
  const topChannel = channelRevenue.length
    ? channelRevenue.reduce((a, b) => (a.value > b.value ? a : b))
    : { name: 'N/A', value: 0 };

  const totalOrderCount = orders.length;
  const totalCost = orders.reduce((s: number, o: any) => s + (Number(o.commission) || 0) + (Number(o.shipping_fee) || 0), 0);
  const netProfit = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading executive data...</span>
        </div>
      )}
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={IndianRupee} label="Total Revenue" value={fmt(totalRevenue)} variant="success" />
        <StatCard icon={TrendingUp} label="Margin %" value={`${marginPct}%`} variant="success" />
        <StatCard icon={Users} label="Active Vendors" value={activeVendorCount.toString()} />
        <StatCard icon={IndianRupee} label="Net Profit" value={fmt(netProfit)} variant="success" />
        <StatCard icon={BarChart3} label="Top Channel" value={topChannel.name} />
        <StatCard icon={ShieldAlert} label="High Risk Flags" value={alertsCount.toString()} variant={alertsCount > 0 ? 'danger' : 'default'} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={totalOrderCount.toString()} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> Updated
            </Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Channel Revenue Share</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={filteredChannelRevenue} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {filteredChannelRevenue.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Sales Dashboard ----
function SalesDashboard() {
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [products, setProducts] = useState<any[]>([]);
  const [sortedProducts, setSortedProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState<SalesPeriod>('day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [pr, ords] = await Promise.all([
          productsDb.getAll().catch(() => []),
          ordersDb.getAllWithItems().catch(() => []),
        ]);
        if (!mounted) return;
        setProducts(pr || []);
        setOrders(ords || []);
        const lookup = buildPriceLookup(pr || []);
        const productRevenue: Record<string, { revenue: number; count: number }> = {};
        (ords || []).forEach((o: any) => {
          const items = o.order_items || o.items || [];
          if (items.length > 0) {
            items.forEach((it: any) => {
              const ipName = it.product_name || it.name || it.sku || 'Unknown';
              const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
              let iAmt = Number(it.total ?? it.total_price ?? it.line_total ?? 0) || 0;
              if (iAmt === 0) {
                const unit = Number(it.unit_price ?? it.price ?? it.selling_price ?? 0) || 0;
                if (unit > 0) iAmt = unit * qty;
                else {
                  const keys = [it.product_id, it.sku, it.product_name].filter(Boolean);
                  for (const k of keys) {
                    const lk = String(k).toLowerCase();
                    if (lookup.has(lk)) { iAmt = (lookup.get(lk) || 0) * qty; break; }
                  }
                }
              }
              if (!productRevenue[ipName]) productRevenue[ipName] = { revenue: 0, count: 0 };
              productRevenue[ipName].revenue += iAmt;
              productRevenue[ipName].count += qty;
            });
          } else {
            const pName = o.product_name || o.productName || o.name || 'Unknown';
            const amt = deriveOrderRevenue(o, lookup);
            if (!productRevenue[pName]) productRevenue[pName] = { revenue: 0, count: 0 };
            productRevenue[pName].revenue += amt;
            productRevenue[pName].count += 1;
          }
        });
        const top = (pr || []).map((p: any) => {
          const name = p.name || p.product_name || 'Unknown';
          const rev = productRevenue[name];
          return { name, revenue: rev?.revenue || 0, orders: rev?.count || 0, growth: 0 };
        });
        setSortedProducts(top);
      } catch (e) { console.debug('failed load products & orders', e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    if (channel === 'all') return orders;
    return orders.filter((order: any) => (order.portal || '').toLowerCase() === channel.toLowerCase());
  }, [orders, channel]);

  const priceLookup = useMemo(() => buildPriceLookup(products), [products]);
  const dailySalesLocal = useMemo(() => groupOrdersByPeriod(filteredOrders, period, priceLookup), [filteredOrders, period, priceLookup]);

  useEffect(() => {
    const data = [...sortedProducts];
    if (sortBy === 'revenue') data.sort((a, b) => b.revenue - a.revenue);
    else if (sortBy === 'units') data.sort((a, b) => b.orders - a.orders);
    setSortedProducts(data);
  }, [sortBy]);

  const totalOrders = dailySalesLocal.reduce((s, d) => s + d.orders, 0);
  const totalRev = dailySalesLocal.reduce((s, d) => s + d.revenue, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;
  const uniqueCustomers = new Set(filteredOrders.map((o: any) => o.customer_email || o.customerEmail || o.customer_id || o.customerId || o.phone || o.phone_number)).size;
  const repeatOrders = totalOrders - uniqueCustomers;
  const repeatRate = totalOrders > 0 ? Math.round((repeatOrders / totalOrders) * 100) : 0;

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading sales data...</span>
        </div>
      )}
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy}>
        <Select value={period} onValueChange={(v) => setPeriod(v as SalesPeriod)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </InsightsFilterBar>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Period Revenue" value={fmt(totalRev)} variant="success" />
        <StatCard icon={ShoppingCart} label="Total Orders" value={totalOrders.toString()} />
        <StatCard icon={TrendingUp} label="Repeat Rate" value={`${repeatRate}%`} variant={repeatRate > 20 ? 'success' : 'default'} />
        <StatCard icon={Package} label="Avg Order Value" value={fmt(avgOrderValue)} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Daily Sales</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Updated
          </Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailySalesLocal}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="revenue" position="top" className="fill-muted-foreground" fontSize={9} formatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Top Products</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {sortedProducts.map(p => (
              <div key={p.name} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.orders} orders</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-sm">{fmt(p.revenue)}</p>
                  <Badge variant="secondary" className={`text-xs ${p.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {p.growth >= 0 ? '+' : ''}{p.growth}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Support Dashboard ----
function SupportDashboard() {
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [returns, setReturns] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [customerCount, setCustomerCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const [rets, alts, custs] = await Promise.all([
          returnsDb.getAll().catch(() => []),
          db.alertsDb.getAll().catch(() => []),
          db.customersDb.getAll().catch(() => []),
        ]);
        if (!mounted) return;
        setReturns(rets || []);
        setAlerts(alts || []);
        setCustomerCount((custs || []).length);
      } catch (e) { console.debug('failed to load support data', e); }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredReturns = useMemo(() => {
    if (channel === 'all') return returns;
    return returns.filter((r: any) => (r.portal || '').toLowerCase() === channel);
  }, [returns, channel]);

  const filteredAlerts = useMemo(() => {
    if (channel === 'all') return alerts;
    return alerts.filter((a: any) => (a.portal || '').toLowerCase() === channel);
  }, [alerts, channel]);

  const resolvedStatuses = new Set(['closed', 'refund_initiated', 'completed', 'resolved']);
  const openReturns = filteredReturns.filter((r: any) => !resolvedStatuses.has((r.status || '').toLowerCase())).length;
  const resolvedReturns = filteredReturns.length - openReturns;
  const openAlerts = filteredAlerts.filter((a: any) => !a.read).length;
  const totalTickets = filteredReturns.length + filteredAlerts.length;
  const openTickets = openReturns + openAlerts;
  const resolutionRate = totalTickets > 0
    ? Math.round(((resolvedReturns + (filteredAlerts.length - openAlerts)) / totalTickets) * 100)
    : 0;

  const ticketDataLocal = useMemo(() => {
    const map: Record<string, { count: number; resolved: number }> = {};
    filteredReturns.forEach((r: any) => {
      const cat = (r.reason || 'Other Returns').toString().trim() || 'Other Returns';
      if (!map[cat]) map[cat] = { count: 0, resolved: 0 };
      map[cat].count += 1;
      if (resolvedStatuses.has((r.status || '').toLowerCase())) map[cat].resolved += 1;
    });
    filteredAlerts.forEach((a: any) => {
      const cat = a.type ? `Alert: ${a.type}` : 'Alerts';
      if (!map[cat]) map[cat] = { count: 0, resolved: 0 };
      map[cat].count += 1;
      if (a.read) map[cat].resolved += 1;
    });
    let rows = Object.entries(map).map(([category, v]) => ({
      category,
      count: v.count,
      openCount: v.count - v.resolved,
      resolvedCount: v.resolved,
      trend: v.count > 0 ? Math.round((1 - v.resolved / v.count) * 100) : 0,
    }));
    if (sortBy === 'revenue') rows = rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [filteredReturns, filteredAlerts, sortBy]);

  return (
    <div className="space-y-6">
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={HeadphonesIcon} label="Open Tickets" value={openTickets.toString()} variant={openTickets > 0 ? 'warning' : 'success'} />
        <StatCard icon={CheckCircle2} label="Resolution Rate" value={`${resolutionRate}%`} variant={resolutionRate > 60 ? 'success' : 'warning'} />
        <StatCard icon={Users} label="Unique Customers" value={customerCount.toString()} />
        <StatCard icon={Activity} label="Categories" value={ticketDataLocal.length.toString()} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue Categories</CardTitle>
          <CardDescription>{totalTickets} total · {openTickets} open · {resolvedReturns + (filteredAlerts.length - openAlerts)} resolved</CardDescription>
        </CardHeader>
        <CardContent>
          {ticketDataLocal.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No support tickets or alerts yet.</p>
          ) : (
            <div className="space-y-4">
              {ticketDataLocal.map(t => (
                <div key={t.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t.count} tickets ({t.openCount} open)</span>
                      <Badge variant="secondary" className={`text-xs ${t.trend <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.trend <= 0 ? '↓' : '↑'} {Math.abs(t.trend)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={totalTickets > 0 ? (t.count / totalTickets) * 100 : 0} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Financial Dashboard ----
function FinancialDashboard() {
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const [ords, prds, exps] = await Promise.all([
          ordersDb.getAllWithItems().catch(() => []),
          productsDb.getAll().catch(() => []),
          db.expensesDb.getAll().catch(() => []),
        ]);
        if (!mounted) return;
        setOrders(ords || []);
        setProducts(prds || []);
        setExpenses(exps || []);
      } catch (e) { console.debug('failed financial load', e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const priceLookup = useMemo(() => buildPriceLookup(products), [products]);

  const filteredOrders = useMemo(() => {
    if (channel === 'all') return orders;
    return orders.filter((o: any) => (o.portal || '').toLowerCase() === channel);
  }, [orders, channel]);

  const profitTrendLocal = useMemo(() => {
    const monthMap: Record<string, { revenue: number; cost: number }> = {};
    filteredOrders.forEach((o: any) => {
      const od = new Date(o.order_date || o.created_at || null);
      if (isNaN(od.getTime())) return;
      const key = `${od.getFullYear()}-${(od.getMonth()+1).toString().padStart(2,'0')}`;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
      monthMap[key].revenue += deriveOrderRevenue(o, priceLookup);
      monthMap[key].cost += (Number(o.commission) || 0) + (Number(o.shipping_fee) || 0);
    });
    // Expenses are not channel-scoped — only include when "all" channels
    if (channel === 'all') {
      expenses.forEach((e: any) => {
        const ed = new Date(e.expense_date || e.created_at || null);
        if (isNaN(ed.getTime())) return;
        const key = `${ed.getFullYear()}-${(ed.getMonth()+1).toString().padStart(2,'0')}`;
        if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
        monthMap[key].cost += Number(e.amount) || 0;
      });
    }
    let rows = Object.keys(monthMap).sort().map(k => {
      const r = Math.round(monthMap[k].revenue);
      const c = Math.round(monthMap[k].cost);
      const p = r - c;
      const m = r > 0 ? Math.round((p / r) * 100) : 0;
      return { month: k, revenue: r, cost: c, profit: p, margin: m };
    });
    if (sortBy === 'revenue') rows = [...rows].sort((a, b) => b.revenue - a.revenue);
    return rows;
  }, [filteredOrders, expenses, priceLookup, channel, sortBy]);

  // Aggregate totals (more honest than "latest month")
  const totals = useMemo(() => {
    return profitTrendLocal.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenue,
        cost: acc.cost + r.cost,
        profit: acc.profit + r.profit,
      }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [profitTrendLocal]);

  const margin = totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100) : 0;

  // Find latest non-empty months for growth comparison
  const nonEmpty = profitTrendLocal.filter(r => r.revenue > 0);
  const latest = nonEmpty[nonEmpty.length - 1];
  const prev = nonEmpty.length > 1 ? nonEmpty[nonEmpty.length - 2] : null;
  const revenueGrowth = prev && prev.revenue > 0
    ? Math.round(((latest!.revenue - prev.revenue) / prev.revenue) * 100)
    : 0;

  const marginWarningLocal = totals.revenue > 0 && margin < 25;
  const maxMargin = Math.max(50, ...profitTrendLocal.map(r => r.margin));

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading financial data...</span>
        </div>
      )}
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Total Revenue" value={fmt(totals.revenue)} change={revenueGrowth} variant={revenueGrowth >= 0 ? 'success' : 'danger'} />
        <StatCard icon={TrendingDown} label="Total Cost" value={fmt(totals.cost)} variant="warning" />
        <StatCard icon={TrendingUp} label="Net Profit" value={fmt(totals.profit)} variant={totals.profit >= 0 ? 'success' : 'danger'} />
        <StatCard icon={AlertTriangle} label="Profit Margin" value={`${margin}%`} variant={marginWarningLocal ? 'danger' : 'success'} />
      </div>
      {marginWarningLocal && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold text-rose-600 text-sm">Margin Alert</p>
              <p className="text-xs text-muted-foreground">Profit margin is below 25% threshold. Review cost structure.</p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Revenue vs Cost Trend</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Updated
          </Badge>
        </CardHeader>
        <CardContent>
          {profitTrendLocal.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No financial data for the selected channel.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={profitTrendLocal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v: number) => v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cost" name="Cost" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Profit Margin Trend</CardTitle></CardHeader>
        <CardContent>
          {profitTrendLocal.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No margin data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={profitTrendLocal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} domain={[0, maxMargin]} className="fill-muted-foreground" tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Area type="monotone" dataKey="margin" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2)/.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Operations Dashboard ----
function OperationsDashboard() {
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [opsDataLocal, setOpsDataLocal] = useState<{ automationRate: number; workflowLoad: number; processingVolume: number; bottlenecks: any[]; dailyChartData: any[] }>({ automationRate: 0, workflowLoad: 0, processingVolume: 0, bottlenecks: [], dailyChartData: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [orders, tasks, expenses] = await Promise.all([
          ordersDb.getAll().catch(() => []),
          (await import('@/services/database')).tasksDb.getAll().catch(() => []),
          (await import('@/services/database')).expensesDb.getAll().catch(() => []),
        ]);
        if (!mounted) return;
        const today = new Date();
        const dayMap: Record<string, number> = {};
        (orders || []).forEach((o: any) => {
          const od = new Date(o.order_date || o.created_at);
          if (isNaN(od.getTime())) return;
          const diff = Math.floor((today.getTime() - od.getTime()) / 86400000);
          if (diff >= 0 && diff < 14) {
            const key = `Day ${14 - diff}`;
            dayMap[key] = (dayMap[key] || 0) + 1;
          }
        });
        const dailyData = Array.from({ length: 14 }, (_, i) => {
          const key = `Day ${i + 1}`;
          return { day: key, revenue: 0, orders: dayMap[key] || 0, cost: 0 };
        });
        const processed = (orders || []).filter((o: any) => o.status === 'shipped' || o.status === 'delivered').length;
        const total = (orders || []).length;
        const rate = total > 0 ? Math.round((processed / total) * 100) : 0;
        const load = total > 100 ? 80 : total > 50 ? 60 : total > 10 ? 40 : 20;
        const bottlenecks = [
          { area: 'Order Processing', load: Math.min(load + 10, 100), status: load > 70 ? 'critical' : load > 40 ? 'warning' : 'normal' },
          { area: 'Inventory Sync', load: Math.min(load, 100), status: load > 60 ? 'warning' : 'normal' },
          { area: 'Returns Handling', load: Math.min(load - 10, 100), status: load > 70 ? 'critical' : 'normal' },
          { area: 'Shipping', load: Math.min(load + 5, 100), status: load > 65 ? 'warning' : 'normal' },
        ];
        setOpsDataLocal({ automationRate: rate, workflowLoad: load, processingVolume: total, bottlenecks, dailyChartData: dailyData });
      } catch (e) { console.debug('failed ops', e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading operations data...</span>
        </div>
      )}
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Automation Rate" value={`${opsDataLocal.automationRate}%`} change={5} variant="success" />
        <StatCard icon={Activity} label="Workflow Load" value={`${opsDataLocal.workflowLoad}%`} variant={opsDataLocal.workflowLoad > 80 ? 'danger' : 'default'} />
        <StatCard icon={ShoppingCart} label="Orders Processed" value={opsDataLocal.processingVolume.toString()} change={9.3} />
        <StatCard icon={AlertTriangle} label="Active Bottlenecks" value={(opsDataLocal.bottlenecks || []).filter(b => b.status !== 'ok').length.toString()} variant="warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Bottleneck Monitor</CardTitle>
          <CardDescription>System load across processing areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {(opsDataLocal.bottlenecks || []).map(b => (
              <div key={b.area} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.area}</span>
                    <Badge variant="outline" className={
                      b.status === 'critical' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                      b.status === 'warning' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    }>
                      {b.status === 'critical' ? 'Critical' : b.status === 'warning' ? 'Warning' : 'Normal'}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground font-semibold">{b.load}%</span>
                </div>
                <Progress value={b.load} className={`h-2.5 ${b.status === 'critical' ? '[&>div]:bg-rose-500' : b.status === 'warning' ? '[&>div]:bg-amber-500' : ''}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Order Processing Volume</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Updated
          </Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={opsDataLocal.dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip />
              <Bar dataKey="orders" name="Orders" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="orders" position="top" className="fill-muted-foreground" fontSize={9} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Main Page ----
export default function Insights() {
  const { user, isLoading: authLoading } = useAuth();

  // Prefetch orders data in background so sub-dashboards load faster
  useEffect(() => {
    if (authLoading || !user) return;
    // Warm the cache by triggering a background fetch
    ordersDb.getAllWithItems().catch(() => {});
    productsDb.getAll().catch(() => {});
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Insights</h1>
        <p className="text-muted-foreground">Sign in to view business intelligence dashboards.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-muted-foreground">Business intelligence dashboards</p>
        </div>
        <Badge variant="outline" className="text-xs font-mono">v1.2</Badge>
      </div>
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/60 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><LayoutDashboard className="w-3.5 h-3.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="executive" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><BarChart3 className="w-3.5 h-3.5" />Executive</TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><ShoppingCart className="w-3.5 h-3.5" />Sales</TabsTrigger>
          <TabsTrigger value="support" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><HeadphonesIcon className="w-3.5 h-3.5" />Support</TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><IndianRupee className="w-3.5 h-3.5" />Financial</TabsTrigger>
          <TabsTrigger value="operations" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><Activity className="w-3.5 h-3.5" />Operations</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><Dashboard /></TabsContent>
        <TabsContent value="executive">
          {/* ExecutiveWidgets integrated into ExecutiveDashboard below */}
          <div className="mt-6"><ExecutiveDashboard /></div>
        </TabsContent>
        <TabsContent value="sales"><SalesDashboard /></TabsContent>
        <TabsContent value="support"><SupportDashboard /></TabsContent>
        <TabsContent value="financial"><FinancialDashboard /></TabsContent>
        <TabsContent value="operations"><OperationsDashboard /></TabsContent>
      </Tabs>
    </div>
  );
}
