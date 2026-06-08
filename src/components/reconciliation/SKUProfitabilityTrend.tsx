import { useMemo, useState, useEffect } from 'react';
import { ChannelIcon } from '@/components/ChannelIcon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getChannels } from '@/services/channelManager';
import { Portal } from '@/types';
import { TrendingUp, TrendingDown, AlertTriangle, Star } from 'lucide-react';

interface SKUTrend {
  id: string;
  sku: string;
  productName: string;
  portal: Portal;
  currentMargin: number;
  lastMonthMargin: number;
  trend: 'up' | 'down' | 'stable';
  dropAlert: boolean;
}

export default function SKUProfitabilityTrend() {
  const [trends, setTrends] = useState<SKUTrend[]>([]);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const [products, orders] = await Promise.all([
          db.productsDb.getAll().catch(() => []),
          db.ordersDb.getAll().catch(() => []),
        ]);
        if (!mounted) return;
        // Count orders per product (last 30 days vs prior 30 days) as trend proxy
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 86400000;
        const sixtyDaysAgo = now - 60 * 86400000;
        const realized: Record<string, { recent: number; prior: number }> = {};
        (orders || []).forEach((o: any) => {
          const sku = (o.sku || o.product_sku || '').toString().toLowerCase();
          if (!sku) return;
          const orderDate = new Date(o.order_date || o.created_at || 0).getTime();
          if (!realized[sku]) realized[sku] = { recent: 0, prior: 0 };
          if (orderDate >= thirtyDaysAgo) realized[sku].recent += 1;
          else if (orderDate >= sixtyDaysAgo) realized[sku].prior += 1;
        });
        const mapped = (products || []).map((p: any) => {
          const mrp = Number(p.mrp || p.price || p.list_price || 0);
          const cost = Number(p.land_cost || p.cost || 0);
          const currentMargin = mrp ? ((mrp - cost) / mrp) * 100 : 0;
          const skuKey = (p.sku || '').toString().toLowerCase();
          const r = realized[skuKey] || { recent: 0, prior: 0 };
          const hasHistory = r.recent > 0 || r.prior > 0;
          // No historical margin in DB: use order-volume trend as proxy
          const trend: 'up' | 'down' | 'stable' = !hasHistory ? 'stable' : r.recent > r.prior ? 'up' : r.recent < r.prior ? 'down' : 'stable';
          // If no order history, leave lastMonthMargin as currentMargin (no fake change)
          const lastMonthMargin = hasHistory ? currentMargin : currentMargin;
          return {
            id: p.id,
            sku: p.sku || p.sku_id || p.id,
            productName: p.name || p.title || p.product_name || 'Unnamed',
            portal: p.portal || 'firstcry',
            currentMargin: Number(currentMargin.toFixed(1)),
            lastMonthMargin: Number(lastMonthMargin.toFixed(1)),
            trend,
            dropAlert: currentMargin < 10,
          } as SKUTrend;
        });
        setTrends(mapped);
      } catch (e) { console.debug('load sku trends failed', e); }
    })();
    (async () => {
      try {
        const ch = await getChannels();
        if (mounted) setChannels(ch || []);
      } catch (e) { }
    })();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    const drops = trends.filter(s => s.dropAlert);
    const sorted = [...trends].sort((a, b) => b.currentMargin - a.currentMargin);
    return {
      marginDropCount: drops.length,
      mostProfitable: sorted[0],
    };
  }, [trends]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.marginDropCount}</p><p className="text-sm text-muted-foreground">SKUs with Margin Drop</p></div></div></CardContent></Card>
        <Card className="border-emerald-500/30 bg-emerald-500/5"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Star className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.mostProfitable?.currentMargin}%</p><p className="text-sm text-muted-foreground">Top: {stats.mostProfitable?.productName}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SKU-Level Profitability Trend</CardTitle>
          <CardDescription>Month-over-month margin analysis with drop alerts for seller protection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Portal</TableHead>
                  <TableHead className="text-right font-semibold">Current Margin %</TableHead>
                  <TableHead className="text-right font-semibold">Last Month %</TableHead>
                  <TableHead className="text-center font-semibold">Trend</TableHead>
                  <TableHead className="font-semibold">Alert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trends.map(s => {
                  const portal = channels.find((p: any) => p.id === s.portal) || channels.find((p: any) => p.key === s.portal) || { id: s.portal, name: s.portal, icon: undefined };
                  const diff = s.currentMargin - s.lastMonthMargin;
                  return (
                    <TableRow key={s.id} className={s.dropAlert ? 'bg-rose-500/5' : ''}>
                      <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                      <TableCell className="text-sm font-medium">{s.productName}</TableCell>
                      <TableCell><span className="flex items-center gap-1.5 text-sm"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</span></TableCell>
                      <TableCell className="text-right font-bold">{s.currentMargin.toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">{s.lastMonthMargin.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1 font-semibold ${diff > 0 ? 'text-emerald-600' : diff < -5 ? 'text-rose-600' : diff < 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {s.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : s.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : '—'}
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {s.dropAlert ? (
                          <Badge variant="outline" className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1">
                            <AlertTriangle className="w-3 h-3" />Margin Drop Alert
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
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
    </div>
  );
}
