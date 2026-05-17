import { useState, useEffect, useMemo } from 'react';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { settlementsDb } from '@/services/database';
import { Portal, SettlementStatus } from '@/types';
import { PortalFilter } from '@/components/dashboard/PortalFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, TrendingUp, Percent,
  PieChart as PieChartIcon, BarChart3, Landmark, ArrowLeftRight, Split,
  CheckCircle2, Wallet, Receipt, Building2, ShoppingCart
} from 'lucide-react';
import { DateFilter, ExportButton, useRowSelection, SelectAllCheckbox, RowCheckbox } from '@/components/TableEnhancements';
import { GlobalDateFilter, type DateRange } from '@/components/GlobalDateFilter';
import OrderPaymentSettlement from '@/components/settlements/OrderPaymentSettlement';
import LandingCostAnalysis from '@/components/settlements/LandingCostAnalysis';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend, LabelList
} from 'recharts';

const settlementStatusConfig: Record<SettlementStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning', icon: Clock },
  completed: { label: 'Completed', color: 'bg-success/10 text-success', icon: CheckCircle },
  delayed: { label: 'Delayed', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

// Order-level settlements are derived from the settlements table (Supabase).

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const expenseCategories: any[] = [];

const taxSplit = { cgst: 0, sgst: 0, igst: 0 };
const totalTax = taxSplit.cgst + taxSplit.sgst + taxSplit.igst;

// Mock revenue vs cost trend
const revenueCostTrend = [
  { period: 'Week 1', revenue: 185000, cost: 128000, margin: 30.8 },
  { period: 'Week 2', revenue: 210000, cost: 142000, margin: 32.4 },
  { period: 'Week 3', revenue: 195000, cost: 135000, margin: 30.8 },
  { period: 'Week 4', revenue: 240000, cost: 155000, margin: 35.4 },
];

// Reconciliation discrepancy trend
const reconTrend = [
  { period: 'Jan', mismatchCount: 12, discrepancyAmt: 4500 },
  { period: 'Feb', mismatchCount: 8, discrepancyAmt: 2800 },
  { period: 'Mar', mismatchCount: 15, discrepancyAmt: 6200 },
  { period: 'Apr', mismatchCount: 6, discrepancyAmt: 1900 },
  { period: 'May', mismatchCount: 10, discrepancyAmt: 3700 },
  { period: 'Jun', mismatchCount: 4, discrepancyAmt: 1200 },
];

// B2B vs B2C
const b2bValue = 320000;
const b2cValue = 480000;
const salesSplit = [
  { name: 'B2B', value: b2bValue },
  { name: 'B2C', value: b2cValue },
];

// Bank vs Ecom
const bankTotal = 756000;
const ecomTotal = 742500;
const bankEcomDiff = bankTotal - ecomTotal;

function SectionBadge() {
  return <Badge variant="outline" className="gap-1 text-[10px] border-success/30 text-success"><CheckCircle2 className="w-3 h-3" />Updated</Badge>;
}

export default function Settlements() {
  const [selectedPortal, setSelectedPortal] = useState<Portal | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [viewTab, setViewTab] = useState('overview');
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [trendView, setTrendView] = useState<'weekly' | 'monthly'>('weekly');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  const [allSettlements, setAllSettlements] = useState<any[]>([]);

  useEffect(() => {
    const fetchSettlements = async () => {
      try {
        const data = await settlementsDb.getAll();
        setAllSettlements(data.map((s: any) => ({
          ...s, settlementId: s.settlement_id, netAmount: s.net_amount,
          settlementDate: s.settlement_date, amount: s.amount ?? 0,
          commission: s.commission ?? 0,
        })));
      } catch (e) { console.error(e); }
    };
    fetchSettlements();
  }, []);

  const filteredSettlements = useMemo(() => {
    return allSettlements.filter(settlement => {
      const matchesPortal = selectedPortal === 'all' || settlement.portal === selectedPortal;
      const matchesStatus = statusFilter === 'all' || settlement.status === statusFilter;
      return matchesPortal && matchesStatus;
    });
  }, [selectedPortal, statusFilter]);

  const orderSettlements = useMemo(() => {
    const list: any[] = [];
    allSettlements.forEach(s => {
      // common column names inserted by import scripts: order_id, order_ids (array), order_numbers
      if (s.order_id) {
        list.push({ ...s, orderId: s.order_id, amount: s.amount ?? s.net_amount ?? 0, status: s.status });
      } else if (Array.isArray(s.order_ids) && s.order_ids.length > 0) {
        const per = (s.amount ?? s.net_amount ?? 0) / s.order_ids.length;
        s.order_ids.forEach((oid: any) => list.push({ ...s, orderId: oid, amount: per, status: s.status }));
      } else if (s.order_numbers && Array.isArray(s.order_numbers)) {
        const per = (s.amount ?? s.net_amount ?? 0) / s.order_numbers.length;
        s.order_numbers.forEach((oid: any) => list.push({ ...s, orderId: oid, amount: per, status: s.status }));
      }
    });
    return list;
  }, [allSettlements]);

  const filteredOrderSettlements = useMemo(() => {
    return orderSettlements.filter(s => {
      const matchesPortal = selectedPortal === 'all' || s.portal === selectedPortal;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesPortal && matchesStatus;
    });
  }, [orderSettlements, selectedPortal, statusFilter]);

  const batchRowSelection = useRowSelection(filteredSettlements.map(s => s.settlementId));
  const orderRowSelection = useRowSelection(filteredOrderSettlements.map(s => s.orderId));

  const stats = useMemo(() => {
    const slist = selectedPortal === 'all' ? allSettlements : allSettlements.filter(s => s.portal === selectedPortal);
    const totalAmount = slist.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalNet = slist.reduce((sum, s) => sum + (s.netAmount || 0), 0);
    const totalCommission = slist.reduce((sum, s) => sum + (s.commission || 0), 0);
    return {
      totalAmount, totalNet, totalCommission,
      pending: slist.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.netAmount || 0), 0),
      delayed: slist.filter(s => s.status === 'delayed').length,
    };
  }, [selectedPortal]);

  const paymentBatches = useMemo(() => {
    const upcoming = allSettlements.filter(s => s.status === 'pending');
    const settled = allSettlements.filter(s => s.status === 'completed');
    const pendingS = allSettlements.filter(s => s.status === 'delayed');
    return {
      upcoming: { count: upcoming.length, value: upcoming.reduce((s, i) => s + i.netAmount, 0) },
      settled: { count: settled.length, value: settled.reduce((s, i) => s + i.netAmount, 0) },
      pending: { count: pendingS.length, value: pendingS.reduce((s, i) => s + i.netAmount, 0) },
    };
  }, []);

  const totalExpense = expenseCategories.reduce((s, e) => s + e.value, 0);

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const dateLabel = dateFilter === 'today' ? 'Today' : dateFilter === '7days' ? 'Last 7 Days' : dateFilter === '30days' ? 'Last 30 Days' : dateFilter === 'this_month' ? 'This Month' : dateFilter === 'this_year' ? 'This Year' : 'Custom';
  const activeSelection = viewTab === 'batch' ? batchRowSelection : orderRowSelection;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-muted-foreground">Revenue, expenses, settlements & reconciliation overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GlobalDateFilter value={globalDateRange} onChange={setGlobalDateRange} />
          <ExportButton label={activeSelection.count > 0 ? undefined : `Export – ${dateLabel}`} selectedCount={activeSelection.count} />
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <PortalFilter selectedPortal={selectedPortal} onPortalChange={setSelectedPortal} />
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(settlementStatusConfig).map(([key, config]) => (<SelectItem key={key} value={key}>{config.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Payment Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { icon: CreditCard, value: formatCurrency(stats.totalAmount), label: 'Gross Amount', bg: 'bg-primary/10', fg: 'text-primary' },
          { icon: TrendingUp, value: formatCurrency(stats.totalNet), label: 'Net Amount', bg: 'bg-success/10', fg: 'text-success' },
          { icon: Percent, value: formatCurrency(stats.totalCommission), label: 'Commission', bg: 'bg-accent/10', fg: 'text-accent-foreground' },
          { icon: Clock, value: formatCurrency(stats.pending), label: 'Pending', bg: 'bg-warning/10', fg: 'text-warning' },
          { icon: AlertTriangle, value: String(stats.delayed), label: 'Delayed', bg: 'bg-destructive/10', fg: 'text-destructive' },
        ].map((kpi, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bg}`}><kpi.icon className={`w-5 h-5 ${kpi.fg}`} /></div>
                <div><p className="text-xl font-bold">{kpi.value}</p><p className="text-xs text-muted-foreground">{kpi.label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== BLOCK 1: Revenue & Cost Trend ===== */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Revenue vs Cost Trend</CardTitle>
              <SectionBadge />
            </div>
            <div className="flex gap-1">
              {(['weekly', 'monthly'] as const).map(v => (
                <button key={v} onClick={() => setTrendView(v)} className={`px-3 py-1 text-xs rounded-md transition-colors ${trendView === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {v === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueCostTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} name="Cost" />
                <Line type="monotone" dataKey="margin" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Margin %" yAxisId={0} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ===== BLOCK 2: Expense & Tax Overview ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Expense Analysis</CardTitle>
              <SectionBadge />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Pie */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Category %</p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={2}>
                        {expenseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {expenseCategories.map((e, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                      {e.name}
                    </div>
                  ))}
                </div>
              </div>
              {/* Bar */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Amount Comparison</p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseCategories} layout="vertical">
                      <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))">
                        {expenseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        <LabelList dataKey="value" position="right" formatter={(v: number) => `₹${(v / 1000).toFixed(1)}K`} className="fill-foreground" style={{ fontSize: 10 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <Card className="mt-4 bg-muted/30 border-0">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><Receipt className="w-5 h-5 text-destructive" /></div>
                <div><p className="text-lg font-bold">{formatCurrency(totalExpense)}</p><p className="text-xs text-muted-foreground">Total Expenses</p></div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Tax Split */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Tax Split Contribution</CardTitle>
              <SectionBadge />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: 'CGST', value: taxSplit.cgst, pct: ((taxSplit.cgst / totalTax) * 100).toFixed(1), color: 'bg-primary' },
              { label: 'SGST', value: taxSplit.sgst, pct: ((taxSplit.sgst / totalTax) * 100).toFixed(1), color: 'bg-chart-2' },
              { label: 'IGST', value: taxSplit.igst, pct: ((taxSplit.igst / totalTax) * 100).toFixed(1), color: 'bg-chart-3' },
            ].map((t, i) => (
              <Card key={i} className="bg-muted/30 border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{t.pct}%</Badge>
                      <span className="font-bold text-sm">{formatCurrency(t.value)}</span>
                    </div>
                  </div>
                  <Progress value={parseFloat(t.pct)} className="h-2" />
                </CardContent>
              </Card>
            ))}
            <div className="text-center pt-2">
              <p className="text-2xl font-bold">{formatCurrency(totalTax)}</p>
              <p className="text-xs text-muted-foreground">Total Tax Collected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== BLOCK 3: Settlement & Reconciliation ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Batch Status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Payment Batch Status</CardTitle>
              <SectionBadge />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Upcoming Batches', count: paymentBatches.upcoming.count, value: paymentBatches.upcoming.value, icon: Clock, bg: 'bg-warning/10', fg: 'text-warning' },
              { label: 'Settled Batches', count: paymentBatches.settled.count, value: paymentBatches.settled.value, icon: CheckCircle, bg: 'bg-success/10', fg: 'text-success' },
              { label: 'Pending Settlements', count: paymentBatches.pending.count, value: paymentBatches.pending.value, icon: AlertTriangle, bg: 'bg-destructive/10', fg: 'text-destructive' },
            ].map((b, i) => (
              <Card key={i} className="bg-muted/30 border-0">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${b.bg}`}><b.icon className={`w-5 h-5 ${b.fg}`} /></div>
                    <div>
                      <p className="font-semibold text-sm">{b.label}</p>
                      <p className="text-xs text-muted-foreground">{b.count} batches</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(b.value)}</p>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Reconciliation Discrepancy Trend */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Reconciliation Discrepancy Trend</CardTitle>
              <SectionBadge />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reconTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `₹${(v / 1000).toFixed(1)}K`} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="mismatchCount" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} name="Mismatches" />
                  <Line yAxisId="right" type="monotone" dataKey="discrepancyAmt" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4 }} name="Discrepancy ₹" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== BLOCK 4: Sales Split ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* B2B vs B2C */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">B2B vs B2C Sales Split</CardTitle>
              <SectionBadge />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[180px] w-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={salesSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--chart-4))" />
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 flex-1">
                {[
                  { label: 'B2B Sales', value: b2bValue, pct: ((b2bValue / (b2bValue + b2cValue)) * 100).toFixed(1), color: 'bg-primary', icon: Building2 },
                  { label: 'B2C Sales', value: b2cValue, pct: ((b2cValue / (b2bValue + b2cValue)) * 100).toFixed(1), color: 'bg-chart-4', icon: ShoppingCart },
                ].map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <s.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{s.label}</span>
                      </div>
                      <span className="font-bold">{formatCurrency(s.value)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={parseFloat(s.pct)} className="h-2 flex-1" />
                      <Badge variant="secondary" className="text-xs">{s.pct}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank vs E-Commerce Reconciliation */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Bank vs E-Commerce Reconciliation</CardTitle>
              <SectionBadge />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-muted/30 border-0">
                <CardContent className="p-4 text-center">
                  <Landmark className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-lg font-bold">{formatCurrency(bankTotal)}</p>
                  <p className="text-xs text-muted-foreground">Bank Payments</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-0">
                <CardContent className="p-4 text-center">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-chart-4" />
                  <p className="text-lg font-bold">{formatCurrency(ecomTotal)}</p>
                  <p className="text-xs text-muted-foreground">E-Commerce Settlements</p>
                </CardContent>
              </Card>
            </div>
            <Card className={`border-0 ${bankEcomDiff !== 0 ? 'bg-destructive/5' : 'bg-success/5'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className={`w-5 h-5 ${bankEcomDiff !== 0 ? 'text-destructive' : 'text-success'}`} />
                  <div>
                    <p className="font-semibold text-sm">Difference</p>
                    <p className="text-xs text-muted-foreground">{bankEcomDiff !== 0 ? 'Mismatch detected' : 'Fully reconciled'}</p>
                  </div>
                </div>
                <p className={`text-xl font-bold ${bankEcomDiff !== 0 ? 'text-destructive' : 'text-success'}`}>
                  {bankEcomDiff >= 0 ? '+' : ''}{formatCurrency(Math.abs(bankEcomDiff))}
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* ===== Settlement Tables ===== */}
      <Tabs value={viewTab} onValueChange={setViewTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batch">Batch Settlement</TabsTrigger>
          <TabsTrigger value="individual">Individual Orders</TabsTrigger>
          <TabsTrigger value="detailed">Order Payment</TabsTrigger>
          <TabsTrigger value="landing-cost">Landing Cost</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="text-center py-8 text-muted-foreground">
            <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a specific tab above to view detailed settlement data.</p>
          </div>
        </TabsContent>

        <TabsContent value="batch">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"><SelectAllCheckbox checked={batchRowSelection.isAllSelected} onCheckedChange={batchRowSelection.toggleAll} /></TableHead>
                      <TableHead className="font-semibold">Batch ID</TableHead>
                      <TableHead className="font-semibold">Portal</TableHead>
                      <TableHead className="font-semibold">Cycle Period</TableHead>
                      <TableHead className="font-semibold text-right">Gross Amount</TableHead>
                      <TableHead className="font-semibold text-right">Commission</TableHead>
                      <TableHead className="font-semibold text-right">Fees</TableHead>
                      <TableHead className="font-semibold text-right">Net Amount</TableHead>
                      <TableHead className="font-semibold">Orders</TableHead>
                      <TableHead className="font-semibold">Expected Date</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSettlements.map((settlement) => {
                      const status = settlementStatusConfig[settlement.status];
                      const portal = getChannels().find(p => p.id === settlement.portal);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={settlement.settlementId} className={`hover:bg-muted/30 ${batchRowSelection.isSelected(settlement.settlementId) ? 'bg-primary/5' : ''}`}>
                          <TableCell><RowCheckbox checked={batchRowSelection.isSelected(settlement.settlementId)} onCheckedChange={() => batchRowSelection.toggle(settlement.settlementId)} /></TableCell>
                          <TableCell className="font-medium">{settlement.settlementId}</TableCell>
                          <TableCell><Badge variant="outline" className="gap-1"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</Badge></TableCell>
                          <TableCell className="text-sm">{formatDate(settlement.cycleStart)} - {formatDate(settlement.cycleEnd)}</TableCell>
                          <TableCell className="text-right font-medium">₹{settlement.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-destructive">-₹{settlement.commission.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-muted-foreground">-₹{settlement.fees.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-success">₹{settlement.netAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{settlement.ordersCount}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(settlement.expectedDate)}</TableCell>
                          <TableCell><Badge variant="secondary" className={`gap-1 ${status.color}`}><StatusIcon className="w-3 h-3" />{status.label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredSettlements.length === 0 && (
                <div className="text-center py-12"><CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No settlements found</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"><SelectAllCheckbox checked={orderRowSelection.isAllSelected} onCheckedChange={orderRowSelection.toggleAll} /></TableHead>
                      <TableHead className="font-semibold">Order ID</TableHead>
                      <TableHead className="font-semibold">Portal</TableHead>
                      <TableHead className="font-semibold text-right">Settlement Amount</TableHead>
                      <TableHead className="font-semibold text-right">Fees</TableHead>
                      <TableHead className="font-semibold text-right">Commission</TableHead>
                      <TableHead className="font-semibold text-right">Net Credit</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrderSettlements.map((s) => {
                      const status = settlementStatusConfig[s.status];
                      const portal = getChannels().find(p => p.id === s.portal);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={s.orderId} className={`hover:bg-muted/30 ${orderRowSelection.isSelected(s.orderId) ? 'bg-primary/5' : ''}`}>
                          <TableCell><RowCheckbox checked={orderRowSelection.isSelected(s.orderId)} onCheckedChange={() => orderRowSelection.toggle(s.orderId)} /></TableCell>
                          <TableCell className="font-medium">{s.orderId}</TableCell>
                          <TableCell><Badge variant="outline" className="gap-1"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</Badge></TableCell>
                          <TableCell className="text-right font-medium">₹{s.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-muted-foreground">-₹{s.fees.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-destructive">-₹{s.commission.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-success">₹{s.net.toLocaleString()}</TableCell>
                          <TableCell><Badge variant="secondary" className={`gap-1 ${status.color}`}><StatusIcon className="w-3 h-3" />{status.label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <OrderPaymentSettlement />
        </TabsContent>

        <TabsContent value="landing-cost">
          <LandingCostAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
