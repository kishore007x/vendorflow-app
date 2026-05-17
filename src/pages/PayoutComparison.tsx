import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, IndianRupee, TrendingUp, TrendingDown, BarChart3, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { settlementsDb, ordersDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function PayoutComparison() {
  const channels = getChannels();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'30' | '60' | '90' | 'all'>('30');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, o] = await Promise.all([settlementsDb.getAll(), ordersDb.getAll()]);
      setSettlements(s);
      setOrders(o);
      setLoading(false);
    }
    load();
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoff = period === 'all' ? null : new Date(now.getTime() - Number(period) * 86400000);

    const filteredOrders = cutoff
      ? orders.filter(o => new Date(o.order_date) >= cutoff)
      : orders;

    const filteredSettlements = cutoff
      ? settlements.filter(s => new Date(s.created_at) >= cutoff)
      : settlements;

    return { orders: filteredOrders, settlements: filteredSettlements };
  }, [orders, settlements, period]);

  // Per-portal aggregation
  const portalData = useMemo(() => {
    return channels.map(ch => {
      const portalOrders = filteredData.orders.filter(o => o.portal === ch.id);
      const portalSettlements = filteredData.settlements.filter(s => s.portal === ch.id);

      const totalOrders = portalOrders.length;
      const totalRevenue = portalOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const totalCommission = portalOrders.reduce((sum, o) => sum + Number(o.commission || 0), 0);
      const totalShipping = portalOrders.reduce((sum, o) => sum + Number(o.shipping_fee || 0), 0);
      const totalSettled = portalSettlements.reduce((sum, s) => sum + Number(s.net_amount || 0), 0);
      const totalGross = portalSettlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      const totalTax = portalSettlements.reduce((sum, s) => sum + Number(s.tax || 0), 0);
      const settlementCommission = portalSettlements.reduce((sum, s) => sum + Number(s.commission || 0), 0);

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const effectiveCommissionRate = totalRevenue > 0 ? ((totalCommission + settlementCommission) / (totalRevenue || 1)) * 100 : 0;
      const payoutRatio = totalGross > 0 ? (totalSettled / totalGross) * 100 : 0;
      const netPerOrder = totalOrders > 0 ? totalSettled / totalOrders : 0;
      const deductionsPerOrder = totalOrders > 0 ? (totalCommission + totalShipping + totalTax) / totalOrders : 0;

      return {
        portal: ch,
        totalOrders,
        totalRevenue,
        totalCommission: totalCommission + settlementCommission,
        totalShipping,
        totalTax,
        totalSettled,
        totalGross,
        avgOrderValue,
        effectiveCommissionRate,
        payoutRatio,
        netPerOrder,
        deductionsPerOrder,
      };
    }).filter(d => d.totalOrders > 0 || d.totalSettled > 0);
  }, [filteredData, channels]);

  // Chart data
  const chartData = useMemo(() => {
    return portalData.map(d => ({
      name: d.portal.name,
      icon: d.portal.icon,
      Revenue: Math.round(d.totalRevenue),
      Settled: Math.round(d.totalSettled),
      Commission: Math.round(d.totalCommission),
      Shipping: Math.round(d.totalShipping),
      color: d.portal.color,
    }));
  }, [portalData]);

  const bestPayout = portalData.length > 0
    ? portalData.reduce((a, b) => a.payoutRatio > b.payoutRatio ? a : b)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowUpDown className="w-6 h-6 text-primary" />
            Payout Comparison
          </h1>
          <p className="text-muted-foreground">Compare net payouts and profitability across all marketplaces</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="60">Last 60 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Total Revenue</div>
            <div className="text-xl font-bold text-foreground mt-1">
              ₹{portalData.reduce((s, d) => s + d.totalRevenue, 0).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Total Settled</div>
            <div className="text-xl font-bold text-emerald-500 mt-1">
              ₹{portalData.reduce((s, d) => s + d.totalSettled, 0).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Total Deductions</div>
            <div className="text-xl font-bold text-destructive mt-1">
              ₹{portalData.reduce((s, d) => s + d.totalCommission + d.totalShipping + d.totalTax, 0).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Best Payout Ratio</div>
            <div className="text-xl font-bold text-primary mt-1">
              {bestPayout ? <><ChannelIcon channelId={bestPayout.portal.id} fallbackIcon={bestPayout.portal.icon} size={20} /> {bestPayout.payoutRatio.toFixed(1)}%</> : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Detailed Table</TabsTrigger>
          <TabsTrigger value="chart">Visual Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardContent className="pt-4">
              {portalData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No order or settlement data found for this period.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Portal</TableHead>
                      <TableHead className="text-right font-semibold">Orders</TableHead>
                      <TableHead className="text-right font-semibold">Gross Revenue</TableHead>
                      <TableHead className="text-right font-semibold">Commission</TableHead>
                      <TableHead className="text-right font-semibold">Shipping</TableHead>
                      <TableHead className="text-right font-semibold">Tax</TableHead>
                      <TableHead className="text-right font-semibold">Net Settled</TableHead>
                      <TableHead className="text-right font-semibold">Payout %</TableHead>
                      <TableHead className="text-right font-semibold">Avg/Order</TableHead>
                      <TableHead className="text-center font-semibold">Verdict</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portalData
                      .sort((a, b) => b.payoutRatio - a.payoutRatio)
                      .map((d, idx) => (
                      <TableRow key={d.portal.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <ChannelIcon channelId={d.portal.id} fallbackIcon={d.portal.icon} size={16} />
                          {d.portal.name}
                          {idx === 0 && <Badge className="ml-2 text-[10px]" variant="default">Best</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{d.totalOrders}</TableCell>
                        <TableCell className="text-right">₹{d.totalRevenue.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right text-destructive">₹{d.totalCommission.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right text-destructive">₹{d.totalShipping.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right text-destructive">₹{d.totalTax.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-500">₹{d.totalSettled.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={d.payoutRatio >= 80 ? 'default' : d.payoutRatio >= 60 ? 'secondary' : 'destructive'}>
                            {d.payoutRatio.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">₹{d.netPerOrder.toFixed(0)}</TableCell>
                        <TableCell className="text-center">
                          {d.payoutRatio >= 75 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                          ) : d.payoutRatio >= 50 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 inline" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-destructive inline" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue vs Settlement by Portal</CardTitle>
              <CardDescription>Visual comparison of gross revenue and net payout across platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, undefined]}
                    />
                    <Legend />
                    <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Settled" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Commission" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No data to display</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
