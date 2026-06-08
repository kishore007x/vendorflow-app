import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Reconciliation from './Reconciliation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BoxIcon, AlertTriangle } from 'lucide-react';
import { inventoryDb } from '@/services/database';
import { formatDistanceToNow } from 'date-fns';

function StockReconciliation() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await inventoryDb.getAll().catch(() => []);
        if (mounted) setInventory(Array.isArray(rows) ? rows : []);
      } catch (e) { console.debug('inventory fetch failed', e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const metrics = useMemo(() => {
    const total = inventory.length;
    const matched = inventory.filter(i => {
      const sys = Number(i.available_quantity || i.quantity || 0);
      const physical = Number(i.physical_quantity ?? sys);
      return sys === physical && sys > 0;
    }).length;
    const discrepancies = inventory.filter(i => {
      const sys = Number(i.available_quantity || i.quantity || 0);
      const physical = Number(i.physical_quantity ?? sys);
      return sys !== physical;
    }).length;
    const matchPct = total > 0 ? Math.round((matched / total) * 100) : 0;
    const lastAuditTs = inventory
      .map(i => new Date(i.last_audit_at || i.last_counted_at || i.updated_at || 0).getTime())
      .filter(t => !isNaN(t) && t > 0)
      .sort((a, b) => b - a)[0];
    return { total, matched, discrepancies, matchPct, lastAuditTs };
  }, [inventory]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {loading ? '—' : `${metrics.matchPct}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? 'Loading…' : `${metrics.matched} of ${metrics.total} items matched`}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Discrepancies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {loading ? '—' : metrics.discrepancies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Items needing review</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading || !metrics.lastAuditTs ? '—' : formatDistanceToNow(metrics.lastAuditTs, { addSuffix: true })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.total > 0 ? `${metrics.total} inventory items tracked` : 'No inventory data'}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          {metrics.discrepancies > 0 ? (
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          ) : (
            <BoxIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          )}
          <h3 className="text-lg font-semibold">Stock Reconciliation</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            {metrics.total > 0
              ? `${metrics.total} inventory items tracked across warehouses. ${metrics.discrepancies} need review.`
              : 'No inventory data found. Import inventory records to start reconciliation.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReconciliationHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(location.pathname === '/stock-reconciliation' ? 'stock' : 'payment');

  useEffect(() => {
    setTab(location.pathname === '/stock-reconciliation' ? 'stock' : 'payment');
  }, [location.pathname]);

  const handleTabChange = (nextTab: string) => {
    setTab(nextTab);
    navigate(nextTab === 'stock' ? '/stock-reconciliation' : '/reconciliation', { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Reconcile stock and payment data across all channels.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="glass-panel">
          <TabsTrigger value="payment">Payment Reconciliation</TabsTrigger>
          <TabsTrigger value="stock">Stock Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="mt-4">
          <Reconciliation />
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <StockReconciliation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
