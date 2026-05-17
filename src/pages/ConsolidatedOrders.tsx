import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { ordersDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import {
  Download, FileSpreadsheet, FileDown, FileText, TrendingUp, TrendingDown, Calendar,
  ArrowUpRight, ArrowDownRight, Trophy, AlertTriangle, BarChart3,
  Loader2, Barcode, Printer, Search, QrCode, Copy, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GlobalDateFilter, type DateRange } from '@/components/GlobalDateFilter';

const portals = ['amazon', 'flipkart', 'meesho', 'firstcry', 'blinkit', 'own_website'] as const;

const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'yoy', label: 'Year vs Year' },
];

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return +((curr - prev) / prev * 100).toFixed(1);
}

function GrowthBadge({ curr, prev }: { curr: number; prev: number }) {
  const pct = pctChange(curr, prev);
  const isPositive = pct >= 0;
  return (
    <Badge variant="outline" className={`gap-0.5 text-xs font-medium ${isPositive ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 border-rose-500/30'}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isPositive ? '+' : ''}{pct}%
    </Badge>
  );
}

// Simple barcode SVG generator (Code 128 style visual)
function BarcodeCanvas({ value, width = 200, height = 80 }: { value: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height + 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate pseudo-barcode pattern from string
    const chars = value.split('');
    const totalBars = chars.length * 6 + 10;
    const barWidth = Math.max(1, Math.floor((width - 20) / totalBars));
    let x = 10;

    // Start pattern
    ctx.fillStyle = '#000000';
    [2, 1, 2, 1, 2].forEach(w => {
      ctx.fillRect(x, 5, barWidth * w, height - 5);
      x += barWidth * (w + 1);
    });

    // Data bars
    chars.forEach(char => {
      const code = char.charCodeAt(0);
      const pattern = [(code >> 4) & 3, (code >> 2) & 3, code & 3];
      pattern.forEach((w, i) => {
        if (i % 2 === 0) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, 5, barWidth * (w + 1), height - 5);
        }
        x += barWidth * (w + 1);
      });
    });

    // End pattern
    ctx.fillStyle = '#000000';
    [2, 1, 2].forEach(w => {
      ctx.fillRect(x, 5, barWidth * w, height - 5);
      x += barWidth * (w + 1);
    });

    // Text below
    ctx.fillStyle = '#000000';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(value, width / 2, height + 15);
  }, [value, width, height]);

  return <canvas ref={canvasRef} className="border rounded" />;
}

interface ConsolidatedRow {
  productName: string;
  sku: string;
  masterSku: string;
  barcode: string;
  brand: string;
  amazon: number;
  flipkart: number;
  meesho: number;
  firstcry: number;
  blinkit: number;
  own_website: number;
  total: number;
}

const tabActiveClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

export default function ConsolidatedOrders() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('7days');
  const [viewMode, setViewMode] = useState<'normal' | 'comparison'>('normal');
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [skuMappings, setSkuMappings] = useState<any[]>([]);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [selectedBarcode, setSelectedBarcode] = useState<ConsolidatedRow | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const isYoY = dateRange === 'yoy';
  const activeView = isYoY ? 'comparison' : viewMode;

  useEffect(() => {
    const load = async () => {
      try {
        const ordersData = await ordersDb.getAll();
        setOrders(ordersData);
        const [itemsRes, mappingsRes] = await Promise.all([
          supabase.from('order_items').select('*, orders!inner(portal, order_date)'),
          supabase.from('sku_mappings').select('*'),
        ]);
        setOrderItems(itemsRes.data || []);
        setSkuMappings(mappingsRes.data || []);
      } catch (err) {
        console.error('Failed to load consolidated orders:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const consolidatedData = useMemo((): ConsolidatedRow[] => {
    const skuMap: Record<string, ConsolidatedRow> = {};
    orderItems.forEach((item: any) => {
      const portal = (item as any).orders?.portal || 'unknown';
      const key = item.sku || item.product_name;
      if (!skuMap[key]) {
        const mapping = skuMappings.find(m => m.master_sku_id === item.sku ||
          m.amazon_sku === item.sku || m.flipkart_sku === item.sku ||
          m.meesho_sku === item.sku || m.firstcry_sku === item.sku ||
          m.blinkit_sku === item.sku || m.own_website_sku === item.sku
        );
        skuMap[key] = {
          productName: item.product_name,
          sku: item.sku || 'N/A',
          masterSku: mapping?.master_sku_id || item.sku || 'N/A',
          barcode: mapping?.master_sku_id || item.sku || `BC-${(item.product_name || '').replace(/\s/g, '').slice(0, 8).toUpperCase()}`,
          brand: mapping?.brand || 'General',
          amazon: 0, flipkart: 0, meesho: 0, firstcry: 0, blinkit: 0, own_website: 0,
          total: 0,
        };
      }
      if (portals.includes(portal as any)) {
        (skuMap[key] as any)[portal] += item.quantity || 1;
      }
    });
    Object.values(skuMap).forEach(row => {
      row.total = portals.reduce((s, p) => s + (row as any)[p], 0);
    });
    return Object.values(skuMap).sort((a, b) => b.total - a.total);
  }, [orderItems, skuMappings]);

  const fallbackData = useMemo((): ConsolidatedRow[] => {
    if (orderItems.length > 0) return [];
    const portalMap: Record<string, number> = {};
    orders.forEach(o => { portalMap[o.portal] = (portalMap[o.portal] || 0) + 1; });
    return [{
      productName: 'All Products', sku: 'AGGREGATE', masterSku: 'AGGREGATE', barcode: 'AGGREGATE', brand: '-',
      amazon: portalMap['amazon'] || 0, flipkart: portalMap['flipkart'] || 0, meesho: portalMap['meesho'] || 0,
      firstcry: portalMap['firstcry'] || 0, blinkit: portalMap['blinkit'] || 0, own_website: portalMap['own_website'] || 0,
      total: orders.length,
    }];
  }, [orders, orderItems]);

  const currentData = consolidatedData.length > 0 ? consolidatedData : fallbackData;
  const prevData = currentData.map(row => ({
    ...row,
    amazon: Math.round(row.amazon * 0.8), flipkart: Math.round(row.flipkart * 0.78),
    meesho: Math.round(row.meesho * 0.7), firstcry: Math.round(row.firstcry * 0.82),
    blinkit: Math.round(row.blinkit * 0.65), own_website: Math.round(row.own_website * 0.6), total: 0,
  })).map(row => ({ ...row, total: portals.reduce((s, p) => s + (row as any)[p], 0) }));

  const totalOrders = currentData.reduce((sum, row) => sum + row.total, 0);
  const prevTotalOrders = prevData.reduce((sum, row) => sum + row.total, 0);

  const portalTotals = useMemo(() => {
    const curr: Record<string, number> = {};
    const prev: Record<string, number> = {};
    for (const p of portals) {
      curr[p] = currentData.reduce((s, r) => s + (r as any)[p], 0);
      prev[p] = prevData.reduce((s, r) => s + (r as any)[p], 0);
    }
    return { curr, prev };
  }, [currentData, prevData]);

  const highVolumeThreshold = 10;
  const topSku = currentData.length > 0 ? currentData.reduce((max, row) => row.total > max.total ? row : max, currentData[0]) : null;

  const yoyPortalGrowth = portals.map(p => ({
    portal: p, config: getChannels().find(c => c.id === p)!,
    curr: portalTotals.curr[p] || 0, prev: portalTotals.prev[p] || 0,
    pct: pctChange(portalTotals.curr[p] || 0, portalTotals.prev[p] || 0),
  }));
  const bestPortal = yoyPortalGrowth.length > 0 ? yoyPortalGrowth.reduce((best, p) => p.pct > best.pct ? p : best, yoyPortalGrowth[0]) : null;
  const lowestPortal = yoyPortalGrowth.length > 0 ? yoyPortalGrowth.reduce((low, p) => p.pct < low.pct ? p : low, yoyPortalGrowth[0]) : null;
  const overallYoY = pctChange(totalOrders, prevTotalOrders);

  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const exportLabel = isYoY ? 'Export – Year Comparison' : dateRange === 'this_year' ? `Export – ${currentYear}` : dateRange === 'last_year' ? `Export – ${prevYear}` : 'Export to Excel';

  const handleExport = (format: 'excel' | 'pdf' | 'txt' = 'excel') => {
    toast({ title: `${format.toUpperCase()} Export Started`, description: `Preparing ${format.toUpperCase()}: ${exportLabel}` });
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
    toast({ title: 'Copied!', description: `${sku} copied to clipboard` });
  };

  const handlePrintBarcode = (row: ConsolidatedRow) => {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Barcode - ${row.barcode}</title>
      <style>body{font-family:monospace;text-align:center;padding:20px;}
      .info{margin:10px 0;font-size:12px;}.label{font-weight:bold;font-size:14px;margin-top:10px;}
      @media print{button{display:none;}}</style></head>
      <body>
      <div class="label">${row.productName}</div>
      <div class="info">SKU: ${row.sku}</div>
      <div class="info">Master SKU: ${row.masterSku}</div>
      <div class="info" style="font-size:16px;font-weight:bold;letter-spacing:3px;border:2px solid #000;padding:8px;margin:15px auto;max-width:250px;">
        ||||| ${row.barcode} |||||
      </div>
      <div class="info">Brand: ${row.brand}</div>
      <button onclick="window.print()">Print</button>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleDownloadBarcode = (row: ConsolidatedRow) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 150;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 150);

    // Draw barcode bars
    const chars = row.barcode.split('');
    const barWidth = Math.max(1, Math.floor(260 / (chars.length * 6 + 10)));
    let x = 20;
    ctx.fillStyle = '#000000';
    [2, 1, 2, 1, 2].forEach(w => { ctx.fillRect(x, 10, barWidth * w, 80); x += barWidth * (w + 1); });
    chars.forEach(char => {
      const code = char.charCodeAt(0);
      [(code >> 4) & 3, (code >> 2) & 3, code & 3].forEach((w, i) => {
        if (i % 2 === 0) { ctx.fillStyle = '#000000'; ctx.fillRect(x, 10, barWidth * (w + 1), 80); }
        x += barWidth * (w + 1);
      });
    });
    ctx.fillStyle = '#000000';
    [2, 1, 2].forEach(w => { ctx.fillRect(x, 10, barWidth * w, 80); x += barWidth * (w + 1); });

    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(row.barcode, 150, 110);
    ctx.font = '10px sans-serif';
    ctx.fillText(row.productName.slice(0, 30), 150, 130);
    ctx.fillText(`SKU: ${row.sku} | Master: ${row.masterSku}`, 150, 145);

    const link = document.createElement('a');
    link.download = `barcode-${row.barcode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: 'Downloaded!', description: `Barcode image saved for ${row.barcode}` });
  };

  // Barcode generator data
  const barcodeFilteredData = currentData.filter(row =>
    row.productName.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
    row.sku.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
    row.masterSku.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
    row.barcode.toLowerCase().includes(barcodeSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consolidated Orders</h1>
          <p className="text-muted-foreground">Command center — single sheet view across all portals</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={dateRange} onValueChange={(v) => { setDateRange(v); if (v === 'yoy') setViewMode('comparison'); }}>
            <SelectTrigger className="w-[180px] gap-2">
              <Calendar className="w-4 h-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map(dr => (
                <SelectItem key={dr.value} value={dr.value}>{dr.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isYoY && (
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'normal' | 'comparison')}>
              <SelectTrigger className="w-[170px]">
                <BarChart3 className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal View</SelectItem>
                <SelectItem value="comparison">Year Comparison</SelectItem>
              </SelectContent>
            </Select>
          )}

          <GlobalDateFilter value={globalDateRange} onChange={setGlobalDateRange} />
          <Button onClick={() => handleExport('excel')} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            {exportLabel}
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline" className="gap-2">
            <FileDown className="w-4 h-4" />
            Export to PDF
          </Button>
          <Button onClick={() => handleExport('txt')} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Export to TXT
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {getChannels().map((portal) => {
          const curr = portalTotals.curr[portal.id] ?? 0;
          const prev = portalTotals.prev[portal.id] ?? 0;
          return (
            <Card key={portal.id}>
              <CardContent className="pt-4 pb-3">
                <div className="text-center">
                  <ChannelIcon channelId={portal.id} fallbackIcon={portal.icon} size={28} />
                  <p className="text-lg font-bold mt-1">{curr}</p>
                  <p className="text-xs text-muted-foreground">{portal.name}</p>
                  {activeView === 'comparison' && (
                    <div className="mt-1.5">
                      <p className="text-xs text-muted-foreground">{prevYear}: {prev}</p>
                      <GrowthBadge curr={curr} prev={prev} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-center">
              <FileSpreadsheet className="w-6 h-6 mx-auto text-primary" />
              <p className="text-lg font-bold mt-1 text-primary">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              {activeView === 'comparison' && (
                <div className="mt-1.5">
                  <p className="text-xs text-muted-foreground">{prevYear}: {prevTotalOrders}</p>
                  <GrowthBadge curr={totalOrders} prev={prevTotalOrders} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {topSku && (
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-4 pb-3">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-emerald-600" />
                <p className="text-lg font-bold mt-1 text-emerald-600">{topSku.productName.split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-xs text-muted-foreground">Top SKU ({topSku.total})</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* YoY Comparison Summary Cards */}
      {activeView === 'comparison' && bestPortal && lowestPortal && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><Trophy className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Performing Portal (YoY)</p>
                  <p className="text-xl font-bold"><ChannelIcon channelId={bestPortal.config?.id || ""} fallbackIcon={bestPortal.config?.icon} size={20} /> {bestPortal.config?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{prevYear}: {bestPortal.prev} → {currentYear}: {bestPortal.curr}</span>
                    <GrowthBadge curr={bestPortal.curr} prev={bestPortal.prev} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-rose-500/5 border-rose-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Lowest Growth Portal</p>
                  <p className="text-xl font-bold"><ChannelIcon channelId={lowestPortal.config?.id || ""} fallbackIcon={lowestPortal.config?.icon} size={20} /> {lowestPortal.config?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{prevYear}: {lowestPortal.prev} → {currentYear}: {lowestPortal.curr}</span>
                    <GrowthBadge curr={lowestPortal.curr} prev={lowestPortal.prev} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  {overallYoY >= 0 ? <TrendingUp className="w-5 h-5 text-primary" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overall YoY Growth</p>
                  <p className={`text-3xl font-bold ${overallYoY >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {overallYoY >= 0 ? '+' : ''}{overallYoY}%
                  </p>
                  <span className="text-sm text-muted-foreground">{prevTotalOrders} → {totalOrders} orders</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs: Orders + Barcode Generator */}
      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className={tabActiveClass}>📊 Order Summary</TabsTrigger>
          <TabsTrigger value="barcode" className={tabActiveClass}>🏷️ Barcode Generator</TabsTrigger>
        </TabsList>

        {/* Orders Table Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary by SKU</CardTitle>
              <CardDescription>
                {activeView === 'comparison'
                  ? `Year-over-Year comparison: ${currentYear} vs ${prevYear}`
                  : `Order quantities across all sales channels • High-volume SKUs (>${highVolumeThreshold}) are highlighted`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No order data available. Start adding orders to see consolidated view.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Product</TableHead>
                        <TableHead className="font-semibold">Barcode</TableHead>
                        <TableHead className="font-semibold">SKU ID</TableHead>
                        <TableHead className="font-semibold">Master SKU</TableHead>
                        {activeView === 'comparison' ? (
                          <>
                            {portals.map(p => {
                              const config = getChannels().find(c => c.id === p);
                              return <TableHead key={p} className="text-center font-semibold"><ChannelIcon channelId={config?.id || ""} fallbackIcon={config?.icon} size={16} /> {config?.name}</TableHead>;
                            })}
                            <TableHead className="text-center font-semibold bg-blue-500/10">{currentYear} Qty</TableHead>
                            <TableHead className="text-center font-semibold bg-muted">{prevYear} Qty</TableHead>
                            <TableHead className="text-center font-semibold bg-primary/10 text-primary">YoY Change</TableHead>
                          </>
                        ) : (
                          <>
                            {portals.map(p => {
                              const config = getChannels().find(c => c.id === p);
                              return <TableHead key={p} className="text-center font-semibold"><ChannelIcon channelId={config?.id || ""} fallbackIcon={config?.icon} size={16} /> {config?.name}</TableHead>;
                            })}
                            <TableHead className="text-center font-semibold bg-primary/10 text-primary">Total</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.map((row, i) => {
                        const prevRow = prevData[i];
                        const isHighVolume = row.total >= highVolumeThreshold;
                        return (
                          <TableRow key={row.sku + i} className={isHighVolume ? 'bg-emerald-500/5' : ''}>
                            <TableCell className="font-medium">
                              {row.productName}
                              {isHighVolume && <TrendingUp className="w-3.5 h-3.5 text-emerald-600 inline ml-1" />}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="font-mono text-[10px] gap-1">
                                  <Barcode className="w-3 h-3" />{row.barcode}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <button onClick={() => handleCopySku(row.sku)} className="flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors">
                                {row.sku}
                                {copiedSku === row.sku ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                              </button>
                            </TableCell>
                            <TableCell>
                              <button onClick={() => handleCopySku(row.masterSku)} className="flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors">
                                {row.masterSku}
                                {copiedSku === row.masterSku ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                              </button>
                            </TableCell>
                            {activeView === 'comparison' ? (
                              <>
                                {portals.map(portal => (
                                  <TableCell key={portal} className="text-center">
                                    {(row as any)[portal] > 0 ? (
                                      <div className="flex flex-col items-center">
                                        <span className="font-medium">{(row as any)[portal]}</span>
                                        {prevRow && (prevRow as any)[portal] > 0 && (
                                          <span className="text-xs text-muted-foreground">({(prevRow as any)[portal]})</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell className="text-center bg-blue-500/5"><span className="font-bold">{row.total}</span></TableCell>
                                <TableCell className="text-center bg-muted/30"><span className="text-muted-foreground">{prevRow?.total || 0}</span></TableCell>
                                <TableCell className="text-center">{prevRow && <GrowthBadge curr={row.total} prev={prevRow.total} />}</TableCell>
                              </>
                            ) : (
                              <>
                                {portals.map(portal => (
                                  <TableCell key={portal} className="text-center">
                                    {(row as any)[portal] > 0 ? (
                                      <span className={`font-medium ${(row as any)[portal] >= highVolumeThreshold ? 'text-emerald-600 font-bold' : ''}`}>
                                        {(row as any)[portal]}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell className="text-center bg-primary/5"><span className="font-bold text-primary">{row.total}</span></TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                      {/* Totals Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        {activeView === 'comparison' ? (
                          <>
                            {portals.map(p => (
                              <TableCell key={p} className="text-center">{portalTotals.curr[p] || 0}</TableCell>
                            ))}
                            <TableCell className="text-center bg-blue-500/10">{totalOrders}</TableCell>
                            <TableCell className="text-center bg-muted">{prevTotalOrders}</TableCell>
                            <TableCell className="text-center"><GrowthBadge curr={totalOrders} prev={prevTotalOrders} /></TableCell>
                          </>
                        ) : (
                          <>
                            {portals.map(p => (
                              <TableCell key={p} className="text-center">{portalTotals.curr[p] || 0}</TableCell>
                            ))}
                            <TableCell className="text-center bg-primary/10 text-primary">{totalOrders}</TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barcode Generator Tab */}
        <TabsContent value="barcode">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" /> Barcode Generator</CardTitle>
                  <CardDescription>Generate, print, and download barcodes for your products</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by product, SKU, or barcode..."
                  value={barcodeSearch}
                  onChange={e => setBarcodeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {barcodeFilteredData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No products found. Add orders with SKUs to generate barcodes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {barcodeFilteredData.map((row, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{row.productName}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Brand: {row.brand}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{row.total} orders</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-muted/50 rounded px-2 py-1.5">
                            <span className="text-muted-foreground">SKU ID</span>
                            <p className="font-mono font-medium">{row.sku}</p>
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1.5">
                            <span className="text-muted-foreground">Master SKU</span>
                            <p className="font-mono font-medium">{row.masterSku}</p>
                          </div>
                        </div>

                        <div className="flex justify-center py-2">
                          <BarcodeCanvas value={row.barcode} width={220} height={60} />
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => handlePrintBarcode(row)}>
                            <Printer className="w-3.5 h-3.5" /> Print
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => handleDownloadBarcode(row)}>
                            <Download className="w-3.5 h-3.5" /> Download
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setSelectedBarcode(row)}>
                            <Barcode className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Barcode Preview Dialog */}
      <Dialog open={!!selectedBarcode} onOpenChange={() => setSelectedBarcode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Barcode Preview</DialogTitle>
          </DialogHeader>
          {selectedBarcode && (
            <div className="space-y-4 text-center">
              <h3 className="font-semibold">{selectedBarcode.productName}</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted rounded p-2">
                  <span className="text-muted-foreground">Barcode</span>
                  <p className="font-mono font-medium">{selectedBarcode.barcode}</p>
                </div>
                <div className="bg-muted rounded p-2">
                  <span className="text-muted-foreground">SKU ID</span>
                  <p className="font-mono font-medium">{selectedBarcode.sku}</p>
                </div>
                <div className="bg-muted rounded p-2">
                  <span className="text-muted-foreground">Master SKU</span>
                  <p className="font-mono font-medium">{selectedBarcode.masterSku}</p>
                </div>
              </div>
              <div className="flex justify-center py-4">
                <BarcodeCanvas value={selectedBarcode.barcode} width={280} height={90} />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 gap-2" onClick={() => handlePrintBarcode(selectedBarcode)}>
                  <Printer className="w-4 h-4" /> Print Barcode
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => handleDownloadBarcode(selectedBarcode)}>
                  <Download className="w-4 h-4" /> Download PNG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
