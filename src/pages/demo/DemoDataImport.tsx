import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, Loader2, CloudDownload, X, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  status: 'uploaded' | 'processing' | 'completed';
  progress: number;
}

export default function DemoDataImport() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [apiPulling, setApiPulling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const simulateProcessing = useCallback((file: UploadFile) => {
    setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'processing', progress: 0 } : f));
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 25 + 10;
      if (prog >= 100) {
        prog = 100;
        clearInterval(interval);
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f));
      } else {
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, progress: Math.min(prog, 99) } : f));
      }
    }, 400);
  }, []);

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      size: f.size,
      status: 'uploaded' as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => setTimeout(() => simulateProcessing(f), 600));
    toast({ title: 'Files Added', description: `${newFiles.length} file(s) queued for processing.` });
  }, [simulateProcessing, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleApiPull = () => {
    setApiPulling(true);
    setTimeout(() => {
      const mockFiles: UploadFile[] = [
        { id: `api-${Date.now()}-1`, name: 'flipkart_orders_dec2025.csv', size: 245000, status: 'uploaded', progress: 0 },
        { id: `api-${Date.now()}-2`, name: 'amazon_inventory_dec2025.xlsx', size: 180000, status: 'uploaded', progress: 0 },
        { id: `api-${Date.now()}-3`, name: 'meesho_returns_dec2025.csv', size: 95000, status: 'uploaded', progress: 0 },
      ];
      setFiles((prev) => [...prev, ...mockFiles]);
      mockFiles.forEach((f) => setTimeout(() => simulateProcessing(f), 600));
      setApiPulling(false);
      toast({ title: 'API Pull Complete', description: '3 files fetched from marketplace APIs.' });
    }, 2000);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Import</h1>
          <p className="text-sm text-gray-400">Upload Excel/CSV files or pull data via API</p>
        </div>
        <Button onClick={handleApiPull} disabled={apiPulling} className="bg-blue-600 hover:bg-blue-700 text-white">
          {apiPulling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudDownload className="w-4 h-4 mr-2" />}
          {apiPulling ? 'Pulling...' : 'Pull via API'}
        </Button>
      </div>

      {/* Drop zone */}
      <Card
        className={`bg-[#111833] border-2 border-dashed transition-all cursor-pointer ${
          dragging ? 'border-blue-400 bg-blue-500/5' : 'border-white/10 hover:border-white/20'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="py-12 flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-blue-500/10">
            <Upload className={`w-8 h-8 ${dragging ? 'text-blue-400' : 'text-gray-400'}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-200">
              {dragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Supports .xlsx, .xls, .csv • Multiple files allowed</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* File list */}
      {files.length > 0 && (
        <Card className="bg-[#111833] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Uploaded Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-200 truncate">{f.name}</p>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={`text-xs shrink-0 ${
                        f.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        f.status === 'processing' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {f.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {f.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                      </Badge>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="text-gray-500 hover:text-gray-300">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{formatSize(f.size)}</p>
                  {f.status === 'processing' && (
                    <Progress value={f.progress} className="mt-2 h-1 bg-white/5" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
