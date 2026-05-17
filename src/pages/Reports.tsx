import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Download, FileText, Clock, ShoppingCart, Package, BarChart3, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { TimelineFilter, type TimelineValue, getTimelineLabel } from '@/components/TimelineFilter';
import { GlobalDateFilter, type DateRange } from '@/components/GlobalDateFilter';
import { reportsDb, activityLogsDb } from '@/services/database';

type SortField = 'name' | 'type' | 'format' | 'size' | 'generated_at';
type SortDir = 'asc' | 'desc';

const reportCategories = [
  { name: 'Sales Report', icon: BarChart3, color: 'bg-primary/10 text-primary', type: 'Sales' },
  { name: 'Inventory Report', icon: Package, color: 'bg-emerald-500/10 text-emerald-600', type: 'Inventory' },
  { name: 'Orders Report', icon: ShoppingCart, color: 'bg-blue-500/10 text-blue-600', type: 'Orders' },
  { name: 'Returns Report', icon: RefreshCw, color: 'bg-amber-500/10 text-amber-600', type: 'Returns' },
  { name: 'Settlement Report', icon: FileText, color: 'bg-violet-500/10 text-violet-600', type: 'Settlement' },
];

export default function Reports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineValue>({ preset: '30days' });
  const [sortField, setSortField] = useState<SortField>('generated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [scheduledReports, setScheduledReports] = useState<Record<string, boolean>>({});
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reportsData, logsData] = await Promise.all([
        reportsDb.getAll(),
        activityLogsDb.getAll({ limit: 20 }),
      ]);
      setReports(reportsData);
      setActivityLogs(logsData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'generated_at') return dir * (new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime());
      return dir * ((a[sortField] ?? '') as string).localeCompare((b[sortField] ?? '') as string);
    });
  }, [reports, sortField, sortDir]);

  const handleGenerate = async (name: string, type: string) => {
    try {
      await reportsDb.create({ name: `${name} - ${getTimelineLabel(timeline)}`, type, format: 'Excel', size: '—' });
      toast({ title: 'Report Generated', description: `${name} created successfully` });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleExport = (type: 'excel' | 'pdf' | 'txt') => {
    toast({ title: `Export to ${type === 'excel' ? 'Excel' : type === 'pdf' ? 'PDF' : 'TXT'}`, description: `Preparing ${type.toUpperCase()} export...` });
  };

  const actionIcons: Record<string, React.ElementType> = {
    'Product Added': Package, 'Excel Upload': FileSpreadsheet, 'Order Status Changed': RefreshCw,
    'SKU Mapped': Package, 'Return Approved': RefreshCw, 'Settlement Completed': ShoppingCart,
    'Report Generated': FileText,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & History</h1>
          <p className="text-muted-foreground">Access reports and view platform activity log</p>
        </div>
        <div className="flex items-center gap-2">
          <GlobalDateFilter value={globalDateRange} onChange={setGlobalDateRange} />
          <TimelineFilter value={timeline} onChange={setTimeline} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Quick Generate */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {reportCategories.map(r => (
              <Card key={r.name} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleGenerate(r.name, r.type)}>
                <CardContent className="pt-6 text-center">
                  <div className={`mx-auto p-3 rounded-xl w-fit mb-3 ${r.color}`}><r.icon className="w-6 h-6" /></div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1"><Download className="w-3 h-3" />Generate</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => handleExport('excel')}><FileSpreadsheet className="w-4 h-4" />Export to Excel</Button>
            <Button variant="outline" className="gap-2" onClick={() => handleExport('pdf')}><FileDown className="w-4 h-4" />Export to PDF</Button>
            <Button variant="outline" className="gap-2" onClick={() => handleExport('txt')}><FileText className="w-4 h-4" />Export to TXT</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>Previously generated reports available for download</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('name')}><span className="flex items-center">Report<SortIcon field="name" /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('type')}><span className="flex items-center">Type<SortIcon field="type" /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('format')}><span className="flex items-center">Format<SortIcon field="format" /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('size')}><span className="flex items-center">Size<SortIcon field="size" /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort('generated_at')}><span className="flex items-center">Generated<SortIcon field="generated_at" /></span></TableHead>
                    <TableHead className="font-semibold">Scheduled</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedReports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="secondary">{r.type}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{r.format || 'Excel'}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.size || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(r.generated_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Switch checked={!!scheduledReports[r.id]} onCheckedChange={checked => {
                          setScheduledReports(prev => ({ ...prev, [r.id]: checked }));
                          toast({ title: checked ? 'Schedule Enabled' : 'Schedule Disabled', description: `${r.name} ${checked ? 'will be auto-generated weekly' : 'scheduling removed'}` });
                        }} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => toast({ title: 'Download Started' })}><Download className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedReports.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reports generated yet. Click a report type above to generate.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Platform activity and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityLogs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No activity logs yet</p>
                ) : activityLogs.map(item => {
                  const Icon = actionIcons[item.action] || Clock;
                  return (
                    <div key={item.id} className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5"><Icon className="w-4 h-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{item.action}</p>
                          <Badge variant="secondary" className="text-xs">{item.module}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.user_name || 'System'} • {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
