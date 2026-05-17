import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, Upload, X, CheckCircle, AlertTriangle, XCircle, FileDown, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Date Filter
const dateOptions = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function DateFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] gap-2">
        <Calendar className="w-4 h-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {dateOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Export Button - actual CSV download
export function ExportButton({ label, selectedCount, data, filename }: { label?: string; selectedCount?: number; data?: any[]; filename?: string }) {
  const { toast } = useToast();
  const dynamicLabel = selectedCount && selectedCount > 0
    ? `Export – ${selectedCount} Selected`
    : label || 'Export to Excel';

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to export.', variant: 'destructive' });
      return;
    }

    try {
      // Get headers from first row
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => {
            const val = row[h];
            const str = val === null || val === undefined ? '' : String(val);
            // Escape commas and quotes
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        )
      ];
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Complete', description: `${data.length} rows exported successfully.` });
    } catch (e) {
      toast({ title: 'Export Failed', description: 'Could not generate export file.', variant: 'destructive' });
    }
  };

  const handleTxtExport = () => {
    if (!data || data.length === 0) {
      toast({ title: 'No Data', description: 'No data available to export.', variant: 'destructive' });
      return;
    }
    try {
      const headers = Object.keys(data[0]);
      const lines = data.map(row => headers.map(h => `${h}: ${row[h] ?? ''}`).join(' | '));
      const txtContent = lines.join('\n');
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'TXT Export Complete', description: `${data.length} rows exported as TXT.` });
    } catch {
      toast({ title: 'Export Failed', description: 'Could not generate TXT file.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex gap-1">
      <Button variant="outline" className="gap-2" onClick={handleExport}>
        <Download className="w-4 h-4" />
        {dynamicLabel}
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleTxtExport}>
        <FileText className="w-4 h-4" />TXT
      </Button>
    </div>
  );
}

// Row Selection Hook
export function useRowSelection<T extends string | number>(ids: T[]) {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = (id: T) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === ids.length) setSelected(new Set());
    else setSelected(new Set(ids));
  };

  const isSelected = (id: T) => selected.has(id);
  const isAllSelected = ids.length > 0 && selected.size === ids.length;

  return { selected, toggle, toggleAll, isSelected, isAllSelected, count: selected.size };
}

// Selection Checkbox Header
export function SelectAllCheckbox({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: () => void }) {
  return <Checkbox checked={checked} onCheckedChange={onCheckedChange} />;
}

// Selection Checkbox Row
export function RowCheckbox({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: () => void }) {
  return <Checkbox checked={checked} onCheckedChange={onCheckedChange} />;
}

// Import Inventory Modal
export function ImportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle');
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('uploading');
    setTimeout(() => setUploadState('done'), 1500);
  };

  const handleFileSelect = () => {
    setUploadState('uploading');
    setTimeout(() => setUploadState('done'), 1500);
  };

  const reset = () => {
    setUploadState('idle');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Inventory</DialogTitle>
        </DialogHeader>

        {uploadState === 'idle' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={handleFileSelect}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Drag & drop your Excel file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse (.xlsx, .csv)</p>
            </div>
            <Button variant="outline" className="w-full gap-2">
              <FileDown className="w-4 h-4" />
              Download Inventory Template
            </Button>
          </div>
        )}

        {uploadState === 'uploading' && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="font-medium">Processing file...</p>
            <p className="text-sm text-muted-foreground">Validating data fields</p>
          </div>
        )}

        {uploadState === 'done' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-600 font-medium mb-2">
                <CheckCircle className="w-4 h-4" />
                Import Summary
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>142 rows imported successfully</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-600">3 rows with missing fields (skipped)</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-rose-600">1 row with incorrect format</span>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview (first 3 rows)</p>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1.5 font-medium">SKU ID</th>
                        <th className="text-left p-1.5 font-medium">Product</th>
                        <th className="text-left p-1.5 font-medium">Brand</th>
                        <th className="text-center p-1.5 font-medium">Stock</th>
                        <th className="text-center p-1.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { sku: 'SKU-AMZ-101', product: 'Wireless Earbuds', brand: 'Boat', stock: 250, ok: true },
                        { sku: 'SKU-FLK-202', product: 'Fitness Watch', brand: 'Samsung', stock: 180, ok: true },
                        { sku: 'SKU-MSH-303', product: 'Cotton T-Shirt', brand: 'Nike', stock: 0, ok: false },
                      ].map(row => (
                        <tr key={row.sku} className="border-b last:border-0">
                          <td className="p-1.5 font-mono">{row.sku}</td>
                          <td className="p-1.5">{row.product}</td>
                          <td className="p-1.5">{row.brand}</td>
                          <td className="p-1.5 text-center">{row.stock}</td>
                          <td className="p-1.5 text-center">
                            {row.ok ? (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">✓</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">⚠</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => { onOpenChange(false); toast({ title: 'Import Complete', description: '142 inventory records updated' }); reset(); }}>
              Confirm Import
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
