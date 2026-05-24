import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Download, ShieldAlert, History, TrendingDown, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PriceAuditItem {
  skuId: string;
  productName: string;
  portal: string;
  mrp: number;
  sellingPrice: number;
  portalSellingPrice: number;
  expectedMarginPct: number;
  actualMarginPct: number;
  lastAuditDate: string;
  previousMarginPct: number;
}

interface AuditLogEntry {
  id: string;
  skuId: string;
  productName: string;
  portal: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  marginImpact: number;
  severity: 'warning' | 'critical' | 'info';
}

const mockAuditData: PriceAuditItem[] = [];
const mockAuditLog: AuditLogEntry[] = [];

const MARGIN_DROP_THRESHOLD = 3; // percentage points

type SortField = 'productName' | 'mrp' | 'sellingPrice' | 'portalSellingPrice' | 'expectedMarginPct' | 'actualMarginPct' | 'marginDrop';
type SortDir = 'asc' | 'desc';

const portals = ['All', 'Amazon', 'Flipkart', 'Meesho', 'FirstCry', 'Blinkit'];

export default function PriceAuditEngine() {
  const { toast } = useToast();
  const [products, setProducts] = useState<PriceAuditItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [portalFilter, setPortalFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('marginDrop');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activeView, setActiveView] = useState<'audit' | 'log'>('audit');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const prods = await db.productsDb.getAll();
        if (!mounted) return;
        const mapped = (prods || []).map((p: any) => ({
          skuId: p.sku || p.sku_id || p.id || 'SKU-UNK',
          productName: p.name || p.title || p.product_name || 'Unnamed',
          portal: p.portal || 'FirstCry',
          mrp: Number(p.mrp || p.list_price || 0),
          sellingPrice: Number(p.price || p.selling_price || 0),
          portalSellingPrice: Number(p.portal_price || p.market_price || p.price || 0),
          expectedMarginPct: Number(p.expected_margin_pct || p.expectedMargin || 30),
          actualMarginPct: Number(p.actual_margin_pct || p.margin || 25),
          lastAuditDate: p.last_audit || p.updated_at || '',
          previousMarginPct: Number(p.previous_margin_pct || 0),
        }));
        setProducts(mapped);
        // try to load audit logs if table exists
        try {
          const logs = await db.activityLogsDb.getAll({ module: 'price_audit', limit: 200 });
          if (mounted && Array.isArray(logs)) {
            setAuditLog(logs.map((l: any, i: number) => ({
              id: l.id || `log-${i}`,
              skuId: l.sku || l.sku_id || l.data?.sku || 'SKU-UNK',
              productName: l.product_name || l.data?.productName || '',
              portal: l.portal || 'FirstCry',
              timestamp: l.created_at || l.timestamp || '',
              field: l.field || l.action || 'update',
              oldValue: l.old || l.data?.old || '',
              newValue: l.new || l.data?.new || '',
              marginImpact: Number(l.marginImpact || 0),
              severity: l.severity || 'info',
            })));
          }
        } catch (e) {
          // ignore if no logs
        }
      } catch (e) {
        console.debug('price audit load failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const dataSource = products.length ? products : mockAuditData;
  const auditLogSource = auditLog.length ? auditLog : mockAuditLog;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const filteredData = useMemo(() => {
    const data = portalFilter === 'All' ? dataSource : dataSource.filter(i => i.portal === portalFilter);

    const getValue = (item: PriceAuditItem, field: SortField): number | string => {
      if (field === 'marginDrop') return item.expectedMarginPct - item.actualMarginPct;
      return item[field];
    };

    return [...data].sort((a, b) => {
      const aVal = getValue(a, sortField);
      const bVal = getValue(b, sortField);
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [portalFilter, sortField, sortDir]);

  const marginDropItems = filteredData.filter(i => (i.expectedMarginPct - i.actualMarginPct) >= MARGIN_DROP_THRESHOLD);
  const criticalLogs = auditLogSource.filter(l => l.severity === 'critical');

  const handleExport = () => {
    toast({ title: 'Audit Report Exported', description: `Exported ${activeView === 'audit' ? filteredData.length + ' audit entries' : mockAuditLog.length + ' log entries'} to Excel` });
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {marginDropItems.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-700">Margin Drop Alert</p>
              <p className="text-sm text-muted-foreground">{marginDropItems.length} product(s) showing margin drop ≥{MARGIN_DROP_THRESHOLD}% from expected. {criticalLogs.length} critical audit log entries require review.</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1 border-amber-500/30 text-amber-700 hover:bg-amber-500/10" onClick={() => setActiveView('log')}>
              <History className="w-3.5 h-3.5" />View Log
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={portalFilter} onValueChange={setPortalFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Portal" /></SelectTrigger>
          <SelectContent>{portals.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button variant={activeView === 'audit' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveView('audit')}>Audit Table</Button>
          <Button variant={activeView === 'log' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveView('log')} className="gap-1"><History className="w-3.5 h-3.5" />Audit Log</Button>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}><Download className="w-3.5 h-3.5" />Export Audit Report</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ShieldAlert className="w-5 h-5 text-primary" /></div><div><p className="text-xl font-bold">{filteredData.length}</p><p className="text-xs text-muted-foreground">Products Audited</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="w-5 h-5 text-destructive" /></div><div><p className="text-xl font-bold text-destructive">{marginDropItems.length}</p><p className="text-xs text-muted-foreground">Margin Drops</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-xl font-bold text-amber-600">{filteredData.filter(i => i.sellingPrice !== i.portalSellingPrice).length}</p><p className="text-xs text-muted-foreground">Price Mismatches</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xl font-bold text-emerald-600">{filteredData.filter(i => (i.expectedMarginPct - i.actualMarginPct) < MARGIN_DROP_THRESHOLD).length}</p><p className="text-xs text-muted-foreground">Healthy Margins</p></div></div></CardContent></Card>
      </div>

      {activeView === 'audit' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Price Audit Table</CardTitle>
            <CardDescription>Track MRP, Selling Price, Portal Price & Expected Margin — click headers to sort</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => handleSort('productName')}>
                      <span className="flex items-center">Product<SortIcon field="productName" /></span>
                    </TableHead>
                    <TableHead className="font-semibold">SKU ID</TableHead>
                    <TableHead className="font-semibold">Portal</TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('mrp')}>
                      <span className="flex items-center justify-end">MRP<SortIcon field="mrp" /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('sellingPrice')}>
                      <span className="flex items-center justify-end">Selling Price<SortIcon field="sellingPrice" /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('portalSellingPrice')}>
                      <span className="flex items-center justify-end">Portal Price<SortIcon field="portalSellingPrice" /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('expectedMarginPct')}>
                      <span className="flex items-center justify-end">Expected %<SortIcon field="expectedMarginPct" /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('actualMarginPct')}>
                      <span className="flex items-center justify-end">Actual %<SortIcon field="actualMarginPct" /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('marginDrop')}>
                      <span className="flex items-center justify-end">Drop<SortIcon field="marginDrop" /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(item => {
                    const drop = item.expectedMarginPct - item.actualMarginPct;
                    const priceMismatch = item.sellingPrice !== item.portalSellingPrice;
                    const isDropping = drop >= MARGIN_DROP_THRESHOLD;
                    return (
                      <TableRow key={item.skuId} className={isDropping ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium text-sm max-w-[160px] truncate">{item.productName}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{item.skuId}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.portal}</Badge></TableCell>
                        <TableCell className="text-right text-sm">₹{item.mrp.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm font-medium">₹{item.sellingPrice.toLocaleString()}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${priceMismatch ? 'text-amber-600' : ''}`}>
                          ₹{item.portalSellingPrice.toLocaleString()}
                          {priceMismatch && <span className="text-[10px] block text-amber-500">≠ Selling</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm">{item.expectedMarginPct}%</TableCell>
                        <TableCell className={`text-right text-sm font-semibold ${isDropping ? 'text-destructive' : 'text-emerald-600'}`}>{item.actualMarginPct}%</TableCell>
                        <TableCell className={`text-right text-sm font-bold ${isDropping ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {drop > 0 ? `-${drop.toFixed(1)}%` : '0%'}
                        </TableCell>
                        <TableCell className="text-center">
                          {isDropping ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-xs">
                              <AlertTriangle className="w-3 h-3" />Warning
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                              <CheckCircle2 className="w-3 h-3" />Healthy
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><History className="w-5 h-5" />Audit Log</CardTitle>
            <CardDescription>Chronological record of price changes and margin impacts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Timestamp</TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">Portal</TableHead>
                    <TableHead className="font-semibold">Field Changed</TableHead>
                    <TableHead className="font-semibold text-right">Old Value</TableHead>
                    <TableHead className="font-semibold text-right">New Value</TableHead>
                    <TableHead className="font-semibold text-right">Margin Impact</TableHead>
                    <TableHead className="font-semibold text-center">Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogSource.map(log => (
                    <TableRow key={log.id} className={log.severity === 'critical' ? 'bg-destructive/5' : log.severity === 'warning' ? 'bg-amber-500/5' : ''}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{log.skuId}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{log.portal}</Badge></TableCell>
                      <TableCell className="text-sm">{log.field}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{log.oldValue}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{log.newValue}</TableCell>
                      <TableCell className={`text-right text-sm font-bold ${log.marginImpact < -3 ? 'text-destructive' : log.marginImpact < 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {log.marginImpact !== 0 ? `${log.marginImpact > 0 ? '+' : ''}${log.marginImpact}%` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.severity === 'critical' && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">Critical</Badge>}
                        {log.severity === 'warning' && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">Warning</Badge>}
                        {log.severity === 'info' && <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">Info</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
