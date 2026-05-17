import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { purchaseOrdersDb, purchaseInvoicesDb, inwardStockDb } from '@/services/database';
import {
  Plus, Search, Download, FileText, Package, Truck, ClipboardList, IndianRupee,
  CheckCircle2, Clock, AlertTriangle, Loader2, Eye, Printer, XCircle, PackageCheck,
  ReceiptText, ArrowDownToLine
} from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

interface LineItem {
  product_name: string;
  sku: string;
  hsn_code: string;
  quantity: number;
  rate: number;
  gst_percent: number;
  total: number;
}

const emptyLine = (): LineItem => ({ product_name: '', sku: '', hsn_code: '', quantity: 1, rate: 0, gst_percent: 18, total: 0 });

const PO_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Sent', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  partial_received: { label: 'Partial', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  received: { label: 'Received', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
};

const PAYMENT_STATUSES: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Unpaid', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
  partial: { label: 'Partial', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  paid: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
};

const QC_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  passed: { label: 'Passed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  partial: { label: 'Partial', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  failed: { label: 'Failed', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
};

let poCounter = 0;
let billCounter = 0;
let grnCounter = 0;

const genPO = () => { poCounter++; return `PO-${format(new Date(), 'yyMM')}-${String(poCounter).padStart(3, '0')}`; };
const genBill = () => { billCounter++; return `PB-${format(new Date(), 'yyMM')}-${String(billCounter).padStart(3, '0')}`; };
const genGRN = () => { grnCounter++; return `GRN-${format(new Date(), 'yyMM')}-${String(grnCounter).padStart(3, '0')}`; };

const isSameState = (gstin: string) => {
  if (!gstin || gstin.length < 2) return true;
  return gstin.substring(0, 2) === '27'; // Default Maharashtra
};

export default function PurchaseManagement() {
  const { toast } = useToast();
  const [pos, setPOs] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [inwards, setInwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [poDialog, setPODialog] = useState(false);
  const [billDialog, setBillDialog] = useState(false);
  const [inwardDialog, setInwardDialog] = useState(false);
  const [viewItem, setViewItem] = useState<{ type: string; data: any } | null>(null);

  // PO Form
  const [poForm, setPOForm] = useState({ po_number: '', supplier_name: '', supplier_gstin: '', supplier_phone: '', supplier_email: '', supplier_address: '', order_date: format(new Date(), 'yyyy-MM-dd'), expected_delivery: '', payment_terms: '', notes: '' });
  const [poLines, setPOLines] = useState<LineItem[]>([emptyLine()]);

  // Bill Form
  const [billForm, setBillForm] = useState({ bill_number: '', supplier_bill_number: '', supplier_name: '', supplier_gstin: '', po_id: '', bill_date: format(new Date(), 'yyyy-MM-dd'), due_date: '', payment_mode: '', notes: '' });
  const [billLines, setBillLines] = useState<LineItem[]>([emptyLine()]);

  // Inward Form
  const [inwardForm, setInwardForm] = useState({ grn_number: '', po_id: '', purchase_invoice_id: '', supplier_name: '', received_date: format(new Date(), 'yyyy-MM-dd'), received_by: '', warehouse: '', quality_status: 'pending', notes: '' });
  const [inwardLines, setInwardLines] = useState<{ product_name: string; sku: string; ordered_qty: number; received_qty: number; rejected_qty: number; rate: number }[]>([{ product_name: '', sku: '', ordered_qty: 0, received_qty: 0, rejected_qty: 0, rate: 0 }]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p, b, i] = await Promise.all([
        purchaseOrdersDb.getAll(search || undefined),
        purchaseInvoicesDb.getAll(search || undefined),
        inwardStockDb.getAll(search || undefined),
      ]);
      setPOs(p); setBills(b); setInwards(i);
      poCounter = p.length; billCounter = b.length; grnCounter = i.length;
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search]);

  // Calculate line totals
  const calcTotal = (lines: LineItem[]) => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
    const gstTotal = lines.reduce((s, l) => s + (l.quantity * l.rate * l.gst_percent / 100), 0);
    return { subtotal, gstTotal };
  };

  const updateLine = (lines: LineItem[], setLines: Function, idx: number, field: keyof LineItem, value: any) => {
    setLines((prev: LineItem[]) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      updated.total = updated.quantity * updated.rate;
      return updated;
    }));
  };

  // PO Handlers
  const openPODialog = () => {
    setPOForm({ po_number: genPO(), supplier_name: '', supplier_gstin: '', supplier_phone: '', supplier_email: '', supplier_address: '', order_date: format(new Date(), 'yyyy-MM-dd'), expected_delivery: '', payment_terms: '', notes: '' });
    setPOLines([emptyLine()]);
    setPODialog(true);
  };

  const handleCreatePO = async () => {
    if (!poForm.supplier_name.trim()) { toast({ title: 'Error', description: 'Supplier name required', variant: 'destructive' }); return; }
    if (poLines.every(l => !l.product_name.trim())) { toast({ title: 'Error', description: 'Add at least one item', variant: 'destructive' }); return; }
    const { subtotal, gstTotal } = calcTotal(poLines);
    const sameState = isSameState(poForm.supplier_gstin);
    try {
      await purchaseOrdersDb.create({
        ...poForm,
        items: poLines.filter(l => l.product_name.trim()),
        subtotal,
        cgst: sameState ? gstTotal / 2 : 0,
        sgst: sameState ? gstTotal / 2 : 0,
        igst: sameState ? 0 : gstTotal,
        total_amount: subtotal + gstTotal,
        status: 'draft',
      });
      toast({ title: 'Purchase Order Created', description: `${poForm.po_number} for ${poForm.supplier_name}` });
      setPODialog(false);
      fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  // Bill Handlers
  const openBillDialog = () => {
    setBillForm({ bill_number: genBill(), supplier_bill_number: '', supplier_name: '', supplier_gstin: '', po_id: '', bill_date: format(new Date(), 'yyyy-MM-dd'), due_date: '', payment_mode: '', notes: '' });
    setBillLines([emptyLine()]);
    setBillDialog(true);
  };

  const handleCreateBill = async () => {
    if (!billForm.supplier_name.trim()) { toast({ title: 'Error', description: 'Supplier name required', variant: 'destructive' }); return; }
    const { subtotal, gstTotal } = calcTotal(billLines);
    const sameState = isSameState(billForm.supplier_gstin);
    try {
      await purchaseInvoicesDb.create({
        ...billForm,
        po_id: billForm.po_id || null,
        items: billLines.filter(l => l.product_name.trim()),
        subtotal,
        cgst: sameState ? gstTotal / 2 : 0,
        sgst: sameState ? gstTotal / 2 : 0,
        igst: sameState ? 0 : gstTotal,
        total_amount: subtotal + gstTotal,
        payment_status: 'unpaid',
      });
      toast({ title: 'Purchase Bill Created', description: `${billForm.bill_number} — ${billForm.supplier_name}` });
      setBillDialog(false);
      fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  // Inward Handlers
  const openInwardDialog = () => {
    setInwardForm({ grn_number: genGRN(), po_id: '', purchase_invoice_id: '', supplier_name: '', received_date: format(new Date(), 'yyyy-MM-dd'), received_by: '', warehouse: '', quality_status: 'pending', notes: '' });
    setInwardLines([{ product_name: '', sku: '', ordered_qty: 0, received_qty: 0, rejected_qty: 0, rate: 0 }]);
    setInwardDialog(true);
  };

  const handleCreateInward = async () => {
    if (!inwardForm.supplier_name.trim()) { toast({ title: 'Error', description: 'Supplier name required', variant: 'destructive' }); return; }
    const totalReceived = inwardLines.reduce((s, l) => s + l.received_qty, 0);
    const totalRejected = inwardLines.reduce((s, l) => s + l.rejected_qty, 0);
    try {
      await inwardStockDb.create({
        ...inwardForm,
        po_id: inwardForm.po_id || null,
        purchase_invoice_id: inwardForm.purchase_invoice_id || null,
        items: inwardLines.filter(l => l.product_name.trim()),
        total_received: totalReceived,
        total_rejected: totalRejected,
      });
      toast({ title: 'Inward Stock Recorded', description: `${inwardForm.grn_number} — ${totalReceived} items received` });
      setInwardDialog(false);
      fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  // Stats
  const stats = useMemo(() => ({
    totalPOs: pos.length,
    openPOs: pos.filter(p => ['draft', 'sent', 'confirmed'].includes(p.status)).length,
    totalBills: bills.length,
    unpaidBills: bills.filter(b => b.payment_status === 'unpaid').length,
    totalInwards: inwards.length,
    totalPOValue: pos.reduce((s, p) => s + Number(p.total_amount || 0), 0),
    totalBillValue: bills.reduce((s, b) => s + Number(b.total_amount || 0), 0),
    totalReceived: inwards.reduce((s, i) => s + (i.total_received || 0), 0),
  }), [pos, bills, inwards]);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const renderLineItemEditor = (lines: LineItem[], setLines: Function) => (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
        <div className="col-span-3">Product</div><div className="col-span-2">SKU</div><div className="col-span-1">HSN</div><div className="col-span-1">Qty</div><div className="col-span-2">Rate (₹)</div><div className="col-span-1">GST%</div><div className="col-span-1">Total</div><div className="col-span-1"></div>
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-3 h-8 text-sm" placeholder="Product name" value={line.product_name} onChange={e => updateLine(lines, setLines, idx, 'product_name', e.target.value)} />
          <Input className="col-span-2 h-8 text-sm" placeholder="SKU" value={line.sku} onChange={e => updateLine(lines, setLines, idx, 'sku', e.target.value)} />
          <Input className="col-span-1 h-8 text-sm" placeholder="HSN" value={line.hsn_code} onChange={e => updateLine(lines, setLines, idx, 'hsn_code', e.target.value)} />
          <Input className="col-span-1 h-8 text-sm" type="number" value={line.quantity} onChange={e => updateLine(lines, setLines, idx, 'quantity', Number(e.target.value))} />
          <Input className="col-span-2 h-8 text-sm" type="number" value={line.rate} onChange={e => updateLine(lines, setLines, idx, 'rate', Number(e.target.value))} />
          <Input className="col-span-1 h-8 text-sm" type="number" value={line.gst_percent} onChange={e => updateLine(lines, setLines, idx, 'gst_percent', Number(e.target.value))} />
          <div className="col-span-1 text-sm font-semibold">{fmt(line.quantity * line.rate)}</div>
          <Button variant="ghost" size="sm" className="col-span-1 h-8 text-rose-600" onClick={() => setLines((p: LineItem[]) => p.filter((_, i) => i !== idx))} disabled={lines.length === 1}><XCircle className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setLines((p: LineItem[]) => [...p, emptyLine()])}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase & Inward Stock</h1>
          <p className="text-muted-foreground">Purchase orders, bills, goods receipt & inward stock management</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5 pb-4"><ClipboardList className="w-4 h-4 text-primary mb-1" /><p className="text-xl font-bold">{stats.totalPOs}</p><p className="text-xs text-muted-foreground">Purchase Orders ({stats.openPOs} open)</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><ReceiptText className="w-4 h-4 text-amber-600 mb-1" /><p className="text-xl font-bold">{stats.totalBills}</p><p className="text-xs text-muted-foreground">Purchase Bills ({stats.unpaidBills} unpaid)</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><ArrowDownToLine className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-xl font-bold">{stats.totalReceived.toLocaleString('en-IN')}</p><p className="text-xs text-muted-foreground">Items Received</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><IndianRupee className="w-4 h-4 text-blue-600 mb-1" /><p className="text-xl font-bold">{fmt(stats.totalPOValue)}</p><p className="text-xs text-muted-foreground">Total PO Value</p></CardContent></Card>
      </div>

      <Tabs defaultValue="po" className="space-y-4">
        <TabsList>
          <TabsTrigger value="po" className="gap-1.5"><ClipboardList className="w-4 h-4" />Purchase Orders</TabsTrigger>
          <TabsTrigger value="bills" className="gap-1.5"><ReceiptText className="w-4 h-4" />Purchase Bills</TabsTrigger>
          <TabsTrigger value="inward" className="gap-1.5"><ArrowDownToLine className="w-4 h-4" />Inward Stock</TabsTrigger>
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="po">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Purchase Orders</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-8 w-[200px]" placeholder="Search POs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                  <Button size="sm" onClick={openPODialog}><Plus className="w-4 h-4 mr-1" />Create PO</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>GSTIN</TableHead><TableHead>Order Date</TableHead><TableHead>Expected</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pos.map(po => {
                    const st = PO_STATUSES[po.status] || PO_STATUSES.draft;
                    const items = Array.isArray(po.items) ? po.items : [];
                    return (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono font-semibold">{po.po_number}</TableCell>
                        <TableCell className="font-medium">{po.supplier_name}</TableCell>
                        <TableCell className="text-xs font-mono">{po.supplier_gstin || '—'}</TableCell>
                        <TableCell>{po.order_date}</TableCell>
                        <TableCell>{po.expected_delivery || '—'}</TableCell>
                        <TableCell>{items.length} items</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(Number(po.total_amount || 0))}</TableCell>
                        <TableCell><Badge variant="outline" className={st.color}>{st.label}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => setViewItem({ type: 'po', data: po })}><Eye className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                  {pos.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No purchase orders yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Bills Tab */}
        <TabsContent value="bills">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Purchase Invoices / Bills</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-8 w-[200px]" placeholder="Search bills..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                  <Button size="sm" onClick={openBillDialog}><Plus className="w-4 h-4 mr-1" />Add Bill</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Bill #</TableHead><TableHead>Supplier Bill</TableHead><TableHead>Supplier</TableHead><TableHead>GSTIN</TableHead><TableHead>Date</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>GST</TableHead><TableHead>Payment</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {bills.map(b => {
                    const ps = PAYMENT_STATUSES[b.payment_status] || PAYMENT_STATUSES.unpaid;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-semibold">{b.bill_number}</TableCell>
                        <TableCell className="text-sm">{b.supplier_bill_number || '—'}</TableCell>
                        <TableCell className="font-medium">{b.supplier_name}</TableCell>
                        <TableCell className="text-xs font-mono">{b.supplier_gstin || '—'}</TableCell>
                        <TableCell>{b.bill_date}</TableCell>
                        <TableCell>{b.due_date || '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(Number(b.total_amount || 0))}</TableCell>
                        <TableCell className="text-xs">{fmt(Number(b.cgst || 0) + Number(b.sgst || 0) + Number(b.igst || 0))}</TableCell>
                        <TableCell><Badge variant="outline" className={ps.color}>{ps.label}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => setViewItem({ type: 'bill', data: b })}><Eye className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                  {bills.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No purchase bills yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inward Stock Tab */}
        <TabsContent value="inward">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Inward Stock / Goods Receipt</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-8 w-[200px]" placeholder="Search GRN..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                  <Button size="sm" onClick={openInwardDialog}><Plus className="w-4 h-4 mr-1" />Record Inward</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>GRN #</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead><TableHead>Warehouse</TableHead><TableHead className="text-center">Received</TableHead><TableHead className="text-center">Rejected</TableHead><TableHead>QC Status</TableHead><TableHead>Linked PO</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {inwards.map(iw => {
                    const qs = QC_STATUSES[iw.quality_status] || QC_STATUSES.pending;
                    const linkedPO = pos.find(p => p.id === iw.po_id);
                    return (
                      <TableRow key={iw.id}>
                        <TableCell className="font-mono font-semibold">{iw.grn_number}</TableCell>
                        <TableCell className="font-medium">{iw.supplier_name}</TableCell>
                        <TableCell>{iw.received_date}</TableCell>
                        <TableCell>{iw.warehouse || '—'}</TableCell>
                        <TableCell className="text-center font-semibold text-emerald-600">{iw.total_received || 0}</TableCell>
                        <TableCell className="text-center font-semibold text-rose-600">{iw.total_rejected || 0}</TableCell>
                        <TableCell><Badge variant="outline" className={qs.color}>{qs.label}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{linkedPO ? linkedPO.po_number : '—'}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => setViewItem({ type: 'inward', data: iw })}><Eye className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                  {inwards.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No inward stock records</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════ CREATE PO DIALOG ═══════════ */}
      <Dialog open={poDialog} onOpenChange={setPODialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>PO Number</Label><Input value={poForm.po_number} readOnly className="bg-muted" /></div>
              <div><Label>Order Date</Label><Input type="date" value={poForm.order_date} onChange={e => setPOForm(p => ({ ...p, order_date: e.target.value }))} /></div>
              <div><Label>Expected Delivery</Label><Input type="date" value={poForm.expected_delivery} onChange={e => setPOForm(p => ({ ...p, expected_delivery: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Supplier Name *</Label><Input placeholder="Supplier company name" value={poForm.supplier_name} onChange={e => setPOForm(p => ({ ...p, supplier_name: e.target.value }))} /></div>
              <div><Label>Supplier GSTIN</Label><Input placeholder="e.g. 27AABCR1234M1Z5" value={poForm.supplier_gstin} onChange={e => setPOForm(p => ({ ...p, supplier_gstin: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input placeholder="Contact number" value={poForm.supplier_phone} onChange={e => setPOForm(p => ({ ...p, supplier_phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input placeholder="supplier@email.com" value={poForm.supplier_email} onChange={e => setPOForm(p => ({ ...p, supplier_email: e.target.value }))} /></div>
            </div>
            <div><Label>Address</Label><Textarea placeholder="Supplier address" value={poForm.supplier_address} onChange={e => setPOForm(p => ({ ...p, supplier_address: e.target.value }))} rows={2} /></div>
            <div><Label>Payment Terms</Label><Input placeholder="e.g. Net 30, Advance 50%" value={poForm.payment_terms} onChange={e => setPOForm(p => ({ ...p, payment_terms: e.target.value }))} /></div>

            <div className="border-t pt-3">
              <Label className="text-sm font-semibold">Line Items</Label>
              {renderLineItemEditor(poLines, setPOLines)}
            </div>

            <div className="flex justify-between items-center border-t pt-3">
              <div className="text-sm space-y-1">
                <p>Subtotal: <strong>{fmt(calcTotal(poLines).subtotal)}</strong></p>
                <p>GST: <strong>{fmt(calcTotal(poLines).gstTotal)}</strong></p>
                <p className="text-lg">Total: <strong className="text-primary">{fmt(calcTotal(poLines).subtotal + calcTotal(poLines).gstTotal)}</strong></p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPODialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePO}>Create PO</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ CREATE BILL DIALOG ═══════════ */}
      <Dialog open={billDialog} onOpenChange={setBillDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Purchase Bill / Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Our Bill #</Label><Input value={billForm.bill_number} readOnly className="bg-muted" /></div>
              <div><Label>Supplier Bill #</Label><Input placeholder="Supplier's invoice number" value={billForm.supplier_bill_number} onChange={e => setBillForm(p => ({ ...p, supplier_bill_number: e.target.value }))} /></div>
              <div>
                <Label>Link to PO</Label>
                <Select value={billForm.po_id} onValueChange={v => {
                  const po = pos.find(p => p.id === v);
                  setBillForm(p => ({ ...p, po_id: v, supplier_name: po?.supplier_name || p.supplier_name, supplier_gstin: po?.supplier_gstin || p.supplier_gstin }));
                  if (po && Array.isArray(po.items)) {
                    setBillLines(po.items.map((item: any) => ({ product_name: item.product_name || '', sku: item.sku || '', hsn_code: item.hsn_code || '', quantity: item.quantity || 1, rate: item.rate || 0, gst_percent: item.gst_percent || 18, total: (item.quantity || 1) * (item.rate || 0) })));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {pos.map(p => <SelectItem key={p.id} value={p.id}>{p.po_number} — {p.supplier_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Supplier Name *</Label><Input value={billForm.supplier_name} onChange={e => setBillForm(p => ({ ...p, supplier_name: e.target.value }))} /></div>
              <div><Label>Supplier GSTIN</Label><Input value={billForm.supplier_gstin} onChange={e => setBillForm(p => ({ ...p, supplier_gstin: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Bill Date</Label><Input type="date" value={billForm.bill_date} onChange={e => setBillForm(p => ({ ...p, bill_date: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={billForm.due_date} onChange={e => setBillForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div><Label>Payment Mode</Label>
                <Select value={billForm.payment_mode} onValueChange={v => setBillForm(p => ({ ...p, payment_mode: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-3">
              <Label className="text-sm font-semibold">Line Items</Label>
              {renderLineItemEditor(billLines, setBillLines)}
            </div>

            <div className="flex justify-between items-center border-t pt-3">
              <div className="text-sm space-y-1">
                <p>Subtotal: <strong>{fmt(calcTotal(billLines).subtotal)}</strong></p>
                <p>GST: <strong>{fmt(calcTotal(billLines).gstTotal)}</strong></p>
                <p className="text-lg">Total: <strong className="text-primary">{fmt(calcTotal(billLines).subtotal + calcTotal(billLines).gstTotal)}</strong></p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBillDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateBill}>Save Bill</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ INWARD STOCK DIALOG ═══════════ */}
      <Dialog open={inwardDialog} onOpenChange={setInwardDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Inward Stock / Goods Receipt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>GRN Number</Label><Input value={inwardForm.grn_number} readOnly className="bg-muted" /></div>
              <div><Label>Received Date</Label><Input type="date" value={inwardForm.received_date} onChange={e => setInwardForm(p => ({ ...p, received_date: e.target.value }))} /></div>
              <div>
                <Label>Link to PO</Label>
                <Select value={inwardForm.po_id} onValueChange={v => {
                  const po = pos.find(p => p.id === v);
                  setInwardForm(p => ({ ...p, po_id: v, supplier_name: po?.supplier_name || p.supplier_name }));
                  if (po && Array.isArray(po.items)) {
                    setInwardLines(po.items.map((item: any) => ({ product_name: item.product_name || '', sku: item.sku || '', ordered_qty: item.quantity || 0, received_qty: 0, rejected_qty: 0, rate: item.rate || 0 })));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {pos.map(p => <SelectItem key={p.id} value={p.id}>{p.po_number} — {p.supplier_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Supplier Name *</Label><Input value={inwardForm.supplier_name} onChange={e => setInwardForm(p => ({ ...p, supplier_name: e.target.value }))} /></div>
              <div><Label>Received By</Label><Input placeholder="Person name" value={inwardForm.received_by} onChange={e => setInwardForm(p => ({ ...p, received_by: e.target.value }))} /></div>
              <div><Label>Warehouse</Label><Input placeholder="Warehouse location" value={inwardForm.warehouse} onChange={e => setInwardForm(p => ({ ...p, warehouse: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quality Check Status</Label>
                <Select value={inwardForm.quality_status} onValueChange={v => setInwardForm(p => ({ ...p, quality_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['pending', 'passed', 'partial', 'failed'].map(s => <SelectItem key={s} value={s}>{QC_STATUSES[s].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Link to Bill</Label>
                <Select value={inwardForm.purchase_invoice_id} onValueChange={v => setInwardForm(p => ({ ...p, purchase_invoice_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {bills.map(b => <SelectItem key={b.id} value={b.id}>{b.bill_number} — {b.supplier_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-3">
              <Label className="text-sm font-semibold">Received Items</Label>
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                  <div className="col-span-3">Product</div><div className="col-span-2">SKU</div><div className="col-span-1">Ordered</div><div className="col-span-2">Received</div><div className="col-span-2">Rejected</div><div className="col-span-1">Rate</div><div className="col-span-1"></div>
                </div>
                {inwardLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-3 h-8 text-sm" placeholder="Product" value={line.product_name} onChange={e => setInwardLines(p => p.map((l, i) => i === idx ? { ...l, product_name: e.target.value } : l))} />
                    <Input className="col-span-2 h-8 text-sm" placeholder="SKU" value={line.sku} onChange={e => setInwardLines(p => p.map((l, i) => i === idx ? { ...l, sku: e.target.value } : l))} />
                    <Input className="col-span-1 h-8 text-sm" type="number" value={line.ordered_qty} onChange={e => setInwardLines(p => p.map((l, i) => i === idx ? { ...l, ordered_qty: Number(e.target.value) } : l))} />
                    <Input className="col-span-2 h-8 text-sm" type="number" value={line.received_qty} onChange={e => setInwardLines(p => p.map((l, i) => i === idx ? { ...l, received_qty: Number(e.target.value) } : l))} />
                    <Input className="col-span-2 h-8 text-sm" type="number" value={line.rejected_qty} onChange={e => setInwardLines(p => p.map((l, i) => i === idx ? { ...l, rejected_qty: Number(e.target.value) } : l))} />
                    <Input className="col-span-1 h-8 text-sm" type="number" value={line.rate} onChange={e => setInwardLines(p => p.map((l, i) => i === idx ? { ...l, rate: Number(e.target.value) } : l))} />
                    <Button variant="ghost" size="sm" className="col-span-1 h-8 text-rose-600" onClick={() => setInwardLines(p => p.filter((_, i) => i !== idx))} disabled={inwardLines.length === 1}><XCircle className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setInwardLines(p => [...p, { product_name: '', sku: '', ordered_qty: 0, received_qty: 0, rejected_qty: 0, rate: 0 }])}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
              </div>
            </div>

            <div><Label>Notes</Label><Textarea placeholder="Any remarks about quality, damage..." value={inwardForm.notes} onChange={e => setInwardForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <Button variant="outline" onClick={() => setInwardDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateInward}>Save GRN</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ VIEW DETAIL DIALOG ═══════════ */}
      <Dialog open={!!viewItem} onOpenChange={open => !open && setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewItem?.type === 'po' ? `Purchase Order: ${viewItem?.data?.po_number}` : viewItem?.type === 'bill' ? `Purchase Bill: ${viewItem?.data?.bill_number}` : `GRN: ${viewItem?.data?.grn_number}`}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Supplier</p><p className="font-medium">{viewItem.data.supplier_name}</p></div>
                {viewItem.data.supplier_gstin && <div><p className="text-muted-foreground">GSTIN</p><p className="font-mono">{viewItem.data.supplier_gstin}</p></div>}
                {viewItem.type === 'po' && <>
                  <div><p className="text-muted-foreground">Order Date</p><p>{viewItem.data.order_date}</p></div>
                  <div><p className="text-muted-foreground">Expected Delivery</p><p>{viewItem.data.expected_delivery || '—'}</p></div>
                  <div><p className="text-muted-foreground">Status</p><Badge variant="outline" className={PO_STATUSES[viewItem.data.status]?.color}>{PO_STATUSES[viewItem.data.status]?.label}</Badge></div>
                  {viewItem.data.payment_terms && <div><p className="text-muted-foreground">Payment Terms</p><p>{viewItem.data.payment_terms}</p></div>}
                </>}
                {viewItem.type === 'bill' && <>
                  <div><p className="text-muted-foreground">Bill Date</p><p>{viewItem.data.bill_date}</p></div>
                  <div><p className="text-muted-foreground">Due Date</p><p>{viewItem.data.due_date || '—'}</p></div>
                  <div><p className="text-muted-foreground">Payment</p><Badge variant="outline" className={PAYMENT_STATUSES[viewItem.data.payment_status]?.color}>{PAYMENT_STATUSES[viewItem.data.payment_status]?.label}</Badge></div>
                </>}
                {viewItem.type === 'inward' && <>
                  <div><p className="text-muted-foreground">Received Date</p><p>{viewItem.data.received_date}</p></div>
                  <div><p className="text-muted-foreground">Warehouse</p><p>{viewItem.data.warehouse || '—'}</p></div>
                  <div><p className="text-muted-foreground">QC Status</p><Badge variant="outline" className={QC_STATUSES[viewItem.data.quality_status]?.color}>{QC_STATUSES[viewItem.data.quality_status]?.label}</Badge></div>
                  <div><p className="text-muted-foreground">Received By</p><p>{viewItem.data.received_by || '—'}</p></div>
                </>}
              </div>

              {/* Items Table */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      {viewItem.type === 'inward' ? <>
                        <TableHead className="text-center">Ordered</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="text-center">Rejected</TableHead>
                      </> : <>
                        <TableHead>HSN</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(viewItem.data.items) ? viewItem.data.items : []).map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku || '—'}</TableCell>
                        {viewItem.type === 'inward' ? <>
                          <TableCell className="text-center">{item.ordered_qty || 0}</TableCell>
                          <TableCell className="text-center font-semibold text-emerald-600">{item.received_qty || 0}</TableCell>
                          <TableCell className="text-center text-rose-600">{item.rejected_qty || 0}</TableCell>
                        </> : <>
                          <TableCell>{item.hsn_code || '—'}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{fmt(item.rate || 0)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt((item.quantity || 0) * (item.rate || 0))}</TableCell>
                        </>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {viewItem.type !== 'inward' && (
                <div className="flex justify-end">
                  <div className="text-sm space-y-1 text-right">
                    <p>Subtotal: <strong>{fmt(Number(viewItem.data.subtotal || 0))}</strong></p>
                    {Number(viewItem.data.cgst) > 0 && <p>CGST: {fmt(Number(viewItem.data.cgst))}</p>}
                    {Number(viewItem.data.sgst) > 0 && <p>SGST: {fmt(Number(viewItem.data.sgst))}</p>}
                    {Number(viewItem.data.igst) > 0 && <p>IGST: {fmt(Number(viewItem.data.igst))}</p>}
                    <p className="text-lg border-t pt-1">Total: <strong className="text-primary">{fmt(Number(viewItem.data.total_amount || 0))}</strong></p>
                  </div>
                </div>
              )}

              {viewItem.data.notes && (
                <div className="border-t pt-3"><p className="text-muted-foreground text-xs mb-1">Notes</p><p className="text-sm">{viewItem.data.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
