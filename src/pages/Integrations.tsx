import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet as SheetIcon, Download, Upload, CheckCircle2, AlertCircle, Link2, RefreshCw, Truck, MessageSquare, Store, Package, Globe, ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MODULES = [
  { value: 'orders', label: 'Orders' },
  { value: 'products', label: 'Products' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'settlements', label: 'Settlements' },
  { value: 'leads', label: 'Leads / CRM' },
  { value: 'customers', label: 'Customers' },
  { value: 'expenses', label: 'Expenses' },
];

interface ImportResult {
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  allRows: Record<string, string>[];
}

const FUTURE_INTEGRATIONS = [
  {
    name: 'Amazon SP-API',
    icon: Store,
    category: 'Marketplace',
    desc: 'Sync orders, inventory & listings from Amazon Seller Central',
    status: 'coming_soon' as const,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
  },
  {
    name: 'Flipkart Seller API',
    icon: Store,
    category: 'Marketplace',
    desc: 'Real-time order sync, listing management & settlement data',
    status: 'coming_soon' as const,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    name: 'Meesho Supplier API',
    icon: Store,
    category: 'Marketplace',
    desc: 'Order processing, catalog push & payout reconciliation',
    status: 'coming_soon' as const,
    color: 'text-pink-600',
    bgColor: 'bg-pink-500/10',
  },
  {
    name: 'Shiprocket / Delhivery',
    icon: Truck,
    category: 'Shipping',
    desc: 'Automated shipping labels, real-time tracking & NDR management',
    status: 'coming_soon' as const,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  {
    name: 'WhatsApp Business API',
    icon: MessageSquare,
    category: 'Communication',
    desc: 'Order notifications, lead follow-ups & customer support automation',
    status: 'coming_soon' as const,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  {
    name: 'Tally / Zoho Books',
    icon: Package,
    category: 'Accounting',
    desc: 'Auto-sync invoices, expenses & GST data for seamless bookkeeping',
    status: 'planned' as const,
    color: 'text-violet-600',
    bgColor: 'bg-violet-500/10',
  },
];

export default function Integrations() {
  const { toast } = useToast();
  const [sheetUrl, setSheetUrl] = useState('');
  const [targetModule, setTargetModule] = useState('orders');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportModule, setExportModule] = useState('orders');

  const handleImport = useCallback(async () => {
    if (!sheetUrl.trim()) {
      toast({ title: 'Missing URL', description: 'Please paste a Google Sheets link', variant: 'destructive' });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'import', sheetUrl, targetModule },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setImportResult(data);
      toast({ title: 'Sheet imported', description: `${data.rowCount} rows fetched from Google Sheets` });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [sheetUrl, targetModule, toast]);

  const handleSaveToDatabase = useCallback(async () => {
    if (!importResult?.allRows?.length) return;
    toast({ title: 'Data ready', description: `${importResult.rowCount} rows available. Use Smart Excel Import on the Data Import page for AI-powered column mapping and database insertion.` });
  }, [importResult, toast]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { data: rows, error } = await supabase.from(exportModule as any).select('*').limit(500);
      if (error) throw error;
      if (!rows || rows.length === 0) {
        toast({ title: 'No data', description: `No records found in ${exportModule}`, variant: 'destructive' });
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'export', exportData: rows },
      });
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      
      // Download as CSV
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportModule}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export complete', description: `${data.rowCount} rows exported as CSV` });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [exportModule, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations Hub</h1>
        <p className="text-muted-foreground">Connect Google Sheets, marketplaces, shipping & more</p>
      </div>

      <Tabs defaultValue="google-sheets" className="w-full">
        <TabsList className="mx-auto w-fit">
          <TabsTrigger value="google-sheets" className="gap-2"><SheetIcon className="w-4 h-4" />Google Sheets</TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2"><Store className="w-4 h-4" />Marketplace APIs</TabsTrigger>
          <TabsTrigger value="other" className="gap-2"><Globe className="w-4 h-4" />Other APIs</TabsTrigger>
        </TabsList>

        {/* Google Sheets Tab */}
        <TabsContent value="google-sheets" className="space-y-6">
          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-primary" />Import from Google Sheets</CardTitle>
              <CardDescription>Paste any shared Google Sheets URL to pull data into VendorFlow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-500/30 bg-blue-500/5">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-600 ml-2">
                  Make sure the sheet is shared as <strong>"Anyone with the link can view"</strong> for import to work.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label className="mb-2 block font-medium">Google Sheets URL</Label>
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="mb-2 block font-medium">Target Module</Label>
                  <Select value={targetModule} onValueChange={setTargetModule}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleImport} disabled={importing} className="gap-2">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {importing ? 'Fetching...' : 'Fetch Sheet Data'}
                </Button>
              </div>

              {importResult && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-foreground">{importResult.rowCount} rows fetched</span>
                    <Badge variant="outline">{importResult.headers.length} columns</Badge>
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {importResult.headers.slice(0, 6).map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}
                          {importResult.headers.length > 6 && <TableHead className="text-xs">...</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.sampleRows.map((row, i) => (
                          <TableRow key={i}>
                            {importResult.headers.slice(0, 6).map(h => (
                              <TableCell key={h} className="text-xs max-w-[180px] truncate">{row[h]}</TableCell>
                            ))}
                            {importResult.headers.length > 6 && <TableCell className="text-xs text-muted-foreground">...</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button onClick={handleSaveToDatabase} variant="outline" className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Process with Smart Import
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" />Export to CSV / Google Sheets</CardTitle>
              <CardDescription>Export VendorFlow data as CSV — open directly in Google Sheets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label className="mb-2 block font-medium">Module to Export</Label>
                  <Select value={exportModule} onValueChange={setExportModule}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Import the CSV into Google Sheets via File → Import to enable two-way editing.
              </p>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" />Two-Way Sync (Coming Soon)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatic two-way sync between Google Sheets and your VendorFlow database is on the roadmap.
                For now, use Import + Export for manual sync cycles.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketplace APIs Tab */}
        <TabsContent value="marketplace" className="space-y-4">
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-600 ml-2">
              Marketplace API integrations require developer credentials from each platform. We're building native connectors — stay tuned!
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FUTURE_INTEGRATIONS.filter(i => i.category === 'Marketplace').map(integration => (
              <Card key={integration.name} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${integration.bgColor}`}>
                      <integration.icon className={`w-6 h-6 ${integration.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{integration.name}</h3>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                          Coming Soon
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{integration.desc}</p>
                      <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs h-7 px-2" disabled>
                        <ExternalLink className="w-3 h-3" />Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Other APIs Tab */}
        <TabsContent value="other" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FUTURE_INTEGRATIONS.filter(i => i.category !== 'Marketplace').map(integration => (
              <Card key={integration.name} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${integration.bgColor}`}>
                      <integration.icon className={`w-6 h-6 ${integration.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{integration.name}</h3>
                        <Badge variant="outline" className={`text-xs ${
                          integration.status === 'coming_soon' 
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {integration.status === 'coming_soon' ? 'Coming Soon' : 'Planned'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{integration.desc}</p>
                      <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs h-7 px-2" disabled>
                        <ExternalLink className="w-3 h-3" />Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
