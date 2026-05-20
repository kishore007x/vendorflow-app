import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import Dashboard from '@/pages/Dashboard';
import { ExecutiveWidgets } from '@/components/dashboard/ExecutiveWidgets';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

// Channel options
const channels = [
  { id: 'all', name: 'All Channels' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'flipkart', name: 'Flipkart' },
  { id: 'meesho', name: 'Meesho' },
  { id: 'website', name: 'Website' },
  { id: 'blinkit', name: 'Blinkit' },
];

// Sort options
const sortOptions = [
  { id: 'date', name: 'Date' },
  { id: 'revenue', name: 'Revenue' },
  { id: 'units', name: 'Units' },
];

// ---- Data from DB ----
const defaultDaily = Array.from({ length: 14 }, (_, i) => ({ day: `Day ${i + 1}`, revenue: 0, orders: 0, cost: 0 }));

// ---- Filter bar component ----
function InsightsFilterBar({ channel, onChannelChange, sortBy, onSortChange }: {
  channel: string; onChannelChange: (v: string) => void;
  sortBy: string; onSortChange: (v: string) => void;
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
    </div>
  );
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ords, prds] = await Promise.all([
          ordersDb.getAll().catch(() => []),
          productsDb.getAll().catch(() => []),
        ]);
        if (!mounted) return;
        setOrders(ords || []);
        setProducts(prds || []);

        // compute last 14 days daily sales (prefer order_date only when it's in-window, otherwise try created_at)
        const byDay: Record<string, { revenue: number; orders: number }> = {};
        const now = new Date();
        for (let i = 0; i < 14; i++) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
          byDay[d.toISOString().slice(0,10)] = { revenue: 0, orders: 0 };
        }
        const tryFormat = (v: any) => {
          if (!v) return null;
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
        };
        (ords || []).forEach((o: any) => {
          // prefer order_date if it's within the last-14-day window, otherwise try created_at
          const od = tryFormat(o.order_date);
          const cd = tryFormat(o.created_at);
          let d: string | null = null;
          if (od && byDay[od]) d = od;
          else if (cd && byDay[cd]) d = cd;
          else d = null;
          const amt = Number(o.totalAmount ?? o.total_amount ?? o.total ?? o.amount ?? 0) || 0;
          if (d && byDay[d]) { byDay[d].revenue += amt; byDay[d].orders += 1; }
        });
        const ds = Object.keys(byDay).sort().map(k => ({ day: k, revenue: Math.round(byDay[k].revenue), orders: byDay[k].orders, cost: 0 }));
        setDailySales(ds.length ? ds : defaultDaily);
      } catch (e) {
        console.debug('Failed to load executive data', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredChannelRevenue = useMemo(() => {
    // build channel revenue from orders if present
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.portal] = (map[o.portal] || 0) + (o.totalAmount || o.total_amount || o.total || 0); });
    const data = Object.entries(map).map(([k, v]) => ({ id: k, name: k, value: v, color: 'hsl(var(--chart-1))' }));
    let res = channel === 'all' ? data : data.filter(c => c.name.toLowerCase() === channel);
    if (sortBy === 'revenue') res = [...res].sort((a, b) => b.value - a.value);
    return res;
  }, [channel, sortBy, orders]);

  const totalRevenue = filteredChannelRevenue.reduce((s, c) => s + c.value, 0);
  const topChannel = filteredChannelRevenue.length ? filteredChannelRevenue.reduce((a, b) => a.value > b.value ? a : b) : { name: 'N/A', value: 0 };

  return (
    <div className="space-y-6">
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={IndianRupee} label="Total Revenue" value={fmt(totalRevenue)} change={14.2} variant="success" />
        <StatCard icon={TrendingUp} label="Growth %" value="14.2%" change={3.1} variant="success" />
        <StatCard icon={Users} label="Active Vendors" value="24" change={8} />
        <StatCard icon={IndianRupee} label="Net Profit" value={fmt(totalRevenue * 0.32)} change={5.8} variant="success" />
        <StatCard icon={BarChart3} label="Top Channel" value={topChannel.name} />
        <StatCard icon={ShieldAlert} label="High Risk Flags" value="3" variant="danger" />
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
  const [dailySalesLocal, setDailySalesLocal] = useState(defaultDaily);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pr = await productsDb.getAll().catch(() => []);
        if (!mounted) return;
        setProducts(pr || []);
        // build top products from product's own stats if present
        const top = (pr || []).map((p: any) => ({ name: p.name || p.product_name || 'Unknown', revenue: p.revenue || p.total_sales || 0, orders: p.orders_count || p.sales_count || 0, growth: 0 }));
        setSortedProducts(top);
      } catch (e) { console.debug('failed load products', e); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let data = [...sortedProducts];
    if (sortBy === 'revenue') data.sort((a, b) => b.revenue - a.revenue);
    else if (sortBy === 'units') data.sort((a, b) => b.orders - a.orders);
    setSortedProducts(data);
  }, [sortBy]);

  const totalOrders = dailySalesLocal.reduce((s, d) => s + d.orders, 0);
  const totalRev = dailySalesLocal.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="space-y-6">
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Period Revenue" value={fmt(totalRev)} change={11.4} variant="success" />
        <StatCard icon={ShoppingCart} label="Total Orders" value={totalOrders.toString()} change={7.2} />
        <StatCard icon={TrendingUp} label="Conversion Rate" value="3.8%" change={0.4} variant="success" />
        <StatCard icon={Package} label="Avg Order Value" value={fmt(Math.round(totalRev / totalOrders))} change={2.1} />
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
            <BarChart data={dailySales}>
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
  const [ticketDataLocal, setTicketDataLocal] = useState<{ category: string; count: number; trend: number }[]>([]);
  const totalTickets = ticketDataLocal.reduce((s, t) => s + t.count, 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const alerts = await (await import('@/services/database')).alertsDb.getAll().catch(() => []);
        if (!mounted) return;
        // aggregate by type
        const map: Record<string, number> = {};
        (alerts || []).forEach((a: any) => { map[a.type || 'General'] = (map[a.type || 'General'] || 0) + 1; });
        const data = Object.entries(map).map(([k, v]) => ({ category: k, count: v, trend: 0 }));
        setTicketDataLocal(data);
      } catch (e) { console.debug('failed to load alerts', e); }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={HeadphonesIcon} label="Open Tickets" value={totalTickets.toString()} change={-6} variant="warning" />
        <StatCard icon={Clock} label="Avg Response Time" value="2.4 hrs" change={-12} variant="success" />
        <StatCard icon={CheckCircle2} label="Resolution Rate" value="87%" change={3} variant="success" />
        <StatCard icon={Users} label="Customer Retention" value="92%" change={1.5} variant="success" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Issue Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ticketDataLocal.map(t => (
              <div key={t.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{t.count} tickets</span>
                    <Badge variant="secondary" className={`text-xs ${t.trend <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.trend <= 0 ? '↓' : '↑'} {Math.abs(t.trend)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={totalTickets > 0 ? (t.count / totalTickets) * 100 : 0} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Financial Dashboard ----
function FinancialDashboard() {
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [profitTrendLocal, setProfitTrendLocal] = useState(() => Array.from({ length: 6 }, (_, i) => ({ month: `M${i+1}`, revenue: 0, cost: 0, profit: 0, margin: 0 })));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const orders = await ordersDb.getAll().catch(() => []);
        if (!mounted) return;
        // compute last 6 months revenue/cost
        const now = new Date();
        const months: { key: string; revenue: number; cost: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
          months.push({ key, revenue: 0, cost: 0 });
        }
        (orders || []).forEach((o: any) => {
          const od = new Date(o.order_date || o.created_at || o.orderDate || null);
          if (isNaN(od.getTime())) return;
          const key = `${od.getFullYear()}-${(od.getMonth()+1).toString().padStart(2,'0')}`;
          const m = months.find(x => x.key === key);
          const amt = o.totalAmount || o.total_amount || o.total || 0;
          if (m) m.revenue += amt;
        });
        const trend = months.map(m => ({ month: m.key, revenue: Math.round(m.revenue), cost: 0, profit: Math.round(m.revenue), margin: m.revenue ? +((m.revenue - 0) / m.revenue * 100).toFixed(1) : 0 }));
        setProfitTrendLocal(trend);
      } catch (e) { console.debug('failed profit trend', e); }
    })();
    return () => { mounted = false; };
  }, []);
  const latestLocal = profitTrendLocal[profitTrendLocal.length - 1] || { margin: 0 };
  const marginWarningLocal = latestLocal.margin < 25;

  return (
    <div className="space-y-6">
      <InsightsFilterBar channel={channel} onChannelChange={setChannel} sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Revenue (Latest)" value={fmt(latestLocal.revenue || 0)} change={8.3} variant="success" />
        <StatCard icon={TrendingDown} label="Total Cost" value={fmt(latestLocal.cost || 0)} change={4.1} variant="warning" />
        <StatCard icon={TrendingUp} label="Net Profit" value={fmt(latestLocal.profit || 0)} change={12.6} variant="success" />
        <StatCard icon={AlertTriangle} label="Profit Margin" value={`${latestLocal.margin || 0}%`} variant={marginWarningLocal ? 'danger' : 'success'} />
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
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={profitTrendLocal}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="cost" name="Cost" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Profit Margin Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={profitTrendLocal}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 50]} className="fill-muted-foreground" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="margin" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2)/.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Operations Dashboard ----
function OperationsDashboard() {
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [opsDataLocal, setOpsDataLocal] = useState({ automationRate: 0, workflowLoad: 0, processingVolume: 0, bottlenecks: [] as any[] });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const orders = await ordersDb.getAll().catch(() => []);
        if (!mounted) return;
        setOpsDataLocal({ automationRate: 70, workflowLoad: 60, processingVolume: (orders || []).length, bottlenecks: [] });
      } catch (e) { console.debug('failed ops', e); }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
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
            <BarChart data={defaultDaily}>
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
          <ExecutiveWidgets orders={[]} formatCurrency={(n: number) => '₹' + n.toLocaleString('en-IN')} />
          <div className="mt-6"><ExecutiveDashboard /></div>
        </TabsContent>
        <TabsContent value="sales"><Dashboard /></TabsContent>
        <TabsContent value="support"><SupportDashboard /></TabsContent>
        <TabsContent value="financial"><FinancialDashboard /></TabsContent>
        <TabsContent value="operations"><OperationsDashboard /></TabsContent>
      </Tabs>
    </div>
  );
}
