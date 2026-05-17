import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Download,
  Loader2, Sparkles, ArrowRight, RefreshCw, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { IMPORT_MODULES, getModuleById, validateRows, type ImportModule, type ValidationResult } from '@/services/importModules';

interface ColumnMapping {
  excelHeader: string;
  systemField: string | null;
  confidence: number;
  reason: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'result';

export function SmartExcelImport() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedModule, setSelectedModule] = useState<string>('orders');
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [mappedData, setMappedData] = useState<Record<string, any>[]>([]);
  const [validRows, setValidRows] = useState<Record<string, any>[]>([]);
  const [errorRows, setErrorRows] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; valid: number; errors: number; warnings: number } | null>(null);
  const [isMapping, setIsMapping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentModule = getModuleById(selectedModule);

  const parseFile = useCallback((f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        
        // Auto-detect the real header row by finding the row with the most non-empty cells
        // This handles FirstCry-style files with metadata/title rows at the top
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        let bestRow = 0;
        let bestCount = 0;
        const maxScan = Math.min(range.e.r, 15); // scan first 15 rows
        
        for (let r = 0; r <= maxScan; r++) {
          let count = 0;
          let hasEmpty = false;
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            const val = cell?.v;
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              count++;
            } else {
              hasEmpty = true;
            }
          }
          // Prefer rows with many filled cells and string-like values (headers)
          if (count > bestCount) {
            // Check if most values are strings (header-like)
            let stringCount = 0;
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = ws[XLSX.utils.encode_cell({ r, c })];
              if (cell && typeof cell.v === 'string') stringCount++;
            }
            if (stringCount >= count * 0.5 || count > bestCount + 3) {
              bestCount = count;
              bestRow = r;
            }
          }
        }
        
        // Re-parse with detected header row
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { 
          defval: '', 
          range: bestRow,
        });
        
        // Filter out rows where all values are empty
        const filtered = json.filter(row => 
          Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== '')
        );
        
        // Filter out columns that are all empty or named __EMPTY*
        const cleanHeaders = Object.keys(filtered[0] || {}).filter(h => {
          if (h.startsWith('__EMPTY')) {
            // Check if any row has data in this column
            return filtered.some(row => row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '');
          }
          return true;
        });
        
        // Rebuild data with only clean headers
        const cleanData = filtered.map(row => {
          const clean: Record<string, any> = {};
          cleanHeaders.forEach(h => { clean[h] = row[h]; });
          return clean;
        });
        
        if (cleanData.length === 0) {
          toast({ title: 'Empty File', description: 'No data found in the uploaded file.', variant: 'destructive' });
          return;
        }
        
        setHeaders(cleanHeaders);
        setRawData(cleanData);
        requestAIMapping(cleanHeaders, cleanData);
      } catch {
        toast({ title: 'Parse Error', description: 'Could not read the file. Please check format.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(f);
  }, [selectedModule]);

  const requestAIMapping = async (hdrs: string[], rows: Record<string, any>[]) => {
    setIsMapping(true);
    setStep('mapping');
    const mod = getModuleById(selectedModule);
    if (!mod) return;

    try {
      const { data, error } = await supabase.functions.invoke('map-columns', {
        body: {
          headers: hdrs,
          sampleRows: rows.slice(0, 5),
          moduleFields: mod.fields.map(f => ({ key: f.key, label: f.label, type: f.type, required: f.required })),
        },
      });

      if (error) throw error;
      const aiMappings: ColumnMapping[] = data?.mappings || [];
      // Fill in any unmapped headers
      const mappedHeaders = new Set(aiMappings.map(m => m.excelHeader));
      hdrs.forEach(h => {
        if (!mappedHeaders.has(h)) {
          aiMappings.push({ excelHeader: h, systemField: null, confidence: 0, reason: 'No match found' });
        }
      });
      setMappings(aiMappings);
    } catch (err) {
      console.error('AI mapping failed, using fallback:', err);
      // Fallback: simple name matching
      const fallback: ColumnMapping[] = hdrs.map(h => {
        const match = mod.fields.find(f =>
          f.key.toLowerCase() === h.toLowerCase().replace(/[\s\-]/g, '_') ||
          f.label.toLowerCase() === h.toLowerCase()
        );
        return {
          excelHeader: h,
          systemField: match?.key || null,
          confidence: match ? 0.7 : 0,
          reason: match ? 'Matched by name' : 'No match',
        };
      });
      setMappings(fallback);
      toast({ title: 'Using Fallback Mapping', description: 'AI mapping unavailable. Please review column mappings manually.' });
    } finally {
      setIsMapping(false);
    }
  };

  const updateMapping = (excelHeader: string, systemField: string | null) => {
    setMappings(prev => prev.map(m => m.excelHeader === excelHeader ? { ...m, systemField, confidence: 1, reason: 'Manual override' } : m));
  };

  const applyMappings = () => {
    const mapped = rawData.map(row => {
      const newRow: Record<string, any> = {};
      mappings.forEach(m => {
        if (m.systemField) {
          newRow[m.systemField] = row[m.excelHeader];
        }
      });
      return newRow;
    });
    setMappedData(mapped);

    const { validRows: vr, errorRows: er, summary: s } = validateRows(mapped, selectedModule);
    setValidRows(vr);
    setErrorRows(er);
    setSummary(s);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!currentModule || validRows.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);

    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < validRows.length; i += batchSize) {
      batches.push(validRows.slice(i, i + batchSize));
    }

    let imported = 0;
    for (const batch of batches) {
      const { error } = await supabase.from(currentModule.dbTable as any).insert(batch as any);
      if (error) {
        console.error('Import batch error:', error);
        toast({ title: 'Import Error', description: error.message, variant: 'destructive' });
        break;
      }
      imported += batch.length;
      setImportProgress(Math.round((imported / validRows.length) * 100));
    }

    setIsImporting(false);
    setStep('result');
    toast({
      title: 'Import Complete',
      description: `${imported} of ${validRows.length} records imported to ${currentModule.label}.`,
    });
  };

  const downloadTemplate = (mod: ImportModule) => {
    const ws = XLSX.utils.json_to_sheet(mod.sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mod.label);
    XLSX.writeFile(wb, `${mod.id}_template.xlsx`);
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setMappings([]);
    setMappedData([]);
    setValidRows([]);
    setErrorRows([]);
    setSummary(null);
    setImportProgress(0);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  }, [parseFile]);

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'mapping', 'preview', 'result'] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            <Badge variant={step === s ? 'default' : 'outline'} className={step === s ? '' : 'text-muted-foreground'}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </Badge>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Smart Excel Import
            </CardTitle>
            <CardDescription>AI-powered column mapping with validation & error handling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Module selector */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Import Module</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_MODULES.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template download */}
            {currentModule && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <Download className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Download Template</p>
                  <p className="text-xs text-muted-foreground">{currentModule.label} template with {currentModule.sampleData.length} sample rows</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadTemplate(currentModule)}>
                  <Download className="w-3.5 h-3.5 mr-1" />.xlsx
                </Button>
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground">{dragActive ? 'Drop file here' : 'Drag & drop your Excel/CSV file'}</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isMapping ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Sparkles className="w-5 h-5 text-primary" />}
              {isMapping ? 'AI is analyzing your columns...' : 'Column Mapping'}
            </CardTitle>
            <CardDescription>
              {isMapping ? 'Matching Excel headers to system fields' : `${file?.name} • ${rawData.length} rows detected`}
            </CardDescription>
          </CardHeader>
          {!isMapping && (
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Excel Column</TableHead>
                      <TableHead>Maps To</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map(m => (
                      <TableRow key={m.excelHeader}>
                        <TableCell className="font-mono text-sm">{m.excelHeader}</TableCell>
                        <TableCell>
                          <Select
                            value={m.systemField || '__none__'}
                            onValueChange={v => updateMapping(m.excelHeader, v === '__none__' ? null : v)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Skip this column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Skip —</SelectItem>
                              {currentModule?.fields.map(f => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label} {f.required ? '*' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            m.confidence >= 0.8 ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                            m.confidence >= 0.5 ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                            'bg-muted text-muted-foreground'
                          }>
                            {Math.round(m.confidence * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={reset}>
                  <X className="w-4 h-4 mr-1" />Cancel
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => requestAIMapping(headers, rawData)}>
                    <RefreshCw className="w-4 h-4 mr-1" />Re-analyze
                  </Button>
                  <Button onClick={applyMappings}>
                    Validate & Preview <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Step 3: Preview & Validate */}
      {step === 'preview' && summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Rows</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-emerald-600">Valid</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.valid}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-rose-600">Errors</p>
              <p className="text-2xl font-bold text-rose-600">{summary.errors}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-amber-600">Warnings</p>
              <p className="text-2xl font-bold text-amber-600">{summary.warnings}</p>
            </Card>
          </div>

          {/* Valid data preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Valid Data Preview ({validRows.length} rows)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validRows.length > 0 && currentModule ? (
                <div className="overflow-x-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {currentModule.fields.filter(f => mappings.some(m => m.systemField === f.key)).map(f => (
                          <TableHead key={f.key}>{f.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          {currentModule.fields.filter(f => mappings.some(m => m.systemField === f.key)).map(f => (
                            <TableCell key={f.key} className="text-sm">{String(row[f.key] ?? '')}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validRows.length > 10 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing 10 of {validRows.length} rows</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No valid rows to display.</p>
              )}
            </CardContent>
          </Card>

          {/* Error rows */}
          {errorRows.filter(r => r.errors.length > 0).length > 0 && (
            <Card className="border-rose-500/30">
              <CardHeader className="cursor-pointer" onClick={() => setShowErrors(!showErrors)}>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    Error Rows ({errorRows.filter(r => r.errors.length > 0).length})
                  </span>
                  {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
              {showErrors && (
                <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                  {errorRows.filter(r => r.errors.length > 0).map((r, i) => (
                    <div key={i} className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
                      <p className="text-sm font-medium">Row {r.rowIndex}</p>
                      <div className="mt-1 space-y-0.5">
                        {r.errors.map((e, j) => (
                          <p key={j} className="text-xs text-rose-600 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />{e.field}: {e.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Warning rows */}
          {errorRows.filter(r => r.warnings.length > 0 && r.errors.length === 0).length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Warnings ({errorRows.filter(r => r.warnings.length > 0 && r.errors.length === 0).length} rows)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {errorRows.filter(r => r.warnings.length > 0 && r.errors.length === 0).slice(0, 5).map((r, i) => (
                  <div key={i} className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs font-medium">Row {r.rowIndex}</p>
                    {r.warnings.map((w, j) => (
                      <p key={j} className="text-xs text-amber-600">{w.field}: {w.message}</p>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              ← Back to Mapping
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0 || isImporting}>
                {isImporting ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Importing {importProgress}%</>
                ) : (
                  <>Import {validRows.length} Valid Rows</>
                )}
              </Button>
            </div>
          </div>

          {isImporting && <Progress value={importProgress} className="h-2" />}
        </>
      )}

      {/* Step 4: Result */}
      {step === 'result' && summary && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold">Import Complete!</h2>
            <p className="text-muted-foreground">
              Successfully imported <span className="font-semibold text-foreground">{summary.valid}</span> records
              to <span className="font-semibold text-foreground">{currentModule?.label}</span>
            </p>
            {summary.errors > 0 && (
              <p className="text-sm text-rose-600">
                {summary.errors} rows were skipped due to errors.
              </p>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={reset}>Import Another File</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Section */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Download Templates
            </CardTitle>
            <CardDescription>Pre-filled Excel templates with sample data for all modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {IMPORT_MODULES.map(mod => (
                <div key={mod.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.fields.length} fields • {mod.sampleData.length} samples</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => downloadTemplate(mod)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
