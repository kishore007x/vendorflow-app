import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Plus, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  timeline: { action: string; by: string; at: string }[];
}

const mockTickets: Ticket[] = [
  {
    id: 'TKT-001', subject: 'Flipkart order sync failing', category: 'Integration', priority: 'high', status: 'in_progress',
    createdAt: '2025-11-28',
    timeline: [
      { action: 'Ticket Created', by: 'Vendor', at: '2025-11-28 09:15' },
      { action: 'Assigned to Integration Team', by: 'Admin', at: '2025-11-28 10:30' },
      { action: 'Investigating API timeout issue', by: 'Support', at: '2025-11-28 14:00' },
    ],
  },
  {
    id: 'TKT-002', subject: 'Payment settlement discrepancy ₹12,450', category: 'Finance', priority: 'critical', status: 'open',
    createdAt: '2025-12-01',
    timeline: [
      { action: 'Ticket Created', by: 'Vendor', at: '2025-12-01 11:00' },
    ],
  },
  {
    id: 'TKT-003', subject: 'Need bulk upload template for Meesho', category: 'Data', priority: 'low', status: 'resolved',
    createdAt: '2025-11-20',
    timeline: [
      { action: 'Ticket Created', by: 'Vendor', at: '2025-11-20 08:30' },
      { action: 'Template shared via email', by: 'Support', at: '2025-11-20 12:15' },
      { action: 'Resolved', by: 'Vendor', at: '2025-11-21 09:00' },
    ],
  },
  {
    id: 'TKT-004', subject: 'Dashboard loading slowly', category: 'Performance', priority: 'medium', status: 'closed',
    createdAt: '2025-11-15',
    timeline: [
      { action: 'Ticket Created', by: 'Vendor', at: '2025-11-15 16:00' },
      { action: 'Optimized query performance', by: 'Dev Team', at: '2025-11-17 10:00' },
      { action: 'Closed - Performance improved', by: 'Admin', at: '2025-11-18 09:30' },
    ],
  },
];

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-500/20 text-gray-400' },
  medium: { label: 'Medium', color: 'bg-blue-500/20 text-blue-400' },
  high: { label: 'High', color: 'bg-amber-500/20 text-amber-400' },
  critical: { label: 'Critical', color: 'bg-rose-500/20 text-rose-400' },
};

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400', icon: AlertTriangle },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400', icon: XCircle },
};

export default function DemoTicketing() {
  const [tickets, setTickets] = useState(mockTickets);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Ticket['priority']>('medium');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const handleCreate = () => {
    if (!subject || !category) {
      toast({ title: 'Missing Fields', description: 'Subject and category are required.', variant: 'destructive' });
      return;
    }
    const newTicket: Ticket = {
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      subject, category, priority, status: 'open',
      createdAt: new Date().toISOString().split('T')[0],
      timeline: [{ action: 'Ticket Created', by: 'Vendor', at: new Date().toLocaleString() }],
    };
    setTickets([newTicket, ...tickets]);
    setSubject(''); setCategory(''); setDescription(''); setPriority('medium');
    toast({ title: 'Ticket Created', description: `${newTicket.id} raised successfully.` });
  };

  const updateStatus = (id: string, status: Ticket['status']) => {
    setTickets((prev) => prev.map((t) =>
      t.id === id ? { ...t, status, timeline: [...t.timeline, { action: statusConfig[status].label, by: 'Admin', at: new Date().toLocaleString() }] } : t
    ));
    toast({ title: 'Ticket Updated', description: `${id} → ${statusConfig[status].label}` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
        <p className="text-sm text-gray-400">Raise and manage support requests</p>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="bg-[#111833] border border-white/10">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">All Tickets</TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">Raise Ticket</TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">Timeline</TabsTrigger>
        </TabsList>

        {/* All Tickets (Admin view) */}
        <TabsContent value="tickets">
          <Card className="bg-[#111833] border-white/10">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Subject</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Priority</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 px-4 text-gray-300 font-mono text-xs">{t.id}</td>
                        <td className="py-3 px-4 text-gray-200">{t.subject}</td>
                        <td className="py-3 px-4"><Badge variant="outline" className="text-xs border-white/20 text-gray-300">{t.category}</Badge></td>
                        <td className="py-3 px-4 text-center"><Badge className={`text-xs ${priorityConfig[t.priority].color}`}>{priorityConfig[t.priority].label}</Badge></td>
                        <td className="py-3 px-4 text-center"><Badge className={`text-xs ${statusConfig[t.status].color}`}>{statusConfig[t.status].label}</Badge></td>
                        <td className="py-3 px-4 text-center">
                          {t.status !== 'closed' && (
                            <Select onValueChange={(v) => updateStatus(t.id, v as Ticket['status'])}>
                              <SelectTrigger className="h-7 text-xs bg-white/[0.03] border-white/10 text-gray-400 w-28">
                                <SelectValue placeholder="Update" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a2240] border-white/10">
                                <SelectItem value="in_progress" className="text-gray-200 text-xs focus:bg-white/10">In Progress</SelectItem>
                                <SelectItem value="resolved" className="text-gray-200 text-xs focus:bg-white/10">Resolved</SelectItem>
                                <SelectItem value="closed" className="text-gray-200 text-xs focus:bg-white/10">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raise Ticket */}
        <TabsContent value="create">
          <Card className="bg-[#111833] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" /> New Support Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Subject *</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description" className="bg-white/[0.03] border-white/10 text-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white/[0.03] border-white/10 text-gray-300">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2240] border-white/10">
                      {['Integration', 'Finance', 'Data', 'Performance', 'General'].map((c) => (
                        <SelectItem key={c} value={c} className="text-gray-200 focus:bg-white/10">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Ticket['priority'])}>
                  <SelectTrigger className="bg-white/[0.03] border-white/10 text-gray-300 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2240] border-white/10">
                    {Object.entries(priorityConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-gray-200 focus:bg-white/10">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue in detail..." className="bg-white/[0.03] border-white/10 text-gray-200 min-h-[100px]" />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate}>
                <MessageSquare className="w-4 h-4 mr-2" /> Submit Ticket
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card className="bg-[#111833] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-200">Ticket Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {tickets.map((t) => (
                <div key={t.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${statusConfig[t.status].color}`}>{statusConfig[t.status].label}</Badge>
                    <p className="text-sm font-medium text-gray-300">{t.subject}</p>
                    <span className="text-xs text-gray-500 ml-auto">{t.id}</span>
                  </div>
                  <div className="ml-4 border-l-2 border-white/10 pl-4 space-y-2">
                    {t.timeline.map((log, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 -ml-[21px]" />
                        <div>
                          <p className="text-xs text-gray-300">{log.action}</p>
                          <p className="text-[10px] text-gray-500">{log.by} • {log.at}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
