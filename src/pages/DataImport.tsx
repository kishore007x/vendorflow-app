import { useState, useRef, useCallback } from 'react';
import { SmartExcelImport } from '@/components/SmartExcelImport';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Package, RotateCcw, CheckCircle, AlertTriangle, XCircle, Lightbulb, Upload, FolderOpen, X, File, Image, FileText } from 'lucide-react';

const validationChecks = [
  { label: 'Orders Imported', status: 'success' as const, detail: '1,247 records synced' },
  { label: 'Inventory Synced', status: 'success' as const, detail: 'All warehouses up to date' },
  { label: 'SKU Mapping Complete', status: 'success' as const, detail: '98% mapped' },
  { label: 'Missing Product Data', status: 'warning' as const, detail: '3 products missing images' },
  { label: 'Incorrect Fields', status: 'error' as const, detail: '2 SKUs with invalid barcodes' },
];

const suggestions = [
  'Upload SKU master to resolve mapping errors',
  'Update product images for 3 incomplete listings',
  'Review barcode format for SKU-MSH-007 and SKU-BLK-004',
];

interface UploadedFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-primary" />;
  if (type.includes('spreadsheet') || type.includes('csv') || type.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-primary" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
}

export default function DataImport() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles: UploadedFileInfo[] = Array.from(files).map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Import & Scanning</h1>
          <p className="text-muted-foreground">Smart Excel import with AI column mapping, validation & barcode scanning</p>
        </div>
        <Badge variant="outline">✔ Updated</Badge>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10"><FileSpreadsheet className="w-6 h-6 text-primary" /></div>
              <div><h3 className="font-semibold">Smart Import</h3><p className="text-sm text-muted-foreground">AI-powered Excel import</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <BarcodeScanner mode="order" trigger={
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-lg bg-emerald-500/10"><Package className="w-6 h-6 text-emerald-600" /></div>
                <div className="text-left"><h3 className="font-semibold">Scan Order</h3><p className="text-sm text-muted-foreground">Process shipments</p></div>
              </div>
            } />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <BarcodeScanner mode="return" trigger={
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-lg bg-amber-500/10"><RotateCcw className="w-6 h-6 text-amber-600" /></div>
                <div className="text-left"><h3 className="font-semibold">Scan Return</h3><p className="text-sm text-muted-foreground">Accept returns</p></div>
              </div>
            } />
          </CardContent>
        </Card>
      </div>

      {/* Smart Excel Import - main feature */}
      <SmartExcelImport />

      {/* Multi-File Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" />Bulk File Upload</CardTitle>
          <CardDescription>Drag & drop multiple files or select a folder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground mb-1">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground mb-4">Supports Excel, CSV, images, documents, and more</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <File className="w-4 h-4 mr-1.5" />Select Files
              </Button>
              <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                <FolderOpen className="w-4 h-4 mr-1.5" />Select Folder
              </Button>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.doc,.docx" />
            <input ref={folderInputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} {...{ webkitdirectory: '', directory: '' } as any} />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{uploadedFiles.length} file(s) selected</h4>
                <Button variant="ghost" size="sm" onClick={() => setUploadedFiles([])}>Clear All</Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(file.type)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => removeFile(file.id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Validation Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-primary" />Data Validation Center</CardTitle>
          <CardDescription>System-wide data health checklist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {validationChecks.map((check) => (
              <div key={check.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {check.status === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                  {check.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                  {check.status === 'error' && <XCircle className="w-5 h-5 text-rose-600" />}
                  <div>
                    <p className="font-medium">{check.label}</p>
                    <p className="text-sm text-muted-foreground">{check.detail}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`${
                  check.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                  check.status === 'warning' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                  'bg-rose-500/10 text-rose-600 border-rose-500/30'
                }`}>
                  {check.status === 'success' ? '✔ Passed' : check.status === 'warning' ? '⚠ Warning' : '❌ Failed'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary font-bold">→</span>
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
