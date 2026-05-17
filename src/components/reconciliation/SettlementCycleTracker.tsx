import { useState, useMemo, useEffect } from 'react';
import { ChannelIcon } from '@/components/ChannelIcon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getChannels } from '@/services/channelManager';
import { Portal } from '@/types';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { format } from 'date-fns';

type DelayStatus = 'on_time' | 'delayed' | 'critical_delay';

interface SettlementCycle {
  id: string;
  batchId: string;
  portal: Portal;
  cycleType: 'T+7' | 'T+15' | 'T+30';
  expectedDate: string;
  actualDate: string | null;
  amount: number;
  delayDays: number;
  status: DelayStatus;
}

const daysAgo = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString(); };
const daysFromNow = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString(); };

const mockCycles: SettlementCycle[] = [];

const statusConfig: Record<DelayStatus, { label: string; className: string; icon: React.ElementType }> = {
  on_time: { label: 'On Time', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  delayed: { label: 'Delayed', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  critical_delay: { label: 'Critical Delay', className: 'bg-rose-500/15 text-rose-600 border-rose-500/30', icon: XCircle },
};

export default function SettlementCycleTracker() {
  const [filterPortal, setFilterPortal] = useState<Portal | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DelayStatus | 'all'>('all');
  const [cycles, setCycles] = useState<SettlementCycle[]>([]);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const rows = await db.settlementsDb.getAll();
        if (!mounted) return;
        const mapped = (rows || []).map((r: any) => ({
          id: r.id,
          batchId: r.batch_id || r.settlement_batch || `B-${r.id}`,
          portal: r.portal || r.marketplace || 'firstcry',
          cycleType: r.cycle || 'T+7',
          expectedDate: r.expected_date || r.settlement_date || new Date().toISOString(),
          actualDate: r.actual_date || r.paid_at || null,
          amount: Number(r.amount || r.total || 0),
          delayDays: Number(r.delay_days || 0),
          status: (r.status || (r.delay_days && r.delay_days > 7 ? 'critical_delay' : r.delay_days ? 'delayed' : 'on_time')) as DelayStatus,
        }));
        setCycles(mapped);
      } catch (e) { console.debug('load settlement cycles failed', e); }
    })();
    (async () => {
      try {
        const ch = await getChannels();
        if (mounted) setChannels(ch || []);
      } catch (e) { }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    return cycles.filter(c => {
      const mp = filterPortal === 'all' || c.portal === filterPortal;
      const ms = filterStatus === 'all' || c.status === filterStatus;
      return mp && ms;
    });
  }, [filterPortal, filterStatus, cycles]);

  const stats = useMemo(() => {
    const delayed = cycles.filter(c => c.status !== 'on_time');
    const avgDelay = delayed.length > 0 ? (delayed.reduce((s, c) => s + c.delayDays, 0) / delayed.length).toFixed(1) : '0';
    const portalDelays: Record<string, number> = {};
    delayed.forEach(c => { portalDelays[String(c.portal)] = (portalDelays[String(c.portal)] || 0) + c.delayDays; });
    const highestDelayPortal = Object.entries(portalDelays).sort((a, b) => b[1] - a[1])[0];
    const hp = highestDelayPortal ? channels.find((p: any) => p.id === highestDelayPortal[0] || p.key === highestDelayPortal[0]) : null;
    return { totalDelayed: delayed.length, avgDelay, highestPortal: hp?.name || 'N/A' };
  }, [cycles, channels]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Timer className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.totalDelayed}</p><p className="text-sm text-muted-foreground">Delayed Settlements</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><Clock className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{stats.avgDelay} days</p><p className="text-sm text-muted-foreground">Avg Settlement Delay</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div><div><p className="text-2xl font-bold">{stats.highestPortal}</p><p className="text-sm text-muted-foreground">Highest Delay Portal</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle>Settlement Cycle Tracker</CardTitle>
              <CardDescription>Monitor settlement timelines and detect payment delays</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterPortal} onValueChange={(v) => setFilterPortal(v as Portal | 'all')}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Portal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Portals</SelectItem>
                  {channels.map(p => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><ChannelIcon channelId={p.id} fallbackIcon={p.icon} size={16} /> {p.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DelayStatus | 'all')}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="on_time">On Time</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="critical_delay">Critical Delay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Batch ID</TableHead>
                  <TableHead className="font-semibold">Portal</TableHead>
                  <TableHead className="font-semibold">Cycle Type</TableHead>
                  <TableHead className="font-semibold">Expected Date</TableHead>
                  <TableHead className="font-semibold">Actual Date</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                  <TableHead className="text-center font-semibold">Delay Days</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const portal = channels.find((p: any) => p.id === c.portal) || channels.find((p: any) => p.key === c.portal) || { id: c.portal, name: c.portal, icon: undefined };
                  const sc = statusConfig[c.status];
                  const Icon = sc.icon;
                  return (
                    <TableRow key={c.id} className={c.status === 'critical_delay' ? 'bg-rose-500/5' : c.status === 'delayed' ? 'bg-amber-500/5' : ''}>
                      <TableCell className="font-mono text-sm">{c.batchId}</TableCell>
                      <TableCell><span className="flex items-center gap-1.5 text-sm"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</span></TableCell>
                      <TableCell><Badge variant="outline">{c.cycleType}</Badge></TableCell>
                      <TableCell>{format(new Date(c.expectedDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{c.actualDate ? format(new Date(c.actualDate), 'dd MMM yyyy') : <span className="text-muted-foreground italic">Pending</span>}</TableCell>
                      <TableCell className="text-right font-medium">₹{c.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center"><span className={`font-bold ${c.delayDays > 3 ? 'text-rose-600' : c.delayDays > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{c.delayDays}</span></TableCell>
                      <TableCell><Badge variant="outline" className={`gap-1 ${sc.className}`}><Icon className="w-3 h-3" />{sc.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
