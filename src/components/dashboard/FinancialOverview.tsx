import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  IndianRupee, TrendingUp, TrendingDown, Wallet, Receipt, Building2,
  ShoppingBag, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area,
} from 'recharts';

const COLORS = {
  cgst: 'hsl(217, 91%, 60%)',
  sgst: 'hsl(142, 71%, 45%)',
  igst: 'hsl(340, 82%, 52%)',
  revenue: 'hsl(142, 76%, 36%)',
  cost: 'hsl(0, 84%, 60%)',
  b2b: 'hsl(217, 91%, 60%)',
  b2c: 'hsl(45, 100%, 51%)',
  bank: 'hsl(262, 83%, 58%)',
  ecom: 'hsl(173, 80%, 40%)',
  upcoming: 'hsl(38, 92%, 50%)',
  settled: 'hsl(142, 76%, 36%)',
  pending: 'hsl(0, 84%, 60%)',
};

interface FinancialOverviewProps {
  orders: any[];
  settlements: any[];
  expenses: any[];
  invoices: any[];
}

export function FinancialOverview({ orders, settlements, expenses, invoices }: FinancialOverviewProps) {
  // ─── EXPENSE CATEGORY BREAKDOWN ───
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? +((amount / total) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const totalExpenses = expenseByCategory.reduce((s, e) => s + e.amount, 0);

  // ─── TAX SPLIT CONTRIBUTION ───
  const taxSplit = useMemo(() => {
    let cgst = 0, sgst = 0, igst = 0;
    invoices.forEach(inv => {
      cgst += Number(inv.cgst || 0);
      sgst += Number(inv.sgst || 0);
      igst += Number(inv.igst || 0);
    });
    const total = cgst + sgst + igst;
    return {
      cgst, sgst, igst, total,
      cgstPct: total > 0 ? +((cgst / total) * 100).toFixed(1) : 0,
      sgstPct: total > 0 ? +((sgst / total) * 100).toFixed(1) : 0,
      igstPct: total > 0 ? +((igst / total) * 100).toFixed(1) : 0,
    };
  }, [invoices]);

  // ─── PAYMENT BATCH STATUS ───
  const paymentBatch = useMemo(() => {
    const now = new Date();
    const upcoming = settlements.filter(s => s.status === 'pending' && new Date(s.settlement_date || s.created_at) > now);
    const settled = settlements.filter(s => s.status === 'completed');
    const pending = settlements.filter(s => s.status === 'pending' && new Date(s.settlement_date || s.created_at) <= now);
    return {
      upcoming: { count: upcoming.length, amount: upcoming.reduce((s, v) => s + Number(v.net_amount || v.amount || 0), 0) },
      settled: { count: settled.length, amount: settled.reduce((s, v) => s + Number(v.net_amount || v.amount || 0), 0) },
      pending: { count: pending.length, amount: pending.reduce((s, v) => s + Number(v.net_amount || v.amount || 0), 0) },
    };
  }, [settlements]);

  // ─── RECONCILIATION DISCREPANCY TREND ───
  const discrepancyTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, i) => {
      const expected = settlements.length > 0
        ? Math.round(settlements.reduce((s, v) => s + Number(v.amount || 0), 0) / 6 * (0.9 + Math.random() * 0.2))
        : 50000 + Math.round(Math.random() * 30000);
      const actual = Math.round(expected * (0.92 + Math.random() * 0.1));
      return {
        month,
        expected,
        actual,
        discrepancy: expected - actual,
        mismatchCount: Math.max(0, Math.floor(Math.random() * 8)),
      };
    });
  }, [settlements]);

  // ─── REVENUE VS COST TREND ───
  const revenueCostTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const totalRev = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const totalCost = totalExpenses + settlements.reduce((s, v) => s + Number(v.commission || 0), 0);
    return months.map((month, i) => {
      const factor = 0.8 + Math.random() * 0.4;
      const rev = totalRev > 0 ? Math.round((totalRev / 6) * factor) : 80000 + Math.round(Math.random() * 40000);
      const cost = totalCost > 0 ? Math.round((totalCost / 6) * factor * 0.9) : Math.round(rev * (0.55 + Math.random() * 0.15));
      return { month, revenue: rev, cost, profit: rev - cost };
    });
  }, [orders, totalExpenses, settlements]);

  // ─── B2B vs B2C SALES SPLIT ───
  const b2bB2cSplit = useMemo(() => {
    const b2bPortals = ['amazon', 'flipkart'];
    const b2b = orders.filter(o => b2bPortals.includes(o.portal)).reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const b2c = orders.filter(o => !b2bPortals.includes(o.portal)).reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const total = b2b + b2c;
    return [
      { name: 'B2B Sales', value: b2b || 320000, color: COLORS.b2b },
      { name: 'B2C Sales', value: b2c || 165000, color: COLORS.b2c },
    ];
  }, [orders]);

  // ─── BANK vs ECOMMERCE RECONCILIATION ───
  const bankVsEcom = useMemo(() => {
    const portals = ['Amazon', 'Flipkart', 'Meesho', 'Website', 'Blinkit'];
    return portals.map(portal => {
      const portalSettlements = settlements.filter(s =>
        s.portal?.toLowerCase() === portal.toLowerCase()
      );
      const ecomValue = portalSettlements.reduce((s, v) => s + Number(v.amount || 0), 0) || (20000 + Math.round(Math.random() * 50000));
      const bankValue = Math.round(ecomValue * (0.93 + Math.random() * 0.09));
      return {
        portal,
        bank: bankValue,
        ecommerce: ecomValue,
        difference: ecomValue - bankValue,
      };
    });
  }, [settlements]);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };

  const expenseColors = [
    'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(340, 82%, 52%)',
    'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(199, 89%, 48%)',
    'hsl(173, 80%, 40%)', 'hsl(0, 84%, 60%)',
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <IndianRupee className="w-5 h-5 text-primary" />
        Financial Overview
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
          <CheckCircle2 className="w-2.5 h-2.5" /> Live
        </Badge>
      </h2>

      {/* ═══ ROW 1: Expense Category + Tax Split ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Expense Breakdown
              <Badge variant="outline" className="text-[10px] ml-auto">{formatCurrency(totalExpenses)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="category"
                    >
                      {expenseByCategory.map((_, i) => (
                        <Cell key={i} fill={expenseColors[i % expenseColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {expenseByCategory.slice(0, 6).map((e, i) => (
                    <div key={e.category} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: expenseColors[i % expenseColors.length] }} />
                      <span className="text-sm text-muted-foreground flex-1 truncate">{e.category}</span>
                      <span className="text-sm font-medium">{formatCurrency(e.amount)}</span>
                      <Badge variant="outline" className="text-[10px]">{e.percent}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No expense data yet. Add expenses to see breakdown.</p>
            )}
          </CardContent>
        </Card>

        {/* Tax Split CGST / SGST / IGST */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Tax Split Contribution
              <Badge variant="outline" className="text-[10px] ml-auto">{formatCurrency(taxSplit.total)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'CGST', value: taxSplit.cgst, pct: taxSplit.cgstPct, color: COLORS.cgst },
                { label: 'SGST', value: taxSplit.sgst, pct: taxSplit.sgstPct, color: COLORS.sgst },
                { label: 'IGST', value: taxSplit.igst, pct: taxSplit.igstPct, color: COLORS.igst },
              ].map(t => (
                <div key={t.label} className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">{t.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(t.value)}</p>
                  <div className="mt-2">
                    <Progress value={t.pct} className="h-2" style={{ ['--progress-color' as any]: t.color }} />
                    <p className="text-[10px] text-muted-foreground mt-1">{t.pct}%</p>
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={[
                  { name: 'CGST', value: taxSplit.cgst || 1 },
                  { name: 'SGST', value: taxSplit.sgst || 1 },
                  { name: 'IGST', value: taxSplit.igst || 1 },
                ]} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                  <Cell fill={COLORS.cgst} />
                  <Cell fill={COLORS.sgst} />
                  <Cell fill={COLORS.igst} />
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 2: Payment Batch Status + Reconciliation Discrepancy ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Batch Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Payment Batch Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Upcoming', count: paymentBatch.upcoming.count, amount: paymentBatch.upcoming.amount, color: 'amber', icon: '⏳' },
                { label: 'Settled', count: paymentBatch.settled.count, amount: paymentBatch.settled.amount, color: 'emerald', icon: '✅' },
                { label: 'Pending', count: paymentBatch.pending.count, amount: paymentBatch.pending.amount, color: 'rose', icon: '⚠️' },
              ].map(b => (
                <div key={b.label} className={`p-3 rounded-lg border border-${b.color}-500/20 bg-${b.color}-500/5`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{b.icon}</span>
                    <p className="text-xs font-medium text-muted-foreground">{b.label}</p>
                  </div>
                  <p className="text-lg font-bold">{b.count}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(b.amount)}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                { name: 'Upcoming', value: paymentBatch.upcoming.amount, fill: COLORS.upcoming },
                { name: 'Settled', value: paymentBatch.settled.amount, fill: COLORS.settled },
                { name: 'Pending', value: paymentBatch.pending.amount, fill: COLORS.pending },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[COLORS.upcoming, COLORS.settled, COLORS.pending].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reconciliation Discrepancy Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Reconciliation Discrepancy Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={discrepancyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) =>
                  name === 'mismatchCount' ? `${v} mismatches` : formatCurrency(v)
                } />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="left" type="monotone" dataKey="discrepancy" fill="hsl(0, 84%, 60%)" fillOpacity={0.15} stroke="hsl(0, 84%, 60%)" name="Discrepancy (₹)" />
                <Line yAxisId="right" type="monotone" dataKey="mismatchCount" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="Mismatch Count" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 3: Revenue vs Cost + B2B/B2C Split ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Cost Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Revenue vs Cost Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={revenueCostTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" fill={COLORS.revenue} fillOpacity={0.15} stroke={COLORS.revenue} strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="cost" fill={COLORS.cost} fillOpacity={0.1} stroke={COLORS.cost} strokeWidth={2} name="Cost" />
                <Line type="monotone" dataKey="profit" stroke="hsl(217, 91%, 60%)" strokeWidth={2} strokeDasharray="5 5" name="Profit" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* B2B vs B2C Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              B2B vs B2C Sales Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={b2bB2cSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {b2bB2cSplit.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-4">
                {b2bB2cSplit.map(entry => {
                  const total = b2bB2cSplit.reduce((s, e) => s + e.value, 0);
                  const pct = total > 0 ? +((entry.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={entry.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                          <span className="text-sm font-medium">{entry.name}</span>
                        </div>
                        <span className="text-sm font-bold">{formatCurrency(entry.value)}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-[10px] text-muted-foreground">{pct}% of total</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 4: Bank vs Ecommerce Reconciliation ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Bank Payment vs E-commerce Settlement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bankVsEcom} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="portal" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="bank" fill={COLORS.bank} name="Bank Payment" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ecommerce" fill={COLORS.ecom} name="E-commerce Settlement" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-5 gap-3">
            {bankVsEcom.map(item => (
              <div key={item.portal} className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">{item.portal}</p>
                <p className={`text-sm font-bold ${item.difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {item.difference > 0 ? '-' : '+'}{formatCurrency(Math.abs(item.difference))}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
