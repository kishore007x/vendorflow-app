import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { reconciliationDb } from '@/services/database';
import { Portal } from '@/types';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Activity, Target, XCircle, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { DateFilter, ExportButton, useRowSelection, SelectAllCheckbox, RowCheckbox } from '@/components/TableEnhancements';
import ReconciliationHealthScore from '@/components/reconciliation/ReconciliationHealthScore';
import SettlementCycleTracker from '@/components/reconciliation/SettlementCycleTracker';
import ChargebackTracker from '@/components/reconciliation/ChargebackTracker';
import FeeVariationMonitor from '@/components/reconciliation/FeeVariationMonitor';
import SKUProfitabilityTrend from '@/components/reconciliation/SKUProfitabilityTrend';
import FinancialRiskAlerts from '@/components/reconciliation/FinancialRiskAlerts';
import { getReconciliationSettings, subscribeReconciliationSettings } from '@/services/reconciliationSettings';
import { GlobalDateFilter, type DateRange } from '@/components/GlobalDateFilter';

type ReconStatus = 'matched' | 'minor_difference' | 'mismatch';

interface ReconRecord {
  id: string;
  date: string;
  marketplace: Portal;
  orderId: string;
  orderItem: string;
  skuId: string;
  masterSku: string;
  batchId: string;
  expectedAmount: number;
  settledAmount: number;
  difference: number;
  expectedOrders: number;
  processedOrders: number;
  orderDifference: number;
  status: ReconStatus;
}

const daysAgo = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
};

const mapReconciliationRow = (row: any): ReconRecord => ({
  id: row.id || `${row.portal}-${row.date || row.created_at || Date.now()}`,
  date: row.date || row.created_at || new Date().toISOString(),
  marketplace: row.portal as Portal,
  orderId: row.order_id || row.reference_id || row.portal || '—',
  orderItem: row.notes || row.order_item || 'Reconciliation row',
  skuId: row.sku_id || row.product_id || '—',
  masterSku: row.master_sku || row.sku || '—',
  batchId: row.batch_id || row.reference_id || '—',
  expectedAmount: Number(row.expected_amount ?? row.expected_orders ?? 0),
  settledAmount: Number(row.settled_amount ?? row.processed_orders ?? 0),
  difference: Number(row.difference ?? 0),
  expectedOrders: Number(row.expected_orders ?? 0),
  processedOrders: Number(row.processed_orders ?? 0),
  orderDifference: Number(row.expected_orders ?? 0) - Number(row.processed_orders ?? 0),
  status: (row.status === 'matched' || row.status === 'minor_difference' || row.status === 'mismatch') ? row.status : 'mismatch',
});

const statusBadge = (status: ReconStatus) => {
  switch (status) {
    case 'matched':
      return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" /> Matched</Badge>;
    case 'minor_difference':
      return <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1"><AlertTriangle className="w-3 h-3" /> Minor Diff</Badge>;
    case 'mismatch':
      return <Badge variant="outline" className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1"><XCircle className="w-3 h-3" /> Mismatch</Badge>;
  }
};

export default function Reconciliation() {
  const [filterPortal, setFilterPortal] = useState<Portal | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [activeTab, setActiveTab] = useState('overview');
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [records, setRecords] = useState<ReconRecord[]>([]);

  // Get tolerance from shared settings
  const reconSettings = useSyncExternalStore(
    subscribeReconciliationSettings,
    getReconciliationSettings,
  );
  const tolerance = reconSettings.toleranceValue;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await reconciliationDb.getAll().catch(() => []);
        if (!mounted) return;
        setRecords((rows || []).map(mapReconciliationRow));
      } catch (error) {
        console.error('Failed to load reconciliation data', error);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Apply tolerance-based status reclassification
  const getEffectiveStatus = (record: ReconRecord): ReconStatus => {
    if (record.difference <= tolerance) return 'matched';
    if (record.difference <= 500) return 'minor_difference';
    return 'mismatch';
  };

  const filtered = useMemo(() => {
    const base = filterPortal === 'all' ? records : records.filter(r => r.marketplace === filterPortal);
    return base.map(r => ({ ...r, status: getEffectiveStatus(r) }));
  }, [filterPortal, tolerance, records]);

  const rowSelection = useRowSelection(filtered.map(r => r.id));

  const totalExpected = filtered.reduce((s, r) => s + r.expectedAmount, 0);
  const totalSettled = filtered.reduce((s, r) => s + r.settledAmount, 0);
  const totalDifference = filtered.reduce((s, r) => s + r.difference, 0);
  const matchedCount = filtered.filter(r => r.status === 'matched').length;
  const mismatchCount = filtered.filter(r => r.status === 'mismatch').length;
  const accuracy = totalExpected > 0 ? ((totalSettled / totalExpected) * 100).toFixed(1) : '100.0';

  const matchedPct = filtered.length > 0 ? (matchedCount / filtered.length) * 100 : 0;
  const mismatchPct = filtered.length > 0 ? (mismatchCount / filtered.length) * 100 : 0;

  const dateLabel = dateFilter === 'today' ? 'Today' : dateFilter === '7days' ? 'Last 7 Days' : dateFilter === '30days' ? 'Last 30 Days' : dateFilter === 'this_month' ? 'This Month' : dateFilter === 'this_year' ? 'This Year' : 'Custom';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reconciliation & Financial Risk</h1>
          <p className="text-muted-foreground">Proactive seller-loss prevention and settlement intelligence</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-primary/5 border-primary/20">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Tolerance: ₹{tolerance}
          </Badge>
          <GlobalDateFilter value={globalDateRange} onChange={setGlobalDateRange} />
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <Select value={filterPortal} onValueChange={(v) => setFilterPortal(v as Portal | 'all')}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Marketplaces" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Marketplaces</SelectItem>
              {getChannels().map(p => (<SelectItem key={p.id} value={p.id}><ChannelIcon channelId={p.id} fallbackIcon={p.icon} size={16} /> {p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <ExportButton label={rowSelection.count > 0 ? undefined : `Export – ${dateLabel}`} selectedCount={rowSelection.count} data={filtered} filename="reconciliation" />
        </div>
      </div>

      <ReconciliationHealthScore matchedPct={matchedPct} mismatchPct={mismatchPct} delayedPct={37.5} chargebackLossPct={4.2} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1.5 bg-muted/50 p-1.5">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Reconciliation Report</TabsTrigger>
          <TabsTrigger value="settlement-cycles" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">Settlement Cycles</TabsTrigger>
          <TabsTrigger value="chargebacks" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground data-[state=active]:shadow-sm">Chargebacks & Disputes</TabsTrigger>
          <TabsTrigger value="fee-variation" className="data-[state=active]:bg-info data-[state=active]:text-info-foreground data-[state=active]:shadow-sm">Fee Variation</TabsTrigger>
          <TabsTrigger value="sku-trends" className="data-[state=active]:bg-success data-[state=active]:text-success-foreground data-[state=active]:shadow-sm">SKU Profitability</TabsTrigger>
          <TabsTrigger value="risk-alerts" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground data-[state=active]:shadow-sm">Risk Alerts <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0 bg-destructive-foreground text-destructive">5</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Activity className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-sm text-muted-foreground">Records</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">₹{(totalExpected / 1000).toFixed(1)}K</p><p className="text-sm text-muted-foreground">Expected</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{matchedCount}</p><p className="text-sm text-muted-foreground">Matched</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><XCircle className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{mismatchCount}</p><p className="text-sm text-muted-foreground">Mismatches</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><TrendingDown className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">-₹{totalDifference.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Gap</p></div></div></CardContent></Card>
              <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Target className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold text-primary">{accuracy}%</p><p className="text-sm text-muted-foreground">Accuracy</p></div></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Report</CardTitle>
                <CardDescription>Order-level matching with SKU, batch, and amount details — mismatches highlighted in red</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10"><SelectAllCheckbox checked={rowSelection.isAllSelected} onCheckedChange={rowSelection.toggleAll} /></TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Order ID</TableHead>
                        <TableHead className="font-semibold">Order Item</TableHead>
                        <TableHead className="font-semibold">SKU ID</TableHead>
                        <TableHead className="font-semibold">Master SKU</TableHead>
                        <TableHead className="font-semibold">Batch ID</TableHead>
                        <TableHead className="font-semibold">Marketplace</TableHead>
                        <TableHead className="text-right font-semibold">Expected ₹</TableHead>
                        <TableHead className="text-right font-semibold">Settled ₹</TableHead>
                        <TableHead className="text-right font-semibold">Difference</TableHead>
                        <TableHead className="text-center font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((record) => {
                        const portal = getChannels().find(p => p.id === record.marketplace);
                        const isMismatch = record.status === 'mismatch';
                        return (
                          <TableRow key={record.id} className={`${isMismatch ? 'bg-rose-500/5' : record.status === 'minor_difference' ? 'bg-amber-500/5' : ''} ${rowSelection.isSelected(record.id) ? 'ring-1 ring-primary/30' : ''}`}>
                            <TableCell><RowCheckbox checked={rowSelection.isSelected(record.id)} onCheckedChange={() => rowSelection.toggle(record.id)} /></TableCell>
                            <TableCell className="font-medium">{format(new Date(record.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="font-medium">{record.orderId}</TableCell>
                            <TableCell className="text-sm">{record.orderItem}</TableCell>
                            <TableCell className="font-mono text-xs">{record.skuId}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{record.masterSku}</TableCell>
                            <TableCell className="font-mono text-xs">{record.batchId}</TableCell>
                            <TableCell><span className="flex items-center gap-1.5 text-sm"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</span></TableCell>
                            <TableCell className="text-right font-medium">₹{record.expectedAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">₹{record.settledAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {record.difference === 0 ? (
                                <span className="text-muted-foreground">₹0</span>
                              ) : (
                                <span className="font-bold text-rose-600">-₹{record.difference.toLocaleString()}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{statusBadge(record.status)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {filtered.length === 0 && <TableRow><TableCell colSpan={12} className="text-center py-6 text-muted-foreground">No reconciliation records found</TableCell></TableRow>}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={8}>Totals</TableCell>
                        <TableCell className="text-right">₹{totalExpected.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{totalSettled.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-rose-600">-₹{totalDifference.toLocaleString()}</TableCell>
                        <TableCell className="text-center"><span className="text-sm text-muted-foreground">{accuracy}%</span></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settlement-cycles">
          <SettlementCycleTracker />
        </TabsContent>

        <TabsContent value="chargebacks">
          <ChargebackTracker />
        </TabsContent>

        <TabsContent value="fee-variation">
          <FeeVariationMonitor />
        </TabsContent>

        <TabsContent value="sku-trends">
          <SKUProfitabilityTrend />
        </TabsContent>

        <TabsContent value="risk-alerts">
          <FinancialRiskAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
