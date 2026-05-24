import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText, Receipt, ArrowDownUp, Download, FileSpreadsheet, FileDown,
  Plus, IndianRupee, TrendingUp, TrendingDown, Calculator, Building2,
  ArrowUp, ArrowDown, ArrowUpDown, Percent, Eye, Trash2, Info, BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { GlobalDateFilter, type DateRange } from '@/components/GlobalDateFilter';
import ChannelPnLComponent from '@/components/finance/ChannelPnL';

// ── GSTIN Auto-fill (populated from DB in future) ──
const gstinDatabase: Record<string, { name: string; address: string; state: string; stateCode: string; taxStatus: 'Regular' | 'Composition' }> = {};

const SELLER_STATE_CODE = '27'; // Maharashtra

// ── Line Item Types ──
interface LineItem {
  product: string;
  hsnCode: string;
  qty: string;
  rate: string;
  gstRate: string;
  size: string;
}

const SIZES = ['M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', 'Freesize'];

function createEmptyLineItem(): LineItem {
  return { product: '', hsnCode: '', qty: '1', rate: '', gstRate: '18', size: 'Freesize' };
}

function calcLineGst(item: LineItem, isSameState: boolean) {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const gstPct = parseFloat(item.gstRate) || 0;
  const taxable = qty * rate;
  const gstAmt = taxable * gstPct / 100;
  if (isSameState) {
    return { taxable, cgst: gstAmt / 2, sgst: gstAmt / 2, igst: 0, total: taxable + gstAmt };
  }
  return { taxable, cgst: 0, sgst: 0, igst: gstAmt, total: taxable + gstAmt };
}

// Auto invoice number generator
let invoiceCounter = 4;
function generateInvoiceNumber(type: string): string {
  invoiceCounter++;
  const prefix = type === 'Sales Invoice' ? 'INV' : type === 'Debit Note' ? 'DN' : 'CN';
  return `${prefix}-2026-${String(invoiceCounter).padStart(3, '0')}`;
}

let purchaseCounter = 4;
function generatePurchaseNumber(): string {
  purchaseCounter++;
  return `PB-${String(purchaseCounter).padStart(3, '0')}`;
}

// ── Helpers ──
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
}

// ── Component ──
export default function FinanceTaxation() {
  const { toast } = useToast();
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Invoice dialog state
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [invoiceType, setInvoiceType] = useState<string>('Sales Invoice');
  const [invoiceSort, setInvoiceSort] = useState<{ field: string; dir: SortDir }>({ field: 'date', dir: 'desc' });

  // Purchase bill state
  const [billSort, setBillSort] = useState<{ field: string; dir: SortDir }>({ field: 'date', dir: 'desc' });
  const [purchaseDialog, setPurchaseDialog] = useState(false);

  // Invoice form with multi-product + additional fields
  const [invForm, setInvForm] = useState({
    customer: '', gstin: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    poNumber: '', ewayBill: '', paymentMethod: 'Bank' as 'Cash' | 'Bank' | 'Credit',
    autoFilledName: '', autoFilledAddress: '', autoFilledTaxStatus: '',
  });
  const [invLineItems, setInvLineItems] = useState<LineItem[]>([createEmptyLineItem()]);
  const [invAutoNumber, setInvAutoNumber] = useState('');

  // Purchase form
  const [purchForm, setPurchForm] = useState({
    supplier: '', gstin: '', billNo: '', date: format(new Date(), 'yyyy-MM-dd'),
    autoFilledName: '', autoFilledAddress: '', autoFilledTaxStatus: '',
  });
  const [purchLineItems, setPurchLineItems] = useState<LineItem[]>([createEmptyLineItem()]);

  // Quotation state
  const [quotationDialog, setQuotationDialog] = useState(false);
  const [quotationGstin, setQuotationGstin] = useState('');
  const [quotationCustomer, setQuotationCustomer] = useState('');
  const [quotationItems, setQuotationItems] = useState<LineItem[]>([createEmptyLineItem()]);

  // GSTR-1 guide
  const [gstr1GuideOpen, setGstr1GuideOpen] = useState(false);

  // Determine if same state based on GSTIN
  const isSameState = (gstin: string) => {
    if (gstin.length >= 2) {
      return gstin.substring(0, 2) === SELLER_STATE_CODE;
    }
    return true;
  };

  // Quotation helpers
  const quotationSameState = isSameState(quotationGstin);
  const addQuotationItem = () => setQuotationItems(prev => [...prev, createEmptyLineItem()]);
  const removeQuotationItem = (idx: number) => setQuotationItems(prev => prev.filter((_, i) => i !== idx));
  const updateQuotationItem = (idx: number, field: keyof LineItem, value: string) => setQuotationItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const quotationTotals = useMemo(() => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, total = 0;
    quotationItems.forEach(item => {
      const calc = calcLineGst(item, quotationSameState);
      taxable += calc.taxable; cgst += calc.cgst; sgst += calc.sgst; igst += calc.igst; total += calc.total;
    });
    return { taxable, cgst, sgst, igst, total };
  }, [quotationItems, quotationSameState]);

  const mockQuotations: any[] = [];

  // DB-backed data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<any[]>([]);

  // load invoices and purchase bills from DB
  useMemo(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const inv = await db.invoicesDb.getAll().catch(() => []);
        const pb = await db.purchaseInvoicesDb.getAll().catch(() => []);
        if (!mounted) return;
        setInvoices(inv || []);
        setPurchaseBills(pb || []);
      } catch (e) { console.debug('load invoices failed', e); }
    })();
    return () => { mounted = false; };
  }, []);

  const gstr1 = useMemo(() => invoices.filter(i => i.type === 'Sales Invoice').map(i => ({
    gstin: i.gstin,
    invoiceNo: i.id,
    date: i.invoice_date || i.date,
    customer: i.customer || i.party_name || i.customer_name,
    taxableValue: i.taxableValue || i.taxable_value || i.taxable || 0,
    cgst: i.cgst || 0,
    sgst: i.sgst || 0,
    igst: i.igst || 0,
    total: i.total || i.amount || 0,
  })), [invoices]);

  // GSTIN auto-fill
  const handleGstinChange = (gstin: string, target: 'invoice' | 'purchase') => {
    const upper = gstin.toUpperCase();
    if (target === 'invoice') {
      setInvForm(f => ({ ...f, gstin: upper }));
      if (upper.length === 15 && gstinDatabase[upper]) {
        const data = gstinDatabase[upper];
        setInvForm(f => ({
          ...f, gstin: upper, customer: data.name,
          autoFilledName: data.name, autoFilledAddress: data.address, autoFilledTaxStatus: data.taxStatus,
        }));
        toast({ title: 'GSTIN Auto-Filled', description: `${data.name} — ${data.state} (${data.taxStatus})` });
      }
    } else {
      setPurchForm(f => ({ ...f, gstin: upper }));
      if (upper.length === 15 && gstinDatabase[upper]) {
        const data = gstinDatabase[upper];
        setPurchForm(f => ({
          ...f, gstin: upper, supplier: data.name,
          autoFilledName: data.name, autoFilledAddress: data.address, autoFilledTaxStatus: data.taxStatus,
        }));
        toast({ title: 'GSTIN Auto-Filled', description: `${data.name} — ${data.state} (${data.taxStatus})` });
      }
    }
  };

  // Invoice line items
  const addInvLineItem = () => setInvLineItems(prev => [...prev, createEmptyLineItem()]);
  const removeInvLineItem = (idx: number) => setInvLineItems(prev => prev.filter((_, i) => i !== idx));
  const updateInvLineItem = (idx: number, field: keyof LineItem, value: string) => setInvLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  // Purchase line items
  const addPurchLineItem = () => setPurchLineItems(prev => [...prev, createEmptyLineItem()]);
  const removePurchLineItem = (idx: number) => setPurchLineItems(prev => prev.filter((_, i) => i !== idx));
  const updatePurchLineItem = (idx: number, field: keyof LineItem, value: string) => setPurchLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  // Invoice totals
  const invSameState = isSameState(invForm.gstin);
  const invTotals = useMemo(() => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, total = 0;
    invLineItems.forEach(item => {
      const calc = calcLineGst(item, invSameState);
      taxable += calc.taxable;
      cgst += calc.cgst;
      sgst += calc.sgst;
      igst += calc.igst;
      total += calc.total;
    });
    return { taxable, cgst, sgst, igst, total };
  }, [invLineItems, invSameState]);

  // Purchase totals
  const purchSameState = isSameState(purchForm.gstin);
  const purchTotals = useMemo(() => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, total = 0;
    purchLineItems.forEach(item => {
      const calc = calcLineGst(item, purchSameState);
      taxable += calc.taxable;
      cgst += calc.cgst;
      sgst += calc.sgst;
      igst += calc.igst;
      total += calc.total;
    });
    return { taxable, cgst, sgst, igst, total };
  }, [purchLineItems, purchSameState]);

  const toggleInvSort = (field: string) => {
    setInvoiceSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  };
  const toggleBillSort = (field: string) => {
    setBillSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  };

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const dir = invoiceSort.dir === 'asc' ? 1 : -1;
      const f = invoiceSort.field;
      if (f === 'date') return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
      if (f === 'total') return dir * (a.total - b.total);
      if (f === 'taxableValue') return dir * (a.taxableValue - b.taxableValue);
      return dir * ((a as any)[f] ?? '').toString().localeCompare(((b as any)[f] ?? '').toString());
    });
  }, [invoiceSort]);

  const sortedBills = useMemo(() => {
    return [...purchaseBills].sort((a, b) => {
      const dir = billSort.dir === 'asc' ? 1 : -1;
      const f = billSort.field;
      if (f === 'date') return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
      if (f === 'total') return dir * (a.total - b.total);
      return dir * ((a as any)[f] ?? '').toString().localeCompare(((b as any)[f] ?? '').toString());
    });
  }, [billSort]);

  const openInvoiceDialog = (type: string) => {
    setInvoiceType(type);
    setInvAutoNumber(generateInvoiceNumber(type));
    setInvForm({ customer: '', gstin: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'), poNumber: '', ewayBill: '', paymentMethod: 'Bank', autoFilledName: '', autoFilledAddress: '', autoFilledTaxStatus: '' });
    setInvLineItems([createEmptyLineItem()]);
    setInvoiceDialog(true);
  };

  const handleCreateInvoice = () => {
    const errors: string[] = [];
    if (!invForm.customer.trim()) errors.push('Customer name');
    if (!invForm.gstin.trim() || invForm.gstin.length < 15) errors.push('Valid GSTIN (15 characters)');
    if (!invForm.invoiceDate) errors.push('Invoice date');
    const hasLineItems = invLineItems.some(i => i.product.trim() && parseFloat(i.rate) > 0);
    if (!hasLineItems) errors.push('At least one line item with product name and rate');
    if (errors.length > 0) {
      toast({ title: 'Validation Error', description: `Missing: ${errors.join(', ')}`, variant: 'destructive' });
      return;
    }
    toast({
      title: `${invoiceType} Created`,
      description: `${invAutoNumber} — ${invForm.customer} — Total: ${fmt(invTotals.total)} ${invSameState ? '(CGST+SGST)' : '(IGST)'}`,
    });
    setInvoiceDialog(false);
  };

  const openPurchaseDialog = () => {
    setPurchForm({ supplier: '', gstin: '', billNo: generatePurchaseNumber(), date: format(new Date(), 'yyyy-MM-dd'), autoFilledName: '', autoFilledAddress: '', autoFilledTaxStatus: '' });
    setPurchLineItems([createEmptyLineItem()]);
    setPurchaseDialog(true);
  };

  const handleCreatePurchase = () => {
    const errors: string[] = [];
    if (!purchForm.supplier.trim()) errors.push('Supplier name');
    if (!purchForm.gstin.trim() || purchForm.gstin.length < 15) errors.push('Valid GSTIN (15 characters)');
    if (!purchForm.date) errors.push('Bill date');
    const hasLineItems = purchLineItems.some(i => i.product.trim() && parseFloat(i.rate) > 0);
    if (!hasLineItems) errors.push('At least one line item with product name and rate');
    if (errors.length > 0) {
      toast({ title: 'Validation Error', description: `Missing: ${errors.join(', ')}`, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Purchase Bill Created',
      description: `${purchForm.billNo} — ${purchForm.supplier} — Total: ${fmt(purchTotals.total)} — Input GST: ${fmt(purchTotals.cgst + purchTotals.sgst + purchTotals.igst)}`,
    });
    setPurchaseDialog(false);
  };

  const handleExport = (what: string, format: 'excel' | 'pdf' | 'txt') => {
    toast({ title: `Export ${format.toUpperCase()}`, description: `Preparing ${what} export...` });
  };

  const handleGstr1CsvExport = () => {
    // Generate CSV matching GSTN offline utility B2B format
    const headers = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount'];
    const rows = gstr1.map(r => {
      const gstInfo = gstinDatabase[r.gstin];
      const stateCode = r.gstin.substring(0, 2);
      const rate = r.igst > 0 ? ((r.igst / r.taxableValue) * 100).toFixed(0) : ((r.cgst + r.sgst) / r.taxableValue * 100).toFixed(0);
      return [r.gstin, r.customer, r.invoiceNo, format(new Date(r.date), 'dd-MMM-yyyy'), r.total.toString(), `${stateCode}-${gstInfo?.state || 'State'}`, 'N', '', 'Regular', '', rate, r.taxableValue.toString(), '0'];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_B2B_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'GSTR-1 CSV Exported', description: 'B2B format CSV downloaded — ready for GST offline utility upload.' });
  };

  const totalInputGst = purchaseBills.reduce((s, b) => s + (b.inputGst || (b.cgst || 0) + (b.sgst || 0) + (b.igst || 0)), 0);
  const totalOutputGst = invoices.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const netProfit = totalRevenue - totalOutputGst;
  const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  const kpis = [
    { label: 'Total Revenue', value: fmt(totalRevenue), icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Net Profit', value: fmt(netProfit), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Margin', value: `${marginPct}%`, icon: Percent, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Output GST', value: fmt(totalOutputGst), icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Input GST Credit', value: fmt(totalInputGst), icon: Calculator, color: 'text-violet-600', bg: 'bg-violet-500/10' },
    { label: 'Net GST Payable', value: fmt(totalOutputGst - totalInputGst), icon: Building2, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  ];

  // Line Items Table Component
  const LineItemsTable = ({ items, onUpdate, onRemove, onAdd, sameState }: {
    items: LineItem[];
    onUpdate: (idx: number, field: keyof LineItem, value: string) => void;
    onRemove: (idx: number) => void;
    onAdd: () => void;
    sameState: boolean;
  }) => (
    <div className="space-y-3">
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold text-xs min-w-[140px]">Product</TableHead>
              <TableHead className="font-semibold text-xs w-[80px]">HSN</TableHead>
              <TableHead className="font-semibold text-xs w-[70px]">Size</TableHead>
              <TableHead className="font-semibold text-xs w-[55px]">Qty</TableHead>
              <TableHead className="font-semibold text-xs w-[80px]">Rate</TableHead>
              <TableHead className="font-semibold text-xs w-[60px]">GST%</TableHead>
              {sameState ? (
                <>
                  <TableHead className="font-semibold text-xs text-right w-[70px]">CGST</TableHead>
                  <TableHead className="font-semibold text-xs text-right w-[70px]">SGST</TableHead>
                </>
              ) : (
                <TableHead className="font-semibold text-xs text-right w-[70px]">IGST</TableHead>
              )}
              <TableHead className="font-semibold text-xs text-right w-[90px]">Total</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => {
              const calc = calcLineGst(item, sameState);
              return (
                <TableRow key={idx}>
                  <TableCell><Input className="h-8 text-xs" placeholder="Product name" value={item.product} onChange={e => onUpdate(idx, 'product', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-xs" placeholder="HSN" value={item.hsnCode} onChange={e => onUpdate(idx, 'hsnCode', e.target.value)} /></TableCell>
                  <TableCell>
                    <select className="h-8 w-full border rounded px-1 text-xs bg-background" value={item.size} onChange={e => onUpdate(idx, 'size', e.target.value)}>
                      {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </TableCell>
                  <TableCell><Input className="h-8 text-xs" type="number" min="1" value={item.qty} onChange={e => onUpdate(idx, 'qty', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-xs" type="number" placeholder="₹" value={item.rate} onChange={e => onUpdate(idx, 'rate', e.target.value)} /></TableCell>
                  <TableCell>
                    <select className="h-8 w-full border rounded px-1 text-xs bg-background" value={item.gstRate} onChange={e => onUpdate(idx, 'gstRate', e.target.value)}>
                      <option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                    </select>
                  </TableCell>
                  {sameState ? (
                    <>
                      <TableCell className="text-right text-xs font-medium">{calc.cgst > 0 ? fmt(calc.cgst) : '—'}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{calc.sgst > 0 ? fmt(calc.sgst) : '—'}</TableCell>
                    </>
                  ) : (
                    <TableCell className="text-right text-xs font-medium">{calc.igst > 0 ? fmt(calc.igst) : '—'}</TableCell>
                  )}
                  <TableCell className="text-right text-xs font-bold">{calc.total > 0 ? fmt(calc.total) : '—'}</TableCell>
                  <TableCell>
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onRemove(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" className="gap-1" onClick={onAdd}>
        <Plus className="w-3 h-3" />Add Product
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance & Taxation</h1>
          <p className="text-muted-foreground">Invoicing, purchase bills, GST filing & profitability</p>
        </div>
        <div className="flex items-center gap-2">
          <GlobalDateFilter value={globalDateRange} onChange={setGlobalDateRange} />
          <Button variant="outline" className="gap-2" onClick={() => handleExport('Finance Data', 'excel')}>
            <FileSpreadsheet className="w-4 h-4" />Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleExport('Finance Data', 'pdf')}>
            <FileDown className="w-4 h-4" />PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleExport('Finance Data', 'txt')}>
            <FileText className="w-4 h-4" />TXT
          </Button>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${k.bg}`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              </div>
              <p className="text-xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="invoices" className="gap-1.5"><FileText className="w-4 h-4" />Invoices</TabsTrigger>
          <TabsTrigger value="quotations" className="gap-1.5"><FileText className="w-4 h-4" />Quotations</TabsTrigger>
          <TabsTrigger value="purchase" className="gap-1.5"><Receipt className="w-4 h-4" />Purchase Bills</TabsTrigger>
          <TabsTrigger value="gstr1" className="gap-1.5"><Building2 className="w-4 h-4" />GSTR-1 Export</TabsTrigger>
          <TabsTrigger value="pnl" className="gap-1.5"><TrendingUp className="w-4 h-4" />Profit & Loss</TabsTrigger>
        </TabsList>

        {/* ── INVOICES TAB ── */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2" onClick={() => openInvoiceDialog('Sales Invoice')}>
              <Plus className="w-4 h-4" />Sales Invoice
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => openInvoiceDialog('Debit Note')}>
              <Plus className="w-4 h-4" />Debit Note
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => openInvoiceDialog('Credit Note')}>
              <Plus className="w-4 h-4" />Credit Note
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Invoices', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" />Excel</Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Invoices', 'pdf')}><FileDown className="w-3.5 h-3.5" />PDF</Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Invoices', 'txt')}><FileText className="w-3.5 h-3.5" />TXT</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleInvSort('id')}>
                      <span className="flex items-center">Invoice #<SortIcon active={invoiceSort.field === 'id'} dir={invoiceSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleInvSort('customer')}>
                      <span className="flex items-center">Customer<SortIcon active={invoiceSort.field === 'customer'} dir={invoiceSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold">GSTIN</TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleInvSort('date')}>
                      <span className="flex items-center">Date<SortIcon active={invoiceSort.field === 'date'} dir={invoiceSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => toggleInvSort('taxableValue')}>
                      <span className="flex items-center justify-end">Taxable<SortIcon active={invoiceSort.field === 'taxableValue'} dir={invoiceSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right">CGST</TableHead>
                    <TableHead className="font-semibold text-right">SGST</TableHead>
                    <TableHead className="font-semibold text-right">IGST</TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => toggleInvSort('total')}>
                      <span className="flex items-center justify-end">Total<SortIcon active={invoiceSort.field === 'total'} dir={invoiceSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold">PO #</TableHead>
                    <TableHead className="font-semibold">E-way Bill</TableHead>
                    <TableHead className="font-semibold">Payment</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                      <TableCell>
                        <Badge variant={inv.type === 'Sales Invoice' ? 'default' : inv.type === 'Debit Note' ? 'secondary' : 'outline'}>
                          {inv.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{inv.customer}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{inv.gstin}</TableCell>
                      <TableCell className="text-sm">{format(new Date(inv.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(inv.taxableValue)}</TableCell>
                      <TableCell className="text-right text-sm">{inv.cgst > 0 ? fmt(inv.cgst) : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{inv.sgst > 0 ? fmt(inv.sgst) : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{inv.igst > 0 ? fmt(inv.igst) : '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(inv.total)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{inv.poNumber || '—'}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{inv.ewayBill || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          inv.paymentMethod === 'Cash' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                          inv.paymentMethod === 'Credit' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                          'bg-blue-500/10 text-blue-600 border-blue-500/30'
                        }>{inv.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                          inv.status === 'Pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                          'bg-blue-500/10 text-blue-600 border-blue-500/30'
                        }>{inv.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toast({ title: 'PDF Downloaded', description: `${inv.id} saved` })}>
                          <Download className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── QUOTATIONS TAB ── */}
        <TabsContent value="quotations" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2" onClick={() => setQuotationDialog(true)}><Plus className="w-4 h-4" />New Quotation</Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Quotations', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" />Excel</Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Quotations', 'txt')}><FileText className="w-3.5 h-3.5" />TXT</Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Quotation #</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                    <TableHead className="font-semibold">Valid Till</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockQuotations.map(q => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-sm">{q.id}</TableCell>
                      <TableCell className="font-medium">{q.customer}</TableCell>
                      <TableCell className="text-sm">{format(new Date(q.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{q.items} items</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(q.total)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(q.validTill), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          q.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                          q.status === 'Sent' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                          q.status === 'Draft' ? 'bg-muted text-muted-foreground' :
                          'bg-rose-500/10 text-rose-600 border-rose-500/30'
                        }>{q.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: 'PDF Downloaded', description: `${q.id} saved` })}><Download className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Converted to Invoice', description: `${q.id} → Invoice created` })}><FileText className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PURCHASE BILLS TAB ── */}
        <TabsContent value="purchase" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2" onClick={openPurchaseDialog}>
              <Plus className="w-4 h-4" />Add Purchase Bill
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Purchase Bills', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" />Excel</Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Purchase Bills', 'pdf')}><FileDown className="w-3.5 h-3.5" />PDF</Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Purchase Bills', 'txt')}><FileText className="w-3.5 h-3.5" />TXT</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground mb-1">Total Input GST (CGST+SGST)</p><p className="text-xl font-bold">{fmt(purchaseBills.reduce((s, b) => s + (b.cgst || 0) + (b.sgst || 0), 0))}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground mb-1">Total Input IGST</p><p className="text-xl font-bold">{fmt(purchaseBills.reduce((s, b) => s + (b.igst || 0), 0))}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground mb-1">Total Input Tax Credit</p><p className="text-xl font-bold text-emerald-600">{fmt(totalInputGst)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Bill Ledger</CardTitle>
              <CardDescription>Supplier bills with input GST tracking</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleBillSort('supplier')}>
                      <span className="flex items-center">Supplier<SortIcon active={billSort.field === 'supplier'} dir={billSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold">GSTIN</TableHead>
                    <TableHead className="font-semibold">Bill No</TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleBillSort('date')}>
                      <span className="flex items-center">Date<SortIcon active={billSort.field === 'date'} dir={billSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right">Taxable</TableHead>
                    <TableHead className="font-semibold text-right">CGST</TableHead>
                    <TableHead className="font-semibold text-right">SGST</TableHead>
                    <TableHead className="font-semibold text-right">IGST</TableHead>
                    <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => toggleBillSort('total')}>
                      <span className="flex items-center justify-end">Total<SortIcon active={billSort.field === 'total'} dir={billSort.dir} /></span>
                    </TableHead>
                    <TableHead className="font-semibold text-right">Input GST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBills.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.supplier}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{b.gstin}</TableCell>
                      <TableCell className="font-mono text-sm">{b.billNo}</TableCell>
                      <TableCell className="text-sm">{format(new Date(b.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(b.taxableValue)}</TableCell>
                      <TableCell className="text-right text-sm">{b.cgst > 0 ? fmt(b.cgst) : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{b.sgst > 0 ? fmt(b.sgst) : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{b.igst > 0 ? fmt(b.igst) : '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(b.total)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">{fmt(b.inputGst)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GSTR-1 EXPORT TAB ── */}
        <TabsContent value="gstr1" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="gap-1"><Building2 className="w-3 h-3" />GSTR-1 Ready Data</Badge>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setGstr1GuideOpen(true)}>
                <BookOpen className="w-4 h-4" />Upload Guide
              </Button>
              <Button className="gap-2" onClick={handleGstr1CsvExport}>
                <Download className="w-4 h-4" />Export GSTR-1 CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('GSTR-1', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" />Excel</Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('GSTR-1', 'txt')}><FileText className="w-3.5 h-3.5" />TXT</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground mb-1">Total Taxable Value</p><p className="text-lg font-bold">{fmt(gstr1.reduce((s, r) => s + r.taxableValue, 0))}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground mb-1">Total CGST</p><p className="text-lg font-bold">{fmt(gstr1.reduce((s, r) => s + r.cgst, 0))}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground mb-1">Total SGST</p><p className="text-lg font-bold">{fmt(gstr1.reduce((s, r) => s + r.sgst, 0))}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground mb-1">Total IGST</p><p className="text-lg font-bold">{fmt(gstr1.reduce((s, r) => s + r.igst, 0))}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GSTR-1 Data Extract</CardTitle>
              <CardDescription>Sales invoices formatted for GST portal filing — B2B section</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">GSTIN</TableHead>
                    <TableHead className="font-semibold">Invoice No</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold text-right">Taxable Value</TableHead>
                    <TableHead className="font-semibold text-right">CGST</TableHead>
                    <TableHead className="font-semibold text-right">SGST</TableHead>
                    <TableHead className="font-semibold text-right">IGST</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gstr1.map(r => (
                    <TableRow key={r.invoiceNo}>
                      <TableCell className="font-mono text-xs">{r.gstin}</TableCell>
                      <TableCell className="font-mono text-sm">{r.invoiceNo}</TableCell>
                      <TableCell className="text-sm">{format(new Date(r.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{r.customer}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(r.taxableValue)}</TableCell>
                      <TableCell className="text-right text-sm">{r.cgst > 0 ? fmt(r.cgst) : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{r.sgst > 0 ? fmt(r.sgst) : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{r.igst > 0 ? fmt(r.igst) : '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROFIT & LOSS TAB ── */}
        <TabsContent value="pnl" className="space-y-4 mt-4">
          <ChannelPnLComponent />
        </TabsContent>
      </Tabs>

      {/* ── Invoice Creation Dialog (Multi-Product) ── */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Create {invoiceType}
              <Badge variant="outline" className="font-mono text-xs">{invAutoNumber}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Customer + GSTIN */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSTIN *</Label>
                <Input placeholder="e.g. 27AAACR5055K1ZY" maxLength={15} value={invForm.gstin} onChange={e => handleGstinChange(e.target.value, 'invoice')} />
                {invForm.autoFilledTaxStatus && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <p className="font-medium text-foreground">{invForm.autoFilledName}</p>
                    <p>{invForm.autoFilledAddress}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{invForm.autoFilledTaxStatus}</Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input placeholder="Auto-filled or enter manually" value={invForm.customer} onChange={e => setInvForm(f => ({ ...f, customer: e.target.value }))} />
              </div>
            </div>

            {/* Additional Invoice Fields */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input type="date" value={invForm.invoiceDate} onChange={e => setInvForm(f => ({ ...f, invoiceDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input placeholder="PO-XXXX" value={invForm.poNumber} onChange={e => setInvForm(f => ({ ...f, poNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>E-way Bill No.</Label>
                <Input placeholder="EWB-XXXXXX" value={invForm.ewayBill} onChange={e => setInvForm(f => ({ ...f, ewayBill: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={invForm.paymentMethod} onValueChange={v => setInvForm(f => ({ ...f, paymentMethod: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* GST Split Indicator */}
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                GST Split: {invSameState ? (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">Same State → CGST + SGST</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Inter State → IGST</Badge>
                )}
              </span>
            </div>

            {/* Multi-Product Line Items */}
            <div>
              <Label className="mb-2 block">Line Items</Label>
              <LineItemsTable
                items={invLineItems}
                onUpdate={updateInvLineItem}
                onRemove={removeInvLineItem}
                onAdd={addInvLineItem}
                sameState={invSameState}
              />
            </div>

            {/* Totals */}
            {invTotals.taxable > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="grid grid-cols-5 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Taxable</p><p className="font-semibold">{fmt(invTotals.taxable)}</p></div>
                    {invSameState ? (
                      <>
                        <div><p className="text-muted-foreground text-xs">CGST</p><p className="font-semibold">{fmt(invTotals.cgst)}</p></div>
                        <div><p className="text-muted-foreground text-xs">SGST</p><p className="font-semibold">{fmt(invTotals.sgst)}</p></div>
                      </>
                    ) : (
                      <div className="col-span-2"><p className="text-muted-foreground text-xs">IGST</p><p className="font-semibold">{fmt(invTotals.igst)}</p></div>
                    )}
                    <div><p className="text-muted-foreground text-xs">Items</p><p className="font-semibold">{invLineItems.length}</p></div>
                    <div><p className="text-muted-foreground text-xs">Grand Total</p><p className="font-bold text-primary text-lg">{fmt(invTotals.total)}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" onClick={handleCreateInvoice}>
              Create {invoiceType} & Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Purchase Bill Dialog (Multi-Product) ── */}
      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Add Purchase Bill
              <Badge variant="outline" className="font-mono text-xs">{purchForm.billNo}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier GSTIN *</Label>
                <Input placeholder="e.g. 27AABCR1234M1Z5" maxLength={15} value={purchForm.gstin} onChange={e => handleGstinChange(e.target.value, 'purchase')} />
                {purchForm.autoFilledTaxStatus && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <p className="font-medium text-foreground">{purchForm.autoFilledName}</p>
                    <p>{purchForm.autoFilledAddress}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{purchForm.autoFilledTaxStatus}</Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Supplier Name *</Label>
                <Input placeholder="Auto-filled or enter manually" value={purchForm.supplier} onChange={e => setPurchForm(f => ({ ...f, supplier: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bill Date *</Label>
                <Input type="date" value={purchForm.date} onChange={e => setPurchForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bill Number</Label>
                <Input value={purchForm.billNo} onChange={e => setPurchForm(f => ({ ...f, billNo: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                GST Split: {purchSameState ? (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">Same State → CGST + SGST</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Inter State → IGST</Badge>
                )}
              </span>
            </div>

            <div>
              <Label className="mb-2 block">Line Items</Label>
              <LineItemsTable
                items={purchLineItems}
                onUpdate={updatePurchLineItem}
                onRemove={removePurchLineItem}
                onAdd={addPurchLineItem}
                sameState={purchSameState}
              />
            </div>

            {purchTotals.taxable > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Taxable</p><p className="font-semibold">{fmt(purchTotals.taxable)}</p></div>
                    <div><p className="text-muted-foreground text-xs">Input GST</p><p className="font-semibold text-emerald-600">{fmt(purchTotals.cgst + purchTotals.sgst + purchTotals.igst)}</p></div>
                    <div><p className="text-muted-foreground text-xs">Items</p><p className="font-semibold">{purchLineItems.length}</p></div>
                    <div><p className="text-muted-foreground text-xs">Grand Total</p><p className="font-bold text-primary text-lg">{fmt(purchTotals.total)}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" onClick={handleCreatePurchase}>
              Add Purchase Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quotation Dialog */}
      <Dialog open={quotationDialog} onOpenChange={setQuotationDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Quotation</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input placeholder="e.g. 27AAACR5055K1ZY" maxLength={15} value={quotationGstin} onChange={e => { setQuotationGstin(e.target.value.toUpperCase()); }} />
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input placeholder="Customer name" value={quotationCustomer} onChange={e => setQuotationCustomer(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                GST Split: {quotationSameState ? (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">Same State → CGST + SGST</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Inter State → IGST</Badge>
                )}
              </span>
            </div>

            <div>
              <Label className="mb-2 block">Line Items</Label>
              <LineItemsTable
                items={quotationItems}
                onUpdate={updateQuotationItem}
                onRemove={removeQuotationItem}
                onAdd={addQuotationItem}
                sameState={quotationSameState}
              />
            </div>

            {quotationTotals.taxable > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="grid grid-cols-5 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Taxable</p><p className="font-semibold">{fmt(quotationTotals.taxable)}</p></div>
                    {quotationSameState ? (
                      <>
                        <div><p className="text-muted-foreground text-xs">CGST</p><p className="font-semibold">{fmt(quotationTotals.cgst)}</p></div>
                        <div><p className="text-muted-foreground text-xs">SGST</p><p className="font-semibold">{fmt(quotationTotals.sgst)}</p></div>
                      </>
                    ) : (
                      <div className="col-span-2"><p className="text-muted-foreground text-xs">IGST</p><p className="font-semibold">{fmt(quotationTotals.igst)}</p></div>
                    )}
                    <div><p className="text-muted-foreground text-xs">Items</p><p className="font-semibold">{quotationItems.length}</p></div>
                    <div><p className="text-muted-foreground text-xs">Grand Total</p><p className="font-bold text-primary text-lg">{fmt(quotationTotals.total)}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setQuotationDialog(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { toast({ title: 'Quotation Saved as Draft' }); setQuotationDialog(false); }}>Save Draft</Button>
            <Button onClick={() => { toast({ title: 'Quotation Created & Sent', description: `Total: ${fmt(quotationTotals.total)}` }); setQuotationDialog(false); }}>Create & Send</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── GSTR-1 Upload Guide ── */}
      <Dialog open={gstr1GuideOpen} onOpenChange={setGstr1GuideOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              GSTR-1 CSV Upload Guide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <p className="font-semibold mb-2">CSV Format: B2B (4A, 4B, 6A, 6C)</p>
                <p className="text-muted-foreground">The exported CSV follows the GST Returns Offline Tool format for B2B invoices.</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="font-semibold">Step-by-Step Upload Process:</h4>
              
              <div className="space-y-2">
                {[
                  { step: 1, title: 'Download GST Offline Tool', desc: 'Visit gst.gov.in → Downloads → Offline Tools → Returns Offline Tool' },
                  { step: 2, title: 'Export CSV from VMS', desc: 'Click "Export GSTR-1 CSV" button in the GSTR-1 tab above' },
                  { step: 3, title: 'Open Returns Offline Tool', desc: 'Launch the GST Offline Tool and select GSTR-1 / IFF' },
                  { step: 4, title: 'Import CSV', desc: 'Go to Import → CSV → Select the downloaded file → Map B2B section' },
                  { step: 5, title: 'Validate Data', desc: 'Tool will validate GSTIN format, invoice numbers, and tax calculations' },
                  { step: 6, title: 'Generate JSON', desc: 'After validation, click "Generate JSON" to create portal-ready file' },
                  { step: 7, title: 'Upload to GST Portal', desc: 'Login to gst.gov.in → Returns → Upload the generated JSON file' },
                  { step: 8, title: 'File Return', desc: 'Review summary on portal → Submit with DSC/EVC' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-muted-foreground text-xs">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="pt-4 pb-3">
                <p className="font-semibold text-amber-600 mb-1">Important Notes:</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-xs">
                  <li>Ensure GSTIN format is valid (15 characters)</li>
                  <li>Invoice date must be within the filing period</li>
                  <li>Tax amounts must match the declared rate</li>
                  <li>Use "Regular" invoice type for standard B2B transactions</li>
                  <li>Credit/Debit notes go in the CDNR section (exported separately)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
