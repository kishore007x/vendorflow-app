import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';

export interface SyncLogEntry {
  id: string;
  orderId: string;
  portal: 'amazon' | 'flipkart' | 'meesho' | 'firstcry' | 'blinkit' | 'own_website';
  skuId: string;
  productName: string;
  quantityDeducted: number;
  masterQuantityBefore: number;
  masterQuantityAfter: number;
  channelAllocationBefore: number;
  channelAllocationAfter: number;
  syncType: 'order_confirmed' | 'order_shipped' | 'return_received';
  timestamp: string;
  status: 'synced' | 'pending' | 'failed';
}

interface Props {
  syncLogs: SyncLogEntry[];
}

export function InventorySyncLog({ syncLogs }: Props) {
  const portalLabels: Record<string, string> = {
    amazon: 'Amazon',
    flipkart: 'Flipkart',
    meesho: 'Meesho',
    firstcry: 'FirstCry',
    blinkit: 'Blinkit',
    own_website: 'Website',
  };

  const syncTypeLabels: Record<string, string> = {
    order_confirmed: 'Order Confirmed',
    order_shipped: 'Order Shipped',
    return_received: 'Return Received',
  };

  const getSyncTypeColor = (type: string) => {
    switch (type) {
      case 'order_confirmed':
      case 'order_shipped':
        return 'bg-blue-500/10 text-blue-600';
      case 'return_received':
        return 'bg-emerald-500/10 text-emerald-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'pending':
        return 'bg-amber-500/10 text-amber-600';
      case 'failed':
        return 'bg-rose-500/10 text-rose-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Inventory Sync Log</CardTitle>
        <CardDescription>Real-time inventory deductions across channels when orders are confirmed/shipped and returns received</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Timestamp</TableHead>
                <TableHead className="font-semibold">Order ID</TableHead>
                <TableHead className="font-semibold">Portal</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold text-center">Qty Deducted</TableHead>
                <TableHead className="font-semibold text-center">Master Stock</TableHead>
                <TableHead className="font-semibold text-center">Channel Alloc</TableHead>
                <TableHead className="font-semibold">Sync Type</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No inventory sync events yet. Orders will appear here when confirmed or shipped.
                  </TableCell>
                </TableRow>
              ) : (
                syncLogs.map(log => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">{format(new Date(log.timestamp), 'dd MMM HH:mm:ss')}</TableCell>
                    <TableCell className="font-mono text-xs font-medium">{log.orderId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{portalLabels[log.portal]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.skuId}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{log.productName}</TableCell>
                    <TableCell className="text-center font-bold text-amber-600">-{log.quantityDeducted}</TableCell>
                    <TableCell className="text-center text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground line-through text-[11px]">{log.masterQuantityBefore}</span>
                        <span className="font-medium">{log.masterQuantityAfter}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground line-through text-[11px]">{log.channelAllocationBefore}</span>
                        <span className="font-medium">{log.channelAllocationAfter}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getSyncTypeColor(log.syncType)}>
                        {syncTypeLabels[log.syncType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
