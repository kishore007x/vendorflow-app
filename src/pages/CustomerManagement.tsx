import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { customersDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, Search, Download, Eye, AlertTriangle, ShieldAlert, UserCheck, UserPlus,
  MapPin, Package, RotateCcw, TrendingUp, Loader2, Globe, BarChart3, Map,
  Ban, ShieldCheck, MessageSquare, FileSpreadsheet, ShoppingCart, UserX, Megaphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FRAUD_THRESHOLD = 30;
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#6366f1', '#f59e0b', '#14b8a6',
];

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof ShoppingCart; color: string }> = {
  ecommerce: { label: 'Orders', icon: ShoppingCart, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  orders: { label: 'Orders', icon: ShoppingCart, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  leads: { label: 'Leads', icon: Megaphone, color: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  excel_upload: { label: 'Excel Upload', icon: FileSpreadsheet, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  manual: { label: 'Manual', icon: UserPlus, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  messages: { label: 'Messages/Chat', icon: MessageSquare, color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  chat: { label: 'Chat', icon: MessageSquare, color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
};

const getSourceConfig = (source: string) => SOURCE_CONFIG[source] || { label: source || 'Unknown', icon: Users, color: 'bg-muted text-muted-foreground border-border' };

export default function CustomerManagement() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [blockDialog, setBlockDialog] = useState<{ customer: any; action: 'block' | 'unblock' } | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customersDb.getAll(search ? { search } : undefined);
      setCustomers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const enriched = useMemo(() => customers.map(c => {
    const returnRate = c.total_orders > 0 ? (c.total_returns / c.total_orders) * 100 : 0;
    return {
      ...c,
      returnRate,
      isRepeat: c.total_orders > 1,
      isFraudRisk: returnRate >= FRAUD_THRESHOLD,
      customerType: c.is_blocked ? 'blocked' : c.total_orders > 5 ? 'loyal' : c.total_orders > 1 ? 'repeat' : 'new',
    };
  }), [customers]);

  const filtered = useMemo(() => enriched.filter(c => {
    const matchType = typeFilter === 'all'
      || (typeFilter === 'blocked' ? c.is_blocked : false)
      || (typeFilter === 'repeat' ? c.isRepeat && !c.is_blocked : false)
      || (typeFilter === 'new' ? !c.isRepeat && !c.is_blocked : false)
      || (typeFilter === 'loyal' ? c.customerType === 'loyal' : false);
    const matchRisk = riskFilter === 'all' || (riskFilter === 'fraud' ? c.isFraudRisk : !c.isFraudRisk);
    const matchChannel = channelFilter === 'all' || (c.channels && c.channels.includes(channelFilter));
    const matchState = stateFilter === 'all' || c.state === stateFilter;
    const matchSource = sourceFilter === 'all' || c.source === sourceFilter;
    return matchType && matchRisk && matchChannel && matchState && matchSource;
  }), [enriched, typeFilter, riskFilter, channelFilter, stateFilter, sourceFilter]);

  const stats = useMemo(() => ({
    total: enriched.length,
    repeat: enriched.filter(c => c.isRepeat && !c.is_blocked).length,
    newCust: enriched.filter(c => !c.isRepeat && !c.is_blocked).length,
    loyal: enriched.filter(c => c.customerType === 'loyal').length,
    fraudRisk: enriched.filter(c => c.isFraudRisk).length,
    blocked: enriched.filter(c => c.is_blocked).length,
    totalRevenue: enriched.reduce((s, c) => s + Number(c.total_spent || 0), 0),
  }), [enriched]);

  // Source breakdown
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    enriched.forEach(c => {
      const src = c.source || 'unknown';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: getSourceConfig(name).label, value })).sort((a, b) => b.value - a.value);
  }, [enriched]);

  const allSources = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach(c => { if (c.source) set.add(c.source); });
    return Array.from(set).sort();
  }, [enriched]);

  // Geographic data
  const geoData = useMemo(() => {
    const stateMap: Record<string, { count: number; revenue: number; orders: number }> = {};
    const cityMap: Record<string, { count: number; revenue: number }> = {};
    const pincodeMap: Record<string, number> = {};

    enriched.forEach(c => {
      const st = c.state || 'Unknown';
      if (!stateMap[st]) stateMap[st] = { count: 0, revenue: 0, orders: 0 };
      stateMap[st].count += 1;
      stateMap[st].revenue += Number(c.total_spent || 0);
      stateMap[st].orders += Number(c.total_orders || 0);

      const ct = c.city || 'Unknown';
      if (!cityMap[ct]) cityMap[ct] = { count: 0, revenue: 0 };
      cityMap[ct].count += 1;
      cityMap[ct].revenue += Number(c.total_spent || 0);

      if (c.pincode) pincodeMap[c.pincode] = (pincodeMap[c.pincode] || 0) + 1;
    });

    const stateData = Object.entries(stateMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const cityData = Object.entries(cityMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topPincodes = Object.entries(pincodeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pin, count]) => ({ pin, count }));

    const uniqueStates = Object.keys(stateMap).filter(s => s !== 'Unknown').sort();

    return { stateData, cityData, topPincodes, uniqueStates };
  }, [enriched]);

  // Channel breakdown
  const channelData = useMemo(() => {
    const map: Record<string, number> = {};
    enriched.forEach(c => {
      (c.channels || []).forEach((ch: string) => {
        map[ch] = (map[ch] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [enriched]);

  const allChannels = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach(c => (c.channels || []).forEach((ch: string) => set.add(ch)));
    return Array.from(set).sort();
  }, [enriched]);

  // Customer type pie data
  const typePie = useMemo(() => [
    { name: 'Loyal (5+ orders)', value: stats.loyal },
    { name: 'Repeat (2-5 orders)', value: stats.repeat - stats.loyal },
    { name: 'New (1 order)', value: stats.newCust },
    { name: 'Blocked', value: stats.blocked },
  ].filter(d => d.value > 0), [stats]);

  const handleBlockUnblock = async () => {
    if (!blockDialog) return;
    const { customer, action } = blockDialog;
    const isBlocking = action === 'block';

    try {
      const { error } = await supabase.from('customers').update({
        is_blocked: isBlocking,
        block_reason: isBlocking ? blockReason : null,
        blocked_at: isBlocking ? new Date().toISOString() : null,
      }).eq('id', customer.id);

      if (error) throw error;

      toast({ title: isBlocking ? 'Customer Blocked' : 'Customer Unblocked', description: `${customer.name} has been ${isBlocking ? 'added to blocklist' : 'removed from blocklist'}` });
      setBlockDialog(null);
      setBlockReason('');
      fetchCustomers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'City', 'State', 'Pincode', 'Address', 'Orders', 'Returns', 'Spent', 'Type', 'Risk', 'Source', 'Channels', 'Blocked'];
    const rows = filtered.map(c => [
      c.name, c.email, c.phone, c.city, c.state, c.pincode, c.address,
      c.total_orders, c.total_returns, c.total_spent,
      c.customerType, c.isFraudRisk ? 'High Risk' : 'Safe',
      c.source || '', (c.channels || []).join('; '), c.is_blocked ? 'Yes' : 'No',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filtered.length} customers exported to CSV` });
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">Track customers, source segregation, segmentation & blocklist management</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}><Download className="w-4 h-4" />Export CSV</Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        {[
          { icon: Users, label: 'Total Customers', value: stats.total, color: 'text-primary' },
          { icon: UserCheck, label: 'Repeat Buyers', value: stats.repeat, color: 'text-emerald-600' },
          { icon: UserPlus, label: 'New Customers', value: stats.newCust, color: 'text-blue-600' },
          { icon: TrendingUp, label: 'Loyal (5+)', value: stats.loyal, color: 'text-violet-600' },
          { icon: ShieldAlert, label: 'Fraud Risk', value: stats.fraudRisk, color: 'text-rose-600' },
          { icon: Ban, label: 'Blocked', value: stats.blocked, color: 'text-rose-700' },
          { icon: Globe, label: 'Total Revenue', value: fmt(stats.totalRevenue), color: 'text-primary' },
        ].map((kpi, i) => (
          <Card key={i} className={kpi.label === 'Blocked' && stats.blocked > 0 ? 'border-rose-500/30 bg-rose-500/5' : ''}>
            <CardContent className="pt-5 pb-4">
              <kpi.icon className={`w-4 h-4 ${kpi.color} mb-1`} />
              <p className={`text-xl font-bold ${typeof kpi.value === 'number' ? kpi.color : ''}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" className="gap-1.5"><Users className="w-4 h-4" />Customer Database</TabsTrigger>
          <TabsTrigger value="geo" className="gap-1.5"><Map className="w-4 h-4" />Geographic Insights</TabsTrigger>
          <TabsTrigger value="analysis" className="gap-1.5"><BarChart3 className="w-4 h-4" />Customer Analysis</TabsTrigger>
        </TabsList>

        {/* Tab 1: Customer Database */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search name, email, pincode, state..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="repeat">Repeat</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="loyal">Loyal</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="fraud">Fraud Risk</SelectItem>
                    <SelectItem value="safe">Safe</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {allSources.map(s => <SelectItem key={s} value={s}>{getSourceConfig(s).label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {allChannels.map(ch => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {geoData.uniqueStates.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No customers found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Source</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold text-center">Orders</TableHead>
                        <TableHead className="font-semibold text-center">Returns</TableHead>
                        <TableHead className="font-semibold text-center">Return%</TableHead>
                        <TableHead className="font-semibold text-right">Spent</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Risk</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(c => {
                        const srcCfg = getSourceConfig(c.source);
                        const SrcIcon = srcCfg.icon;
                        return (
                          <TableRow key={c.id} className={c.is_blocked ? 'bg-rose-500/5 opacity-75' : ''}>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                {c.is_blocked && <Ban className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />}
                                <div>
                                  <p className={`font-medium ${c.is_blocked ? 'line-through text-muted-foreground' : ''}`}>{c.name}</p>
                                  <p className="text-xs text-muted-foreground">{c.email}</p>
                                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${srcCfg.color} gap-1 text-[10px]`}>
                                <SrcIcon className="w-3 h-3" />{srcCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{c.total_orders}</TableCell>
                            <TableCell className="text-center">{c.total_returns}</TableCell>
                            <TableCell className="text-center">
                              <span className={c.returnRate >= FRAUD_THRESHOLD ? 'text-rose-600 font-semibold' : ''}>{c.returnRate.toFixed(0)}%</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{fmt(Number(c.total_spent || 0))}</TableCell>
                            <TableCell>
                              {c.is_blocked ? (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/30 gap-1">
                                  <Ban className="w-3 h-3" />Blocked
                                </Badge>
                              ) : (
                                <Badge variant="outline" className={
                                  c.customerType === 'loyal'
                                    ? 'bg-violet-500/10 text-violet-600 border-violet-500/30'
                                    : c.isRepeat
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                      : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                }>
                                  {c.customerType === 'loyal' ? 'Loyal' : c.isRepeat ? 'Repeat' : 'New'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {c.isFraudRisk ? (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1"><AlertTriangle className="w-3 h-3" />High</Badge>
                              ) : <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Safe</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setSelected(c)}><Eye className="w-4 h-4" /></Button>
                                {c.is_blocked ? (
                                  <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setBlockDialog({ customer: c, action: 'unblock' }); setBlockReason(''); }}>
                                    <ShieldCheck className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => { setBlockDialog({ customer: c, action: 'block' }); setBlockReason(''); }}>
                                    <UserX className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="p-3 border-t text-xs text-muted-foreground">Showing {filtered.length} of {enriched.length} customers</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Geographic Insights */}
        <TabsContent value="geo">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">State-wise Revenue (Top 10)</CardTitle></CardHeader>
              <CardContent>
                {geoData.stateData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No geographic data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={geoData.stateData} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={75} fontSize={11} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">City-wise Customers (Top 10)</CardTitle></CardHeader>
              <CardContent>
                {geoData.cityData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No city data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={geoData.cityData} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" fontSize={11} />
                      <YAxis type="category" dataKey="name" width={75} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">State-wise Distribution</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">State</TableHead>
                      <TableHead className="font-semibold text-center">Customers</TableHead>
                      <TableHead className="font-semibold text-center">Orders</TableHead>
                      <TableHead className="font-semibold text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geoData.stateData.map(s => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-center">{s.count}</TableCell>
                        <TableCell className="text-center">{s.orders}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(s.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Pincodes by Customer Count</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Pincode</TableHead>
                      <TableHead className="font-semibold text-center">Customers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geoData.topPincodes.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No pincode data</TableCell></TableRow>
                    ) : geoData.topPincodes.map(p => (
                      <TableRow key={p.pin}>
                        <TableCell className="font-mono font-medium">{p.pin}</TableCell>
                        <TableCell className="text-center">{p.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Customer Analysis */}
        <TabsContent value="analysis">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Type Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">Customer Type Distribution</CardTitle></CardHeader>
              <CardContent>
                {typePie.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={typePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {typePie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Source-wise Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Customer Source Distribution</CardTitle></CardHeader>
              <CardContent>
                {sourceData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No source data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={sourceData}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Channel-wise Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Channel-wise Customer Distribution</CardTitle></CardHeader>
              <CardContent>
                {channelData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No channel data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={channelData}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Blocked Customers */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ban className="w-4 h-4 text-rose-700" />Blocked Customers ({stats.blocked})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {enriched.filter(c => c.is_blocked).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No blocked customers</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                        <TableHead className="font-semibold">Blocked On</TableHead>
                        <TableHead className="font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enriched.filter(c => c.is_blocked).map(c => (
                        <TableRow key={c.id}>
                          <TableCell><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.block_reason || '—'}</TableCell>
                          <TableCell className="text-sm">{c.blocked_at ? new Date(c.blocked_at).toLocaleDateString('en-IN') : '—'}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" className="text-emerald-600 gap-1" onClick={() => { setBlockDialog({ customer: c, action: 'unblock' }); setBlockReason(''); }}>
                              <ShieldCheck className="w-3 h-3" />Unblock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Fraud Risk Summary */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-600" />High Risk Customers (Return Rate ≥ {FRAUD_THRESHOLD}%)</CardTitle></CardHeader>
              <CardContent className="p-0">
                {enriched.filter(c => c.isFraudRisk).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No fraud risk customers detected</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold text-center">Orders</TableHead>
                        <TableHead className="font-semibold text-center">Returns</TableHead>
                        <TableHead className="font-semibold text-center">Return%</TableHead>
                        <TableHead className="font-semibold text-right">Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enriched.filter(c => c.isFraudRisk).sort((a, b) => b.returnRate - a.returnRate).slice(0, 10).map(c => (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(c)}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {c.is_blocked && <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                              <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</TableCell>
                          <TableCell className="text-center">{c.total_orders}</TableCell>
                          <TableCell className="text-center text-rose-600 font-semibold">{c.total_returns}</TableCell>
                          <TableCell className="text-center text-rose-600 font-bold">{c.returnRate.toFixed(0)}%</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(Number(c.total_spent || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Repeat Buyers */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-600" />Top Repeat Buyers</CardTitle></CardHeader>
              <CardContent className="p-0">
                {enriched.filter(c => c.isRepeat).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No repeat buyers yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold text-center">Orders</TableHead>
                        <TableHead className="font-semibold text-right">Total Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enriched.filter(c => c.isRepeat).sort((a, b) => b.total_orders - a.total_orders).slice(0, 10).map(c => (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(c)}>
                          <TableCell><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></TableCell>
                          <TableCell className="text-sm">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{c.total_orders}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(Number(c.total_spent || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{selected?.is_blocked && <Ban className="w-5 h-5 text-rose-600" />}{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {selected.is_blocked ? (
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/30 gap-1"><Ban className="w-3 h-3" />Blocked</Badge>
                ) : (
                  <Badge variant="outline" className={
                    selected.customerType === 'loyal'
                      ? 'bg-violet-500/10 text-violet-600 border-violet-500/30'
                      : selected.isRepeat
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                  }>
                    {selected.customerType === 'loyal' ? 'Loyal Customer' : selected.isRepeat ? 'Repeat Buyer' : 'New Customer'}
                  </Badge>
                )}
                {selected.isFraudRisk && (
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1"><AlertTriangle className="w-3 h-3" />Fraud Risk ({selected.returnRate.toFixed(0)}%)</Badge>
                )}
                {(() => {
                  const cfg = getSourceConfig(selected.source);
                  const Icon = cfg.icon;
                  return <Badge variant="outline" className={`${cfg.color} gap-1`}><Icon className="w-3 h-3" />Source: {cfg.label}</Badge>;
                })()}
              </div>

              {selected.is_blocked && selected.block_reason && (
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3">
                  <p className="text-xs font-semibold text-rose-700 mb-1">Block Reason</p>
                  <p className="text-sm text-rose-600">{selected.block_reason}</p>
                  {selected.blocked_at && <p className="text-xs text-muted-foreground mt-1">Blocked on {new Date(selected.blocked_at).toLocaleDateString('en-IN')}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selected.email || '—'}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.phone || '—'}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium">{selected.address || '—'}</p></div>
                <div><p className="text-muted-foreground">City</p><p className="font-medium">{selected.city || '—'}</p></div>
                <div><p className="text-muted-foreground">State</p><p className="font-medium">{selected.state || '—'}</p></div>
                <div><p className="text-muted-foreground">Pincode</p><p className="font-mono font-medium">{selected.pincode || '—'}</p></div>
                <div>
                  <p className="text-muted-foreground">Channels</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(selected.channels || []).length > 0
                      ? selected.channels.map((ch: string) => <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>)
                      : <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <Card><CardContent className="pt-4 pb-3 text-center"><Package className="w-5 h-5 mx-auto mb-1 text-primary" /><p className="text-lg font-bold">{selected.total_orders}</p><p className="text-xs text-muted-foreground">Orders</p></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3 text-center"><RotateCcw className="w-5 h-5 mx-auto mb-1 text-amber-600" /><p className="text-lg font-bold">{selected.total_returns}</p><p className="text-xs text-muted-foreground">Returns</p></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3 text-center"><AlertTriangle className="w-5 h-5 mx-auto mb-1 text-rose-600" /><p className="text-lg font-bold">{selected.returnRate.toFixed(0)}%</p><p className="text-xs text-muted-foreground">Return Rate</p></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3 text-center"><TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-600" /><p className="text-lg font-bold">{fmt(Number(selected.total_spent || 0))}</p><p className="text-xs text-muted-foreground">Spent</p></CardContent></Card>
              </div>

              {selected.first_order_date && (
                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
                  <div><p className="text-muted-foreground">First Order</p><p className="font-medium">{new Date(selected.first_order_date).toLocaleDateString('en-IN')}</p></div>
                  <div><p className="text-muted-foreground">Last Order</p><p className="font-medium">{selected.last_order_date ? new Date(selected.last_order_date).toLocaleDateString('en-IN') : '—'}</p></div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                {selected.is_blocked ? (
                  <Button variant="outline" className="gap-1 text-emerald-600" onClick={() => { setSelected(null); setBlockDialog({ customer: selected, action: 'unblock' }); setBlockReason(''); }}>
                    <ShieldCheck className="w-4 h-4" />Unblock Customer
                  </Button>
                ) : (
                  <Button variant="outline" className="gap-1 text-rose-600" onClick={() => { setSelected(null); setBlockDialog({ customer: selected, action: 'block' }); setBlockReason(''); }}>
                    <UserX className="w-4 h-4" />Block Customer
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block/Unblock Dialog */}
      <Dialog open={!!blockDialog} onOpenChange={open => !open && setBlockDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {blockDialog?.action === 'block' ? <><Ban className="w-5 h-5 text-rose-600" />Block Customer</> : <><ShieldCheck className="w-5 h-5 text-emerald-600" />Unblock Customer</>}
            </DialogTitle>
          </DialogHeader>
          {blockDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {blockDialog.action === 'block'
                  ? `Are you sure you want to block "${blockDialog.customer.name}"? They will be marked in the blocklist.`
                  : `Remove "${blockDialog.customer.name}" from the blocklist?`}
              </p>
              {blockDialog.action === 'block' && (
                <div>
                  <label className="text-sm font-medium">Reason for blocking</label>
                  <Textarea placeholder="e.g. Excessive returns, suspected fraud..." value={blockReason} onChange={e => setBlockReason(e.target.value)} className="mt-1" />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setBlockDialog(null)}>Cancel</Button>
                <Button
                  variant={blockDialog.action === 'block' ? 'destructive' : 'default'}
                  onClick={handleBlockUnblock}
                  disabled={blockDialog.action === 'block' && !blockReason.trim()}
                >
                  {blockDialog.action === 'block' ? 'Block' : 'Unblock'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
