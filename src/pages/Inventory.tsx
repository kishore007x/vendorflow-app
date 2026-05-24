import { useState, useEffect, useMemo } from 'react';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { inventoryDb } from '@/services/database';
import { Portal } from '@/types';
import { PortalFilter } from '@/components/dashboard/PortalFilter';
import { InventorySyncLog, type SyncLogEntry } from '@/components/inventory/InventorySyncLog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, AlertTriangle, Package, Upload, History, Minus, Plus, RotateCcw, Zap, Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateFilter, ExportButton, useRowSelection, SelectAllCheckbox, RowCheckbox, ImportModal } from '@/components/TableEnhancements';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface InventoryChangeLog {
  id: string;
  skuId: string;
  productName: string;
  type: 'adjustment' | 'order_confirmed' | 'return_received' | 'restock';
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  user: string;
  timestamp: string;
}

export default function Inventory() {
  const { toast } = useToast();
  const [selectedPortal, setSelectedPortal] = useState<Portal | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [importOpen, setImportOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('inventory');
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);

  const [changeLogs, setChangeLogs] = useState<InventoryChangeLog[]>([]);

  // Adjustment dialog
  const [adjustSku, setAdjustSku] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [inventoryState, setInventoryState] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      setInventoryLoading(true);
      const data = await inventoryDb.getAll({
        portal: selectedPortal !== 'all' ? selectedPortal : undefined,
        warehouse: warehouseFilter !== 'all' ? warehouseFilter : undefined,
        search: searchQuery || undefined,
      });
      setInventoryState(data.map((i: any) => ({
        ...i,
        portal: i.portal || 'firstcry',
        skuId: i.sku || i.vendor_style_code || i.product_id || i.id,
        productName: i.product_name || 'Firstcry item',
        availableQuantity: i.quantity_available ?? i.available_quantity ?? 0,
        masterQuantity: i.quantity_available ?? i.master_quantity ?? 0,
        reservedQuantity: i.quantity_reserved ?? i.reserved_quantity ?? 0,
        lowStockThreshold: i.low_stock_threshold ?? 10,
        channelAllocations: i.channel_allocations ?? {},
        agingDays: i.aging_days ?? 0,
      })));
    } catch (e) { console.error(e); } finally { setInventoryLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, [selectedPortal, warehouseFilter, searchQuery]);

  const warehouses = useMemo(() => {
    const unique = new Set(inventoryState.map(i => i.warehouse));
    return Array.from(unique);
  }, [inventoryState]);

  const allBrands = useMemo(() => {
    const unique = new Set(inventoryState.map((i: any) => i.brand as string).filter(Boolean));
    return Array.from(unique);
  }, [inventoryState]);

  const filteredInventory = useMemo(() => {
    return inventoryState.filter(item => {
      const matchesPortal = selectedPortal === 'all' || item.portal === selectedPortal;
      const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) || item.skuId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarehouse = warehouseFilter === 'all' || item.warehouse === warehouseFilter;
      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'low' && item.availableQuantity <= item.lowStockThreshold) ||
        (stockFilter === 'out' && item.availableQuantity === 0) ||
        (stockFilter === 'healthy' && item.availableQuantity > item.lowStockThreshold);
      const matchesBrand = brandFilter === 'all' || item.brand === brandFilter;

      // Column-level filters
      const cf = columnFilters;
      const matchesCF =
        (!cf.skuId || item.skuId.toLowerCase().includes(cf.skuId.toLowerCase())) &&
        (!cf.product || item.productName.toLowerCase().includes(cf.product.toLowerCase())) &&
        (!cf.brand || item.brand?.toLowerCase().includes(cf.brand.toLowerCase())) &&
        (!cf.portal || item.portal?.toLowerCase().includes(cf.portal.toLowerCase())) &&
        (!cf.warehouse || item.warehouse?.toLowerCase().includes(cf.warehouse.toLowerCase())) &&
        (!cf.status || getStockStatus(item.availableQuantity, item.lowStockThreshold).label.toLowerCase().includes(cf.status.toLowerCase()));

      return matchesPortal && matchesSearch && matchesWarehouse && matchesStock && matchesBrand && matchesCF;
    });
  }, [inventoryState, selectedPortal, searchQuery, warehouseFilter, stockFilter, brandFilter, columnFilters]);

  const rowSelection = useRowSelection(filteredInventory.map(i => i.skuId));

  const stats = useMemo(() => {
    const items = selectedPortal === 'all' ? inventoryState : inventoryState.filter(i => i.portal === selectedPortal);
    return {
      totalSKUs: items.length,
      totalStock: items.reduce((sum, i) => sum + i.availableQuantity, 0),
      lowStock: items.filter(i => i.availableQuantity <= i.lowStockThreshold && i.availableQuantity > 0).length,
      outOfStock: items.filter(i => i.availableQuantity === 0).length,
      aging: items.filter(i => i.agingDays > 60).length,
    };
  }, [inventoryState, selectedPortal]);

  const getStockStatus = (available: number, threshold: number) => {
    if (available === 0) return { label: 'Out of Stock', color: 'bg-rose-500/10 text-rose-600' };
    if (available <= threshold) return { label: 'Low Stock', color: 'bg-amber-500/10 text-amber-600' };
    return { label: 'Available', color: 'bg-emerald-500/10 text-emerald-600' };
  };

  const handleAdjust = () => {
    if (!adjustSku || !adjustQty || !adjustReason) return;
    const qty = parseInt(adjustQty);
    if (isNaN(qty)) return;

    setInventoryState(prev => prev.map(item => {
      if (item.skuId !== adjustSku) return item;
      const newAvailable = Math.max(0, item.availableQuantity + qty);
      const newMaster = Math.max(0, item.masterQuantity + qty);
      setChangeLogs(logs => [{
        id: `CL-${Date.now()}`,
        skuId: item.skuId,
        productName: item.productName,
        type: 'adjustment',
        quantityBefore: item.availableQuantity,
        quantityAfter: newAvailable,
        reason: adjustReason,
        user: 'Admin',
        timestamp: new Date().toISOString(),
      }, ...logs]);
      return { ...item, availableQuantity: newAvailable, masterQuantity: newMaster };
    }));

    toast({ title: 'Stock Adjusted', description: `${adjustSku}: ${qty > 0 ? '+' : ''}${qty} units — ${adjustReason}` });
    setAdjustSku(null); setAdjustQty(''); setAdjustReason('');
  };

  const dateLabel = dateFilter === 'today' ? 'Today' : dateFilter === '7days' ? 'Last 7 Days' : dateFilter === '30days' ? 'Last 30 Days' : dateFilter === 'this_month' ? 'This Month' : dateFilter === 'this_year' ? 'This Year' : 'Custom';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Centralized stock control with channel allocation & change tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4" />Import</Button>
          <ExportButton label={`Export – ${dateLabel}`} selectedCount={rowSelection.count} data={filteredInventory} filename="inventory" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Package className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.totalSKUs}</p><p className="text-sm text-muted-foreground">Total SKUs</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Package className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Units</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.lowStock}</p><p className="text-sm text-muted-foreground">Low Stock</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><AlertTriangle className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{stats.outOfStock}</p><p className="text-sm text-muted-foreground">Out of Stock</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/10"><History className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats.aging}</p><p className="text-sm text-muted-foreground">Aging (&gt;60d)</p></div></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Stock Overview</TabsTrigger>
          <TabsTrigger value="sync">Inventory Sync Log ({syncLogs.length})</TabsTrigger>
          <TabsTrigger value="changelog">Change Log ({changeLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <PortalFilter selectedPortal={selectedPortal} onPortalChange={setSelectedPortal} />
                <div className="flex flex-1 flex-wrap gap-3">
                  <DateFilter value={dateFilter} onChange={setDateFilter} />
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search SKU or product..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Warehouses</SelectItem>{warehouses.map(wh => <SelectItem key={wh} value={wh}>{wh}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Brand" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Brands</SelectItem>{allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stock Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                      <SelectItem value="healthy">Healthy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"><SelectAllCheckbox checked={rowSelection.isAllSelected} onCheckedChange={rowSelection.toggleAll} /></TableHead>
                      <TableHead className="font-semibold">SKU ID</TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold">Brand</TableHead>
                      <TableHead className="font-semibold">Portal</TableHead>
                      <TableHead className="font-semibold text-center">Master Stock</TableHead>
                      <TableHead className="font-semibold text-center">Available</TableHead>
                      <TableHead className="font-semibold text-center">Channel Alloc.</TableHead>
                      <TableHead className="font-semibold text-center">Reserved</TableHead>
                      <TableHead className="font-semibold">Warehouse</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                    {/* Column filter row */}
                    <TableRow className="bg-muted/30">
                      <TableHead className="p-1">
                        {Object.values(columnFilters).some(v => v) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setColumnFilters({})}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </TableHead>
                      <TableHead className="p-1">
                        <Input placeholder="Filter..." value={columnFilters.skuId || ''} onChange={e => setColumnFilters(prev => ({ ...prev, skuId: e.target.value }))} className="h-7 text-xs" />
                      </TableHead>
                      <TableHead className="p-1">
                        <Input placeholder="Filter..." value={columnFilters.product || ''} onChange={e => setColumnFilters(prev => ({ ...prev, product: e.target.value }))} className="h-7 text-xs" />
                      </TableHead>
                      <TableHead className="p-1">
                        <Input placeholder="Filter..." value={columnFilters.brand || ''} onChange={e => setColumnFilters(prev => ({ ...prev, brand: e.target.value }))} className="h-7 text-xs" />
                      </TableHead>
                      <TableHead className="p-1">
                        <Input placeholder="Filter..." value={columnFilters.portal || ''} onChange={e => setColumnFilters(prev => ({ ...prev, portal: e.target.value }))} className="h-7 text-xs" />
                      </TableHead>
                      <TableHead className="p-1" />
                      <TableHead className="p-1" />
                      <TableHead className="p-1" />
                      <TableHead className="p-1" />
                      <TableHead className="p-1">
                        <Input placeholder="Filter..." value={columnFilters.warehouse || ''} onChange={e => setColumnFilters(prev => ({ ...prev, warehouse: e.target.value }))} className="h-7 text-xs" />
                      </TableHead>
                      <TableHead className="p-1">
                        <Select value={columnFilters.status || 'all'} onValueChange={v => setColumnFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Low Stock">Low Stock</SelectItem>
                            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableHead>
                      <TableHead className="p-1" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map(item => {
                       const status = getStockStatus(item.availableQuantity, item.lowStockThreshold);
                       const portal = getChannels().find(p => p.id === item.portal);
                       return (
                         <TableRow key={item.skuId} className={`hover:bg-muted/30 ${rowSelection.isSelected(item.skuId) ? 'bg-primary/5' : ''}`}>
                           <TableCell><RowCheckbox checked={rowSelection.isSelected(item.skuId)} onCheckedChange={() => rowSelection.toggle(item.skuId)} /></TableCell>
                           <TableCell className="font-mono text-sm">{item.skuId}</TableCell>
                           <TableCell className="max-w-[180px] truncate">{item.productName}</TableCell>
                           <TableCell><Badge variant="secondary" className="text-xs">{item.brand}</Badge></TableCell>
                           <TableCell><Badge variant="outline" className="gap-1"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</Badge></TableCell>
                           <TableCell className="text-center font-medium">{item.masterQuantity}</TableCell>
                           <TableCell className="text-center"><span className={`font-semibold ${item.availableQuantity <= item.lowStockThreshold ? 'text-amber-600' : ''}`}>{item.availableQuantity}</span></TableCell>
                           <TableCell className="text-center text-muted-foreground">{String(Object.values(item.channelAllocations || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0))}</TableCell>
                           <TableCell className="text-center text-muted-foreground">{item.reservedQuantity}</TableCell>
                           <TableCell>{item.warehouse}</TableCell>
                           <TableCell><Badge variant="secondary" className={status.color}>{status.label}</Badge></TableCell>
                           <TableCell className="text-center">
                             <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setAdjustSku(item.skuId)}>
                               <RotateCcw className="w-3 h-3" />Adjust
                             </Button>
                           </TableCell>
                         </TableRow>
                       );
                     })}
                  </TableBody>
                </Table>
              </div>
              {filteredInventory.length === 0 && (
                <div className="text-center py-12"><Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No inventory items found</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Inventory Change Log</CardTitle>
              <CardDescription>Complete audit trail of stock adjustments, order confirmations, and returns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Timestamp</TableHead>
                    <TableHead className="font-semibold">SKU ID</TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold text-center">Before</TableHead>
                    <TableHead className="font-semibold text-center">After</TableHead>
                    <TableHead className="font-semibold text-center">Change</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeLogs.map(log => {
                    const change = log.quantityAfter - log.quantityBefore;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{format(new Date(log.timestamp), 'dd MMM HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{log.skuId}</TableCell>
                        <TableCell className="text-sm">{log.productName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={
                            log.type === 'order_confirmed' ? 'bg-blue-500/10 text-blue-600' :
                            log.type === 'adjustment' ? 'bg-amber-500/10 text-amber-600' :
                            log.type === 'return_received' ? 'bg-emerald-500/10 text-emerald-600' :
                            'bg-primary/10 text-primary'
                          }>{log.type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{log.quantityBefore}</TableCell>
                        <TableCell className="text-center font-medium">{log.quantityAfter}</TableCell>
                        <TableCell className={`text-center font-bold ${change < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{change > 0 ? '+' : ''}{change}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{log.reason}</TableCell>
                        <TableCell className="text-sm">{log.user}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {changeLogs.length === 0 && <div className="text-center py-8 text-muted-foreground">No change logs yet</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjustment Dialog */}
      <Dialog open={!!adjustSku} onOpenChange={() => setAdjustSku(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock — {adjustSku}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Quantity Change (use negative to reduce)</Label><Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="e.g. -5 or +10" /></div>
            <div><Label>Reason</Label><Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Physical count discrepancy, damaged stock..." /></div>
            <Button className="w-full" onClick={handleAdjust} disabled={!adjustQty || !adjustReason}>Apply Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
