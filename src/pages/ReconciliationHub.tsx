import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import Reconciliation from './Reconciliation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BoxIcon, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

function StockReconciliation() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">94%</div>
            <p className="text-xs text-muted-foreground mt-1">Physical vs system stock</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Discrepancies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">12</div>
            <p className="text-xs text-muted-foreground mt-1">Items needing review</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3d ago</div>
            <p className="text-xs text-muted-foreground mt-1">Next scheduled: tomorrow</p>
          </CardContent>
        </Card>
      </div>
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <BoxIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold">Stock Reconciliation</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            Compare physical inventory against system records across all warehouses and channels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReconciliationHub() {
  const [tab, setTab] = useState('payment');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Reconcile stock and payment data across all channels.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
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
