import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { GlobalDateFilter, DateRange } from '@/components/GlobalDateFilter';
import {
  Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Loader2,
  ShieldAlert, Timer, TimerOff, TimerReset, Bot, User, ArrowRightLeft,
  ThumbsUp, ThumbsDown, Star, Zap, XCircle, BarChart3, PieChart,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type HandlerType = 'human' | 'chatbot';

interface Ticket {
  ticketId: string;
  subject: string;
  issueType: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  description: string;
  channel: string;
  agent: string;
  handler: HandlerType;
  botTransferred: boolean;
  botResolved: boolean;
  autoReplied: boolean;
  autoReplySuccess: boolean;
  rating: number | null;
  slaHours: number;
  timeline: { status: string; timestamp: string; note: string }[];
}

const daysAgo = (d: number, h = 0) => { const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(dt.getHours() - h); return dt.toISOString(); };

const mockTickets: Ticket[] = [
  {
    ticketId: 'TKT-2026-001', subject: 'Settlement delayed for Amazon orders', issueType: 'Payment Issue',
    priority: 'high', status: 'open', createdAt: daysAgo(0), updatedAt: daysAgo(0),
    description: 'Amazon settlement for January cycle has not been received yet.',
    channel: 'amazon', agent: 'Rahul S.', handler: 'human', botTransferred: true, botResolved: false,
    autoReplied: true, autoReplySuccess: false, rating: null, slaHours: 24,
    timeline: [{ status: 'Created', timestamp: daysAgo(0), note: 'Ticket raised by vendor' }],
  },
  {
    ticketId: 'TKT-2026-002', subject: 'Product listing not appearing on Flipkart', issueType: 'Listing Issue',
    priority: 'medium', status: 'in_progress', createdAt: daysAgo(2), updatedAt: daysAgo(1),
    description: 'SKU-FLK-003 has been inactive for 3 days despite stock availability.',
    channel: 'flipkart', agent: 'Priya M.', handler: 'human', botTransferred: false, botResolved: false,
    autoReplied: true, autoReplySuccess: true, rating: null, slaHours: 48,
    timeline: [
      { status: 'Created', timestamp: daysAgo(2), note: 'Ticket raised by operations' },
      { status: 'Assigned', timestamp: daysAgo(2), note: 'Assigned to marketplace team' },
      { status: 'In Progress', timestamp: daysAgo(1), note: 'Investigating with Flipkart support' },
    ],
  },
  {
    ticketId: 'TKT-2026-003', subject: 'Incorrect inventory count at Mumbai FC', issueType: 'Inventory Issue',
    priority: 'urgent', status: 'escalated', createdAt: daysAgo(1), updatedAt: daysAgo(0),
    description: 'Physical count does not match system count for 12 SKUs.',
    channel: 'meesho', agent: 'Admin', handler: 'human', botTransferred: true, botResolved: false,
    autoReplied: false, autoReplySuccess: false, rating: null, slaHours: 12,
    timeline: [
      { status: 'Created', timestamp: daysAgo(1), note: 'Discrepancy reported by warehouse' },
      { status: 'Escalated', timestamp: daysAgo(0), note: 'Escalated to warehouse manager' },
    ],
  },
  {
    ticketId: 'TKT-2026-004', subject: 'Return claim rejected incorrectly', issueType: 'Returns Issue',
    priority: 'medium', status: 'resolved', createdAt: daysAgo(5), updatedAt: daysAgo(1),
    description: 'Return RET-2024-003 was marked ineligible but product was damaged in transit.',
    channel: 'amazon', agent: 'Priya M.', handler: 'human', botTransferred: false, botResolved: false,
    autoReplied: true, autoReplySuccess: true, rating: 5, slaHours: 48,
    timeline: [
      { status: 'Created', timestamp: daysAgo(5), note: 'Ticket raised by vendor' },
      { status: 'In Progress', timestamp: daysAgo(4), note: 'Reviewing claim evidence' },
      { status: 'Resolved', timestamp: daysAgo(1), note: 'Claim approved after review. Refund processed.' },
    ],
  },
  {
    ticketId: 'TKT-2026-005', subject: 'Bulk upload failing for CSV format', issueType: 'Technical Issue',
    priority: 'low', status: 'resolved', createdAt: daysAgo(7), updatedAt: daysAgo(3),
    description: 'CSV files with UTF-8 encoding are failing during upload.',
    channel: 'own_website', agent: 'Bot', handler: 'chatbot', botTransferred: false, botResolved: true,
    autoReplied: true, autoReplySuccess: true, rating: 4, slaHours: 72,
    timeline: [
      { status: 'Created', timestamp: daysAgo(7), note: 'Bug reported' },
      { status: 'Resolved', timestamp: daysAgo(3), note: 'Fixed in v1.0.2 update' },
    ],
  },
  {
    ticketId: 'TKT-2026-006', subject: 'Order tracking link not working', issueType: 'Technical Issue',
    priority: 'low', status: 'resolved', createdAt: daysAgo(4), updatedAt: daysAgo(2),
    description: 'Tracking link returns 404 for recent shipments.',
    channel: 'flipkart', agent: 'Bot', handler: 'chatbot', botTransferred: false, botResolved: true,
    autoReplied: true, autoReplySuccess: true, rating: 3, slaHours: 72,
    timeline: [
      { status: 'Created', timestamp: daysAgo(4), note: 'Auto-detected' },
      { status: 'Resolved', timestamp: daysAgo(2), note: 'Bot provided updated tracking link' },
    ],
  },
  {
    ticketId: 'TKT-2026-007', subject: 'GST mismatch on invoice', issueType: 'Payment Issue',
    priority: 'high', status: 'open', createdAt: daysAgo(0, 6), updatedAt: daysAgo(0, 3),
    description: 'GST rate on invoice does not match the product HSN code.',
    channel: 'amazon', agent: 'Rahul S.', handler: 'human', botTransferred: true, botResolved: false,
    autoReplied: true, autoReplySuccess: false, rating: null, slaHours: 24,
    timeline: [{ status: 'Created', timestamp: daysAgo(0, 6), note: 'Vendor reported mismatch' }],
  },
  {
    ticketId: 'TKT-2026-008', subject: 'Shipping label generation error', issueType: 'Logistics Issue',
    priority: 'medium', status: 'in_progress', createdAt: daysAgo(1, 10), updatedAt: daysAgo(0, 5),
    description: 'Label generation fails for pincode 110001.',
    channel: 'meesho', agent: 'Priya M.', handler: 'chatbot', botTransferred: true, botResolved: false,
    autoReplied: true, autoReplySuccess: true, rating: null, slaHours: 36,
    timeline: [
      { status: 'Created', timestamp: daysAgo(1, 10), note: 'Auto-detected from error logs' },
      { status: 'Bot Handled', timestamp: daysAgo(1, 8), note: 'Bot attempted fix, transferred to human' },
    ],
  },
];

const DONUT_COLORS = ['hsl(210, 70%, 50%)', 'hsl(160, 60%, 45%)'];
const CATEGORY_COLORS = ['hsl(var(--primary))', 'hsl(210, 60%, 55%)', 'hsl(35, 80%, 55%)', 'hsl(160, 55%, 45%)', 'hsl(340, 60%, 55%)', 'hsl(270, 50%, 55%)'];

const statusBadge = (status: TicketStatus) => {
  switch (status) {
    case 'open': return <Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1"><AlertCircle className="w-3 h-3" />Open</Badge>;
    case 'in_progress': return <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1"><Loader2 className="w-3 h-3" />In Progress</Badge>;
    case 'resolved': return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" />Resolved</Badge>;
    case 'escalated': return <Badge variant="outline" className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1"><ShieldAlert className="w-3 h-3" />Escalated</Badge>;
  }
};

const priorityBadge = (priority: TicketPriority) => {
  const cls = priority === 'urgent' ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
    : priority === 'high' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    : priority === 'medium' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
    : 'bg-muted text-muted-foreground';
  return <Badge variant="outline" className={`capitalize ${cls}`}>{priority}</Badge>;
};

export default function Support() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [channelFilter, setChannelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  const filtered = useMemo(() => {
    return mockTickets.filter(t => {
      if (channelFilter !== 'all' && t.channel !== channelFilter) return false;
      if (categoryFilter !== 'all' && t.issueType !== categoryFilter) return false;
      if (agentFilter !== 'all' && t.agent !== agentFilter) return false;
      if (dateRange.from && new Date(t.createdAt) < dateRange.from) return false;
      if (dateRange.to && new Date(t.createdAt) > dateRange.to) return false;
      return true;
    });
  }, [channelFilter, categoryFilter, agentFilter, dateRange]);

  const categories = [...new Set(mockTickets.map(t => t.issueType))];
  const agents = [...new Set(mockTickets.map(t => t.agent))];
  const channels = [...new Set(mockTickets.map(t => t.channel))];

  // ─── STATUS COUNTS ───
  const openCount = filtered.filter(t => t.status === 'open').length;
  const pendingCount = filtered.filter(t => t.status === 'in_progress').length;
  const resolvedCount = filtered.filter(t => t.status === 'resolved').length;
  const escalatedCount = filtered.filter(t => t.status === 'escalated').length;

  // ─── SLA ───
  const slaData = useMemo(() => {
    const now = Date.now();
    let missed = 0, nearing = 0, within = 0;
    filtered.forEach(t => {
      if (t.status === 'resolved') { within++; return; }
      const elapsed = (now - new Date(t.createdAt).getTime()) / 3600000;
      const remaining = t.slaHours - elapsed;
      if (remaining < 0) missed++;
      else if (remaining < t.slaHours * 0.25) nearing++;
      else within++;
    });
    return { missed, nearing, within };
  }, [filtered]);

  // ─── CATEGORY BREAKDOWN ───
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => { map[t.issueType] = (map[t.issueType] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ─── HUMAN vs BOT ───
  const humanCount = filtered.filter(t => t.handler === 'human').length;
  const botCount = filtered.filter(t => t.handler === 'chatbot').length;
  const handlerData = [
    { name: 'Human', value: humanCount },
    { name: 'Chatbot', value: botCount },
  ];
  const totalHandled = humanCount + botCount;

  // ─── BOT METRICS ───
  const botTransferred = filtered.filter(t => t.botTransferred).length;
  const botResolved = filtered.filter(t => t.botResolved).length;
  const botFailed = filtered.filter(t => t.botTransferred && !t.botResolved && t.handler === 'human').length;

  // ─── AUTO-REPLY ───
  const autoReplied = filtered.filter(t => t.autoReplied);
  const autoSuccess = autoReplied.filter(t => t.autoReplySuccess).length;
  const autoFailed = autoReplied.length - autoSuccess;
  const flowExecuted = autoReplied.length;

  // ─── FEEDBACK ───
  const ratedTickets = filtered.filter(t => t.rating !== null);
  const avgRating = ratedTickets.length > 0 ? +(ratedTickets.reduce((s, t) => s + (t.rating || 0), 0) / ratedTickets.length).toFixed(1) : 0;
  const positiveCount = ratedTickets.filter(t => (t.rating || 0) >= 4).length;
  const negativeCount = ratedTickets.filter(t => (t.rating || 0) < 3).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Dashboard</h1>
          <p className="text-muted-foreground">Monitor tickets, SLA, and bot performance</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise Support Ticket</DialogTitle>
              <DialogDescription>Describe your issue and we'll get back to you shortly</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Subject</Label><Input placeholder="Brief description of the issue" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Issue Type</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment Issue</SelectItem>
                      <SelectItem value="listing">Listing Issue</SelectItem>
                      <SelectItem value="inventory">Inventory Issue</SelectItem>
                      <SelectItem value="returns">Returns Issue</SelectItem>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Provide details about your issue..." rows={4} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => { toast({ title: 'Ticket Created', description: 'Your support ticket has been submitted.' }); setIsOpen(false); }}>Submit Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ═══ FILTER CONTROLS ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <GlobalDateFilter value={dateRange} onChange={setDateRange} />
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {channels.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Agent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ═══════════════════════════════════════════════
           TOP KPI ROW (Reference Design)
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10"><MessageSquare className="w-5 h-5 text-amber-600" /></div>
              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20 gap-0.5">↓ {openCount > 0 ? Math.min(openCount, 12) : 0}%</Badge>
            </div>
            <p className="text-2xl font-bold">{openCount + pendingCount}</p>
            <p className="text-sm text-muted-foreground">Open Tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10"><Clock className="w-5 h-5 text-blue-600" /></div>
              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20 gap-0.5">↓ 12%</Badge>
            </div>
            <p className="text-2xl font-bold">{filtered.length > 0 ? (filtered.reduce((s, t) => {
              const elapsed = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
              return s + Math.min(elapsed, t.slaHours);
            }, 0) / filtered.length).toFixed(1) : '0'} hrs</p>
            <p className="text-sm text-muted-foreground">Avg Response Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">↑ 3%</Badge>
            </div>
            <p className="text-2xl font-bold">{filtered.length > 0 ? Math.round((resolvedCount / filtered.length) * 100) : 0}%</p>
            <p className="text-sm text-muted-foreground">Resolution Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10"><User className="w-5 h-5 text-primary" /></div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">↑ 1.5%</Badge>
            </div>
            <p className="text-2xl font-bold">{ratedTickets.length > 0 ? Math.round((positiveCount / ratedTickets.length) * 100) : 92}%</p>
            <p className="text-sm text-muted-foreground">Customer Retention</p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
           BLOCK 1: TICKET STATUS SUMMARY
         ═══════════════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Ticket Status Summary
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Updated</Badge>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Open</p>
                <div className="p-1.5 rounded-lg bg-blue-500/10"><AlertCircle className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold">{openCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <div className="p-1.5 rounded-lg bg-amber-500/10"><Clock className="w-4 h-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Closed</p>
                <div className="p-1.5 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Escalated</p>
                <div className="p-1.5 rounded-lg bg-rose-500/10"><ShieldAlert className="w-4 h-4 text-rose-600" /></div>
              </div>
              <p className="text-2xl font-bold">{escalatedCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
           BLOCK 2: SLA MONITORING
         ═══════════════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          SLA Monitoring
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Updated</Badge>
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">SLA Missed</p>
                <div className="p-1.5 rounded-lg bg-rose-500/10"><TimerOff className="w-4 h-4 text-rose-600" /></div>
              </div>
              <p className="text-2xl font-bold text-rose-600">{slaData.missed}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Nearing SLA</p>
                <div className="p-1.5 rounded-lg bg-amber-500/10"><TimerReset className="w-4 h-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold text-amber-600">{slaData.nearing}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Within SLA</p>
                <div className="p-1.5 rounded-lg bg-emerald-500/10"><Timer className="w-4 h-4 text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{slaData.within}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
           BLOCK 3: BOT vs HUMAN PERFORMANCE
         ═══════════════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Bot vs Human Performance
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Updated</Badge>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" /> Human vs Chatbot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <RPieChart>
                    <Pie data={handlerData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {handlerData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </RPieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[0] }} />
                    <span className="text-sm">Human: {humanCount} ({totalHandled > 0 ? Math.round((humanCount / totalHandled) * 100) : 0}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[1] }} />
                    <span className="text-sm">Chatbot: {botCount} ({totalHandled > 0 ? Math.round((botCount / totalHandled) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bot Transfer Tracking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Bot Transfer Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-amber-600" /><span className="text-sm">Bot → Human</span></div>
                  <span className="text-lg font-bold text-amber-600">{botTransferred}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-600" /><span className="text-sm">Resolved by Bot</span></div>
                  <span className="text-lg font-bold text-emerald-600">{botResolved}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-600" /><span className="text-sm">Bot Failure</span></div>
                  <span className="text-lg font-bold text-rose-600">{botFailed}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Reply Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" /> Auto-Reply Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-sm">Successful</span></div>
                  <span className="text-lg font-bold text-emerald-600">{autoSuccess}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-600" /><span className="text-sm">Failed</span></div>
                  <span className="text-lg font-bold text-rose-600">{autoFailed}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-600" /><span className="text-sm">Flows Executed</span></div>
                  <span className="text-lg font-bold text-blue-600">{flowExecuted}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
           BLOCK 4: ISSUE INSIGHTS & FEEDBACK
         ═══════════════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Issue Insights & Feedback
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Updated</Badge>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Issue Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={110} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" className="fill-muted-foreground" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Feedback Ratings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" /> Feedback Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="text-center py-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-6 h-6 ${s <= Math.round(avgRating) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <p className="text-3xl font-bold">{avgRating}</p>
                  <p className="text-sm text-muted-foreground">Average Rating ({ratedTickets.length} reviews)</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-emerald-600" /><span className="text-sm">Positive (≥4★)</span></div>
                      <span className="text-sm font-semibold text-emerald-600">{positiveCount}</span>
                    </div>
                    <Progress value={ratedTickets.length > 0 ? (positiveCount / ratedTickets.length) * 100 : 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2"><ThumbsDown className="w-4 h-4 text-rose-600" /><span className="text-sm">Negative (&lt;3★)</span></div>
                      <span className="text-sm font-semibold text-rose-600">{negativeCount}</span>
                    </div>
                    <Progress value={ratedTickets.length > 0 ? (negativeCount / ratedTickets.length) * 100 : 0} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ TICKETS TABLE ═══ */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>All tickets and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Ticket ID</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Handler</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ticket => (
                <TableRow key={ticket.ticketId}>
                  <TableCell className="font-mono text-sm">{ticket.ticketId}</TableCell>
                  <TableCell className="font-medium max-w-[220px] truncate">{ticket.subject}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{ticket.issueType}</Badge></TableCell>
                  <TableCell>{priorityBadge(ticket.priority)}</TableCell>
                  <TableCell>{statusBadge(ticket.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs gap-1 ${ticket.handler === 'chatbot' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                      {ticket.handler === 'chatbot' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {ticket.handler === 'chatbot' ? 'Bot' : ticket.agent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(ticket.createdAt), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Dialog open={selectedTicket?.ticketId === ticket.ticketId} onOpenChange={open => !open && setSelectedTicket(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(ticket)}>View</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{ticket.subject}</DialogTitle>
                          <DialogDescription>{ticket.ticketId} • {ticket.issueType}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex gap-2 flex-wrap">{priorityBadge(ticket.priority)}{statusBadge(ticket.status)}</div>
                          <p className="text-sm text-muted-foreground">{ticket.description}</p>
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Response Timeline</h4>
                            <div className="space-y-3">
                              {ticket.timeline.map((t, i) => (
                                <div key={i} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === ticket.timeline.length - 1 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                    {i < ticket.timeline.length - 1 && <div className="w-px h-full bg-muted-foreground/20" />}
                                  </div>
                                  <div className="pb-3">
                                    <p className="text-sm font-medium">{t.status}</p>
                                    <p className="text-xs text-muted-foreground">{t.note}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(t.timestamp), 'dd MMM yyyy, HH:mm')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
