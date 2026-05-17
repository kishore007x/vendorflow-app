import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { leadsDb } from '@/services/database';
import * as XLSX from 'xlsx';

const LEAD_FIELDS = [
  { key: 'company_name', label: 'Company Name', required: true },
  { key: 'contact_person', label: 'Contact Person', required: true },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'whatsapp', label: 'WhatsApp Number', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'gstin', label: 'GST Number', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'source', label: 'Source', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'value', label: 'Deal Value', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'assigned_to', label: 'Assigned To', required: false },
] as const;

type Step = 'upload' | 'mapping' | 'preview' | 'result';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSource: string;
  onComplete: () => void;
}

// Auto-match columns by fuzzy name matching
function autoMatch(header: string): string {
  const h = header.toLowerCase().trim();
  const rules: [RegExp, string][] = [
    [/company|firm|business|org/i, 'company_name'],
    [/contact.*person|contact.*name|person|poc/i, 'contact_person'],
    [/whatsapp|wa.*num/i, 'whatsapp'],
    [/phone|mobile|cell|tel/i, 'phone'],
    [/email|e-mail|mail/i, 'email'],
    [/website|web|url|site/i, 'website'],
    [/gst|gstin|gst.*num/i, 'gstin'],
    [/address|addr/i, 'address'],
    [/city|location/i, 'city'],
    [/state|region/i, 'state'],
    [/source|channel|platform/i, 'source'],
    [/priority|urgency/i, 'priority'],
    [/value|deal|amount|budget/i, 'value'],
    [/note|remark|comment|description/i, 'notes'],
    [/assign|executive|owner/i, 'assigned_to'],
  ];
  for (const [re, field] of rules) {
    if (re.test(h)) return field;
  }
  return '';
}

function normalizeSource(val: string): string {
  const v = (val || '').toLowerCase().trim();
  if (/indiamart/i.test(v)) return 'indiamart';
  if (/justdial|just.*dial/i.test(v)) return 'justdial';
  if (/tradeindia/i.test(v)) return 'tradeindia';
  if (/whatsapp/i.test(v)) return 'whatsapp';
  if (/social/i.test(v)) return 'social_media';
  if (/referral/i.test(v)) return 'referral';
  if (/website|web/i.test(v)) return 'website';
  return 'website';
}

function normalizePriority(val: string): 'low' | 'medium' | 'high' {
  const v = (val || '').toLowerCase().trim();
  if (/high|urgent|hot/i.test(v)) return 'high';
  if (/low|cold/i.test(v)) return 'low';
  return 'medium';
}

export default function LeadImport({ open, onOpenChange, defaultSource, onComplete }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState({ success: 0, failed: 0, errors: [] as string[] });

  const reset = () => { setStep('upload'); setFileName(''); setHeaders([]); setRows([]); setMapping({}); setResult({ success: 0, failed: 0, errors: [] }); };

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        if (!json.length) { toast({ title: 'Empty file', variant: 'destructive' }); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json);
        setFileName(file.name);
        // Auto-map
        const autoMap: Record<string, string> = {};
        hdrs.forEach(h => { const m = autoMatch(h); if (m) autoMap[h] = m; });
        setMapping(autoMap);
        setStep('mapping');
      } catch { toast({ title: 'Could not parse file', variant: 'destructive' }); }
    };
    reader.readAsBinaryString(file);
  }, [toast]);

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const mappedFields = Object.values(mapping).filter(Boolean);
  const hasRequired = LEAD_FIELDS.filter(f => f.required).every(f => mappedFields.includes(f.key));

  const previewData = rows.slice(0, 5).map(row => {
    const mapped: Record<string, string> = {};
    Object.entries(mapping).forEach(([header, field]) => { if (field) mapped[field] = String(row[header] || ''); });
    return mapped;
  });

  const handleImport = async () => {
    setImporting(true);
    let success = 0, failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const mapped: Record<string, any> = {};
        Object.entries(mapping).forEach(([header, field]) => { if (field) mapped[field] = String(row[header] || '').trim(); });
        if (!mapped.company_name || !mapped.contact_person) { errors.push(`Row ${i + 2}: Missing company name or contact person`); failed++; continue; }
        
        mapped.source = mapped.source ? normalizeSource(mapped.source) : defaultSource;
        mapped.priority = mapped.priority ? normalizePriority(mapped.priority) : 'medium';
        mapped.value = mapped.value ? Number(String(mapped.value).replace(/[^0-9.]/g, '')) || 0 : 0;
        mapped.status = 'new';
        mapped.imported_via = 'excel_import';

        await leadsDb.create(mapped as any);
        success++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message}`);
        failed++;
      }
    }

    setResult({ success, failed, errors });
    setStep('result');
    setImporting(false);
    if (success > 0) onComplete();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Company Name', 'Contact Person', 'Phone', 'Email', 'WhatsApp Number', 'Website', 'GST Number', 'Address', 'City', 'State', 'Source', 'Priority', 'Deal Value', 'Notes'],
      ['ABC Industries', 'Rajesh Kumar', '9876543210', 'rajesh@abc.com', '9876543210', 'www.abc.com', '27AABCA1234C1Z5', 'Plot 5, MIDC', 'Mumbai', 'Maharashtra', 'IndiaMART', 'High', '50000', 'Interested in bulk order'],
      ['XYZ Traders', 'Priya Sharma', '9123456789', 'priya@xyz.in', '', 'www.xyz.in', '', 'MG Road', 'Delhi', 'Delhi', 'JustDial', 'Medium', '25000', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'VendorFlow_Lead_Import_Template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Leads from Excel/CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {['Upload', 'Map Columns', 'Preview', 'Result'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${['upload', 'mapping', 'preview', 'result'].indexOf(step) >= i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
              <span>{s}</span>
              {i < 3 && <span className="mx-1">→</span>}
            </div>
          ))}
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Drop your Excel/CSV file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv files</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />Download Template
            </Button>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">File: <span className="font-medium text-foreground">{fileName}</span> ({rows.length} rows)</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-1/3 text-sm font-medium truncate">{header}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select value={mapping[header] || '_skip'} onValueChange={v => setMapping(p => ({ ...p, [header]: v === '_skip' ? '' : v }))}>
                    <SelectTrigger className="w-1/2">
                      <SelectValue placeholder="Skip this column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">⏭ Skip</SelectItem>
                      {LEAD_FIELDS.map(f => (
                        <SelectItem key={f.key} value={f.key} disabled={mappedFields.includes(f.key) && mapping[header] !== f.key}>
                          {f.label} {f.required && '*'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[header] && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                </div>
              ))}
            </div>
            {!hasRequired && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" />Map required fields: Company Name, Contact Person</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button disabled={!hasRequired} onClick={() => setStep('preview')}>Preview Data</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Preview of first 5 rows (total: {rows.length})</p>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {LEAD_FIELDS.filter(f => mappedFields.includes(f.key)).map(f => (
                      <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {LEAD_FIELDS.filter(f => mappedFields.includes(f.key)).map(f => (
                        <TableCell key={f.key} className="text-xs max-w-[150px] truncate">{row[f.key] || '—'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" />Importing...</> : <>Import {rows.length} Leads</>}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <h3 className="text-lg font-bold">Import Complete</h3>
            <div className="flex justify-center gap-6">
              <div><p className="text-2xl font-bold text-emerald-600">{result.success}</p><p className="text-xs text-muted-foreground">Imported</p></div>
              {result.failed > 0 && <div><p className="text-2xl font-bold text-destructive">{result.failed}</p><p className="text-xs text-muted-foreground">Failed</p></div>}
            </div>
            {result.errors.length > 0 && (
              <div className="text-left mt-4 max-h-[150px] overflow-y-auto bg-muted/50 rounded-lg p-3">
                {result.errors.slice(0, 10).map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
                {result.errors.length > 10 && <p className="text-xs text-muted-foreground">...and {result.errors.length - 10} more</p>}
              </div>
            )}
            <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
