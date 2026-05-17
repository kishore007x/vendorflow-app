import { useState, useMemo, useEffect } from 'react';
import { ChannelIcon } from '@/components/ChannelIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search, Download, Filter, SlidersHorizontal, ShieldCheck,
  Package, Percent, Shield, Receipt, IndianRupee, ArrowRight,
} from 'lucide-react';
import { DateFilter, ExportButton, useRowSelection, SelectAllCheckbox, RowCheckbox } from '@/components/TableEnhancements';
import { Portal } from '@/types';
import { getChannels } from '@/services/channelManager';

// ---------- types ----------
interface SettlementLineItem {
  id: string;
  skuId: string;
  productImage: string;
  description: string;
  descriptionType: 'Sale' | 'Promotion' | 'Return' | 'Adjustment';
  orderItemId: string;
  orderId: string;
  portal: Portal;
  batchId: string;
  paymentType: 'Previous' | 'Upcoming';
  settlementStatus: 'Settled' | 'Pending';
  saleAmount: number;
  refundAmount: number;
  offerAmount: number;
  sellerShare: number;
  customerAddons: number;
  marketplaceFees: number;
  taxes: number;
  netAmount: number;
}

// ---------- data ----------
const mockLineItems: SettlementLineItem[] = [];

// load settlement line items from DB (best-effort mapping)
// maps settlements -> line items for display
function mapSettlementToLineItems(s: any): SettlementLineItem[] {
  // best-effort mapping: if settlement contains line_items, use them
  if (Array.isArray(s.line_items) && s.line_items.length) return s.line_items.map((li: any) => ({
    id: li.id || `${s.id}-${li.sku || li.id}`,
    skuId: li.sku || li.sku_id || li.skuId || 'SKU-UNK',
    productImage: li.image || li.product_image || '',
    description: li.description || li.title || li.product_name || '',
    descriptionType: li.type || 'Sale',
    orderItemId: li.order_item_id || li.orderItemId || li.order_item || '',
    orderId: li.order_id || li.orderId || s.order_id || '',
    portal: s.portal || 'FirstCry',
    batchId: s.batch_id || s.batchId || '',
    paymentType: s.payment_type || 'Previous',
    settlementStatus: s.status === 'settled' ? 'Settled' : 'Pending',
    saleAmount: Number(li.sale_amount || li.sale || li.amount || 0),
    refundAmount: Number(li.refund_amount || li.refund || 0),
    offerAmount: Number(li.offer_amount || li.offer || 0),
    sellerShare: Number(li.seller_share || li.sellerShare || 0),
    customerAddons: Number(li.addons || li.customer_addons || 0),
    marketplaceFees: Number(li.marketplace_fees || li.mp_fees || 0),
    taxes: Number(li.taxes || 0),
    netAmount: Number(li.net_amount || li.net || 0),
  }));
  // fallback: create one line per settlement
  return [{
    id: s.id,
    skuId: s.sku || s.sku_id || s.settlement_ref || s.id,
    productImage: s.image || '',
    description: s.description || `Settlement ${s.id}`,
    descriptionType: 'Sale',
    orderItemId: s.order_item_id || s.order_item || s.order_item_id || s.id,
    orderId: s.order_id || s.orderId || '',
    portal: s.portal || 'FirstCry',
    batchId: s.batch_id || '',
    paymentType: s.payment_type || 'Previous',
    settlementStatus: s.status === 'settled' ? 'Settled' : 'Pending',
    saleAmount: Number(s.sale_amount || s.sale || 0),
    refundAmount: Number(s.refund_amount || s.refund || 0),
    offerAmount: Number(s.offer_amount || s.offer || 0),
    sellerShare: Number(s.seller_share || 0),
    customerAddons: Number(s.addons || 0),
    marketplaceFees: Number(s.marketplace_fees || 0),
    taxes: Number(s.taxes || 0),
    netAmount: Number(s.net_amount || s.net || 0),
  }];
}

const descTypeColors: Record<string, string> = {
  Sale: 'bg-success/10 text-success',
  Promotion: 'bg-primary/10 text-primary',
  Return: 'bg-destructive/10 text-destructive',
  Adjustment: 'bg-warning/10 text-warning',
};

const allColumns = [
  'Product', 'SKU ID', 'Description', 'Order Item ID', 'Order ID',
  'Payment Type', 'Sale Amount', 'Refund Amount', 'Offer Amount',
  'Seller Share', 'Customer Add-ons', 'Marketplace Fees', 'Taxes',
  'Net Amount', 'Batch ID', 'Settlement Status', 'Portal',
] as const;

type ColumnKey = typeof allColumns[number];

const defaultVisibleColumns = new Set<ColumnKey>([
  'Product', 'SKU ID', 'Description', 'Order Item ID', 'Order ID',
  'Payment Type', 'Sale Amount', 'Refund Amount', 'Offer Amount',
  'Seller Share', 'Customer Add-ons', 'Marketplace Fees', 'Taxes', 'Net Amount',
]);

export default function OrderPaymentSettlement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [amountTypeFilter, setAmountTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [summaryTab, setSummaryTab] = useState('orders');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(defaultVisibleColumns));
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  const dataSource = lineItems.length ? lineItems : mockLineItems;

  const filtered = useMemo(() => {
    return dataSource.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || item.orderId.toLowerCase().includes(q) || item.orderItemId.toLowerCase().includes(q);
      const matchesPayment = paymentTypeFilter === 'all' || item.paymentType.toLowerCase() === paymentTypeFilter;
      const matchesAmount = amountTypeFilter === 'all'
        || (amountTypeFilter === 'credit' && item.netAmount >= 0)
        || (amountTypeFilter === 'debit' && item.netAmount < 0);
      return matchesSearch && matchesPayment && matchesAmount;
    });
  }, [searchQuery, paymentTypeFilter, amountTypeFilter]);

  const rowSelection = useRowSelection(filtered.map(i => i.id));

  // Summary calculations
  const totals = useMemo(() => {
    const t = filtered.reduce((acc, i) => ({
      sale: acc.sale + i.saleAmount,
      refund: acc.refund + i.refundAmount,
      offer: acc.offer + i.offerAmount,
      sellerShare: acc.sellerShare + i.sellerShare,
      addons: acc.addons + i.customerAddons,
      fees: acc.fees + i.marketplaceFees,
      taxes: acc.taxes + i.taxes,
      net: acc.net + i.netAmount,
    }), { sale: 0, refund: 0, offer: 0, sellerShare: 0, addons: 0, fees: 0, taxes: 0, net: 0 });
    return t;
  }, [filtered]);

  const summaryCategories = [
    { key: 'orders', label: 'Orders', amount: totals.sale, icon: Package },
    { key: 'mp_fee', label: 'MP Fee Rebate', amount: totals.fees, icon: Percent },
    { key: 'services', label: 'Services', amount: totals.addons, icon: Receipt },
    { key: 'protection', label: 'Protection Fund', amount: Math.round(totals.sale * 0.005), icon: Shield },
    { key: 'taxation', label: 'Taxation', amount: totals.taxes, icon: IndianRupee },
  ];

  const totalStrip = [
    { label: 'Sale Amount', value: totals.sale, type: 'credit' as const },
    { label: 'Refund Amount', value: totals.refund, type: totals.refund >= 0 ? 'credit' as const : 'debit' as const },
    { label: 'Offer Amount', value: totals.offer, type: totals.offer >= 0 ? 'credit' as const : 'debit' as const },
    { label: 'Seller Share', value: totals.sellerShare, type: 'credit' as const },
    { label: 'Customer Add-ons', value: totals.addons, type: 'credit' as const },
    { label: 'MP Fees', value: totals.fees, type: 'debit' as const },
    { label: 'Taxes', value: totals.taxes, type: 'debit' as const },
    { label: 'Offer Adj.', value: totals.offer, type: totals.offer >= 0 ? 'credit' as const : 'debit' as const },
    { label: 'Net Settlement', value: totals.net, type: totals.net >= 0 ? 'credit' as const : 'debit' as const },
  ];

  const col = (c: ColumnKey) => visibleColumns.has(c);

  const toggleColumn = (c: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  };

  // Group by orderItemId for visual grouping
  const grouped = useMemo(() => {
    const map = new Map<string, SettlementLineItem[]>();
    filtered.forEach(item => {
      const list = map.get(item.orderItemId) || [];
      list.push(item);
      map.set(item.orderItemId, list);
    });
    return map;
  }, [filtered]);

  const formatAmt = (v: number) => {
    const prefix = v >= 0 ? '₹' : '-₹';
    return `${prefix}${Math.abs(v).toLocaleString()}`;
  };

  const amtClass = (v: number) => v >= 0 ? 'text-success' : 'text-destructive';

  return (
    <div className="space-y-4">
      {/* 1️⃣ Search header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID / Order Item ID..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Payment Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="previous">Previous Payments</SelectItem>
                <SelectItem value="upcoming">Upcoming Payments</SelectItem>
              </SelectContent>
            </Select>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <Button variant="outline" className="gap-2" disabled>
              <Download className="w-4 h-4" />
              Request Download
            </Button>
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing results for <span className="font-medium text-foreground">"{searchQuery}"</span> — {filtered.length} line items
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2️⃣ Summary tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {summaryCategories.map(cat => {
          const Icon = cat.icon;
          const active = summaryTab === cat.key;
          return (
            <Card
              key={cat.key}
              className={`cursor-pointer transition-all ${active ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
              onClick={() => setSummaryTab(cat.key)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{cat.label}</span>
                </div>
                <p className={`text-lg font-bold ${amtClass(cat.amount)}`}>{formatAmt(cat.amount)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm px-1">
        <span className="text-muted-foreground">Sale & Returns</span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold">{formatAmt(totals.sale + totals.refund)}</span>
      </div>

      {/* 3️⃣ Settlement total strip */}
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-between text-xs">
            {totalStrip.map((item, i) => (
              <div key={i} className="text-center min-w-[80px]">
                <p className="text-muted-foreground mb-0.5">{item.label}</p>
                <p className={`font-bold text-sm ${item.value >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatAmt(item.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6️⃣ Filter & column controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-popover" align="start">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Amount Type</p>
                <Select value={amountTypeFilter} onValueChange={setAmountTypeFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="credit">Credits Only</SelectItem>
                    <SelectItem value="debit">Deductions Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Payment Type</p>
                <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="previous">Previous</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={showColumnConfig} onOpenChange={setShowColumnConfig}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Customize Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-popover max-h-80 overflow-y-auto" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-2">Toggle columns</p>
            <div className="space-y-1.5">
              {allColumns.map(c => (
                <label key={c} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={visibleColumns.has(c)} onCheckedChange={() => toggleColumn(c)} />
                  {c}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ExportButton
          label={rowSelection.count > 0 ? undefined : 'Export Settlement'}
          selectedCount={rowSelection.count}
        />

        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          Reconciliation-ready view
        </div>
      </div>

      {/* 4️⃣ & 5️⃣ Line-item table with grouping */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <SelectAllCheckbox checked={rowSelection.isAllSelected} onCheckedChange={rowSelection.toggleAll} />
                  </TableHead>
                  {col('Product') && <TableHead className="font-semibold w-12">Img</TableHead>}
                  {col('SKU ID') && <TableHead className="font-semibold">SKU ID</TableHead>}
                  {col('Description') && <TableHead className="font-semibold min-w-[200px]">Description</TableHead>}
                  {col('Order Item ID') && <TableHead className="font-semibold">Order Item ID</TableHead>}
                  {col('Order ID') && <TableHead className="font-semibold">Order ID</TableHead>}
                  {col('Portal') && <TableHead className="font-semibold">Portal</TableHead>}
                  {col('Payment Type') && <TableHead className="font-semibold">Payment Type</TableHead>}
                  {col('Sale Amount') && <TableHead className="font-semibold text-right">Sale Amt</TableHead>}
                  {col('Refund Amount') && <TableHead className="font-semibold text-right">Refund</TableHead>}
                  {col('Offer Amount') && <TableHead className="font-semibold text-right">Offer</TableHead>}
                  {col('Seller Share') && <TableHead className="font-semibold text-right">Seller Share</TableHead>}
                  {col('Customer Add-ons') && <TableHead className="font-semibold text-right">Add-ons</TableHead>}
                  {col('Marketplace Fees') && <TableHead className="font-semibold text-right">MP Fees</TableHead>}
                  {col('Taxes') && <TableHead className="font-semibold text-right">Taxes</TableHead>}
                  {col('Net Amount') && <TableHead className="font-semibold text-right">Net Amt</TableHead>}
                  {col('Batch ID') && <TableHead className="font-semibold">Batch ID</TableHead>}
                  {col('Settlement Status') && <TableHead className="font-semibold">Status</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(grouped.entries()).map(([orderItemId, items]) =>
                  items.map((item, idx) => {
                    const portal = getChannels().find(p => p.id === item.portal);
                    const isGroupStart = idx === 0 && items.length > 1;
                    const isGroupContinue = idx > 0;
                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-muted/30 ${rowSelection.isSelected(item.id) ? 'bg-primary/5' : ''} ${isGroupContinue ? 'border-t-0 border-l-2 border-l-primary/30' : ''}`}
                      >
                        <TableCell>
                          <RowCheckbox checked={rowSelection.isSelected(item.id)} onCheckedChange={() => rowSelection.toggle(item.id)} />
                        </TableCell>
                        {col('Product') && (
                          <TableCell>
                            <img src={item.productImage} alt="" className="w-8 h-8 rounded object-cover" />
                          </TableCell>
                        )}
                        {col('SKU ID') && <TableCell className="font-mono text-xs">{item.skuId}</TableCell>}
                        {col('Description') && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={`text-[10px] px-1.5 ${descTypeColors[item.descriptionType] || ''}`}>
                                {item.descriptionType}
                              </Badge>
                              <span className="text-sm">{item.description}</span>
                            </div>
                            {isGroupStart && (
                              <span className="text-[10px] text-muted-foreground">
                                +{items.length - 1} more entries for this item
                              </span>
                            )}
                          </TableCell>
                        )}
                        {col('Order Item ID') && <TableCell className="font-mono text-xs">{item.orderItemId}</TableCell>}
                        {col('Order ID') && <TableCell className="font-mono text-xs">{item.orderId}</TableCell>}
                        {col('Portal') && (
                          <TableCell>
                            <Badge variant="outline" className="gap-1 text-xs"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</Badge>
                          </TableCell>
                        )}
                        {col('Payment Type') && (
                          <TableCell>
                            <Badge variant="secondary" className={item.paymentType === 'Previous' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}>
                              {item.paymentType}
                            </Badge>
                          </TableCell>
                        )}
                        {col('Sale Amount') && <TableCell className={`text-right font-medium ${amtClass(item.saleAmount)}`}>{item.saleAmount ? formatAmt(item.saleAmount) : '–'}</TableCell>}
                        {col('Refund Amount') && <TableCell className={`text-right ${amtClass(item.refundAmount)}`}>{item.refundAmount ? formatAmt(item.refundAmount) : '–'}</TableCell>}
                        {col('Offer Amount') && <TableCell className={`text-right ${amtClass(item.offerAmount)}`}>{item.offerAmount ? formatAmt(item.offerAmount) : '–'}</TableCell>}
                        {col('Seller Share') && <TableCell className={`text-right font-medium ${amtClass(item.sellerShare)}`}>{formatAmt(item.sellerShare)}</TableCell>}
                        {col('Customer Add-ons') && <TableCell className={`text-right ${amtClass(item.customerAddons)}`}>{item.customerAddons ? formatAmt(item.customerAddons) : '–'}</TableCell>}
                        {col('Marketplace Fees') && <TableCell className={`text-right ${amtClass(item.marketplaceFees)}`}>{formatAmt(item.marketplaceFees)}</TableCell>}
                        {col('Taxes') && <TableCell className={`text-right ${amtClass(item.taxes)}`}>{formatAmt(item.taxes)}</TableCell>}
                        {col('Net Amount') && <TableCell className={`text-right font-bold ${amtClass(item.netAmount)}`}>{formatAmt(item.netAmount)}</TableCell>}
                        {col('Batch ID') && <TableCell className="font-mono text-xs">{item.batchId}</TableCell>}
                        {col('Settlement Status') && (
                          <TableCell>
                            <Badge variant="secondary" className={item.settlementStatus === 'Settled' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                              {item.settlementStatus}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No settlement line items found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
