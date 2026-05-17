import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { videosDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import {
  Video, Camera, FileImage, Search, FileSpreadsheet, FileDown, Eye, Upload,
  AlertTriangle, CheckCircle2, Clock, XCircle, ArrowUpDown, Settings2,
  ShieldCheck, HardDrive, Timer, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type VideoStatus = 'not_captured' | 'video_captured' | 'invoice_captured' | 'verified' | 'completed';

const statusConfig: Record<VideoStatus, { label: string; color: string; icon: React.ElementType }> = {
  not_captured: { label: 'Not Captured', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30', icon: XCircle },
  video_captured: { label: 'Video Captured', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Video },
  invoice_captured: { label: 'Invoice Captured', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: FileImage },
  verified: { label: 'Verified', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: ShieldCheck },
  completed: { label: 'Completed', color: 'bg-primary/10 text-primary border-primary/30', icon: CheckCircle2 },
};

export default function VideoManagement() {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailRecord, setDetailRecord] = useState<any | null>(null);
  const [defaultRetention, setDefaultRetention] = useState('90');
  const [defaultResolution, setDefaultResolution] = useState('medium');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [sortField, setSortField] = useState<'order_id' | 'captured_at' | 'video_status'>('order_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await videosDb.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setRecords(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [searchQuery, statusFilter]);

  const filtered = useMemo(() => {
    let data = [...records];
    data.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [records, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const stats = useMemo(() => ({
    total: records.length,
    completed: records.filter(r => r.video_status === 'completed').length,
    notCaptured: records.filter(r => r.video_status === 'not_captured').length,
    verified: records.filter(r => r.video_status === 'verified').length,
    pendingInvoice: records.filter(r => !r.invoice_image).length,
  }), [records]);

  const alertOrders = records.filter(r => r.video_status === 'not_captured' && r.internal_status !== 'Processing');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid File', description: 'Please select a video file.', variant: 'destructive' });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Video must be under 50MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast({ title: 'Video Uploaded', description: `${file.name} uploaded successfully to cloud storage.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message || 'Could not upload video.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = (fmt: 'excel' | 'pdf') => {
    toast({ title: `Export ${fmt.toUpperCase()}`, description: 'Preparing video log export...' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Video Management System</h1>
          <p className="text-muted-foreground mt-1">Track order videos, invoice images, and verification status</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          <Button variant="default" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload Video'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('excel')}><FileSpreadsheet className="w-4 h-4" />Excel</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('pdf')}><FileDown className="w-4 h-4" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Video className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Records</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-sm text-muted-foreground">Completed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.verified}</p><p className="text-sm text-muted-foreground">Verified</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><XCircle className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">{stats.notCaptured}</p><p className="text-sm text-muted-foreground">Not Captured</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><FileImage className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-amber-600">{stats.pendingInvoice}</p><p className="text-sm text-muted-foreground">No Invoice</p></div></div></CardContent></Card>
      </div>

      {alertEnabled && alertOrders.length > 0 && (
        <Alert className="border-rose-500/30 bg-rose-500/5">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-600 ml-2">
            <strong>{alertOrders.length} order(s) processed without video capture:</strong>{' '}
            {alertOrders.map(o => o.order_id).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="text-foreground font-medium mb-2 block">Search Order ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by Order ID or file name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="w-48">
              <Label className="text-foreground font-medium mb-2 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_captured">Not Captured</SelectItem>
                  <SelectItem value="video_captured">Video Captured</SelectItem>
                  <SelectItem value="invoice_captured">Invoice Captured</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-foreground font-medium mb-2 block">Retention</Label>
              <Select value={defaultRetention} onValueChange={setDefaultRetention}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="120">120 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Alerts</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5" />Video & Invoice Log</CardTitle>
          <CardDescription>{filtered.length} record(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('order_id')}>
                      <span className="flex items-center gap-1">Order ID <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('video_status')}>
                      <span className="flex items-center gap-1">Video Status <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="font-semibold">Invoice</TableHead>
                    <TableHead className="font-semibold">Internal Status</TableHead>
                    <TableHead className="font-semibold">File Name</TableHead>
                    <TableHead className="font-semibold">Resolution</TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('captured_at')}>
                      <span className="flex items-center gap-1">Captured <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="font-semibold">Retention</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const sc = statusConfig[(r.video_status || 'not_captured') as VideoStatus] || statusConfig.not_captured;
                    const StatusIcon = sc.icon;
                    return (
                      <TableRow key={r.id} className={r.video_status === 'not_captured' ? 'bg-rose-500/[0.03]' : ''}>
                        <TableCell className="font-mono font-medium">{r.order_id}</TableCell>
                        <TableCell><Badge variant="outline" className={`gap-1 ${sc.color}`}><StatusIcon className="w-3 h-3" />{sc.label}</Badge></TableCell>
                        <TableCell>
                          {r.invoice_image ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1"><FileImage className="w-3 h-3" />Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground gap-1"><XCircle className="w-3 h-3" />No</Badge>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{r.internal_status || '—'}</Badge></TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">{r.file_name || '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs capitalize">{r.resolution || 'medium'}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.captured_at || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{r.retention_days || 90}d</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDetailRecord(r)}>
                            <Eye className="w-3.5 h-3.5" />Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" />Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <HardDrive className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Storage Retention</p>
                <p className="text-sm text-muted-foreground">Default: <strong>{defaultRetention} days</strong></p>
                <p className="text-xs text-muted-foreground mt-1">Files auto-deleted after retention period</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Video className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Default Resolution</p>
                <p className="text-sm text-muted-foreground capitalize"><strong>{defaultResolution}</strong></p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Missing Video Alerts</p>
                <p className="text-sm text-muted-foreground">{alertEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={open => !open && setDetailRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Video Record Details</DialogTitle></DialogHeader>
          {detailRecord && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-muted-foreground">Order ID</p><p className="font-medium">{detailRecord.order_id}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant="outline" className={statusConfig[(detailRecord.video_status || 'not_captured') as VideoStatus]?.color}>{statusConfig[(detailRecord.video_status || 'not_captured') as VideoStatus]?.label}</Badge></div>
                <div><p className="text-muted-foreground">File Name</p><p className="font-mono text-xs">{detailRecord.file_name || '—'}</p></div>
                <div><p className="text-muted-foreground">File Size</p><p>{detailRecord.file_size || '—'}</p></div>
                <div><p className="text-muted-foreground">Verified By</p><p>{detailRecord.verified_by || '—'}</p></div>
                <div><p className="text-muted-foreground">Expires At</p><p>{detailRecord.expires_at || '—'}</p></div>
              </div>
              {detailRecord.notes && <div><p className="text-muted-foreground">Notes</p><p>{detailRecord.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
