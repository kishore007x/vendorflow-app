import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Phone, TrendingUp, CheckCircle2, XCircle, AlertCircle, Search, Download, Eye, Loader2, Upload, Globe, Building2, MapPin, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { leadsDb } from '@/services/database';
import LeadImport from '@/components/leads/LeadImport';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost';

const sourceConfig: Record<string, { label: string; icon: string; color: string }> = {
  indiamart: { label: 'IndiaMART', icon: '🏭', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  justdial: { label: 'JustDial', icon: '📞', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  tradeindia: { label: 'TradeIndia', icon: '🌐', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  website: { label: 'Website', icon: '💻', color: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  referral: { label: 'Referral', icon: '🤝', color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  social_media: { label: 'Social Media', icon: '📱', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: AlertCircle },
  contacted: { label: 'Contacted', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Phone },
  qualified: { label: 'Qualified', color: 'bg-violet-500/15 text-violet-600 border-violet-500/30', icon: CheckCircle2 },
  negotiation: { label: 'Negotiation', color: 'bg-orange-500/15 text-orange-600 border-orange-500/30', icon: TrendingUp },
  won: { label: 'Won', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  lost: { label: 'Lost', color: 'bg-rose-500/15 text-rose-600 border-rose-500/30', icon: XCircle },
};

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

export default function LeadManagement() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState('indiamart');
  const [newLead, setNewLead] = useState({
    company_name: '', contact_person: '', phone: '', email: '', whatsapp: '', website: '', gstin: '', address: '', city: '', state: '',
    source: 'website', status: 'new' as LeadStatus, priority: 'medium' as any, value: 0, notes: '',
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await leadsDb.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        search: searchQuery || undefined,
      });
      setLeads(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, [searchQuery, statusFilter, sourceFilter]);

  const handleCreateLead = async () => {
    try {
      await leadsDb.create(newLead as any);
      toast({ title: 'Lead Created', description: `${newLead.company_name} added to pipeline` });
      setShowNewLead(false);
      setNewLead({ company_name: '', contact_person: '', phone: '', email: '', whatsapp: '', website: '', gstin: '', address: '', city: '', state: '', source: 'website', status: 'new', priority: 'medium', value: 0, notes: '' });
      fetchLeads();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (id: string, status: LeadStatus) => {
    try {
      await leadsDb.update(id, { status });
      toast({ title: 'Status Updated' });
      fetchLeads();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    active: leads.filter(l => ['contacted', 'qualified', 'negotiation'].includes(l.status)).length,
    won: leads.filter(l => l.status === 'won').length,
    lost: leads.filter(l => l.status === 'lost').length,
    totalValue: leads.filter(l => l.status !== 'lost').reduce((s, l) => s + (l.value || 0), 0),
    imported: leads.filter(l => l.imported_via).length,
  }), [leads]);

  const pipelineData = useMemo(() => {
    const stages: LeadStatus[] = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];
    return stages.map(s => ({
      status: s,
      ...(statusConfig[s] || { label: s, color: '', icon: AlertCircle }),
      count: leads.filter(l => l.status === s).length,
      value: leads.filter(l => l.status === s).reduce((sum, l) => sum + (l.value || 0), 0),
    }));
  }, [leads]);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Management</h1>
          <p className="text-muted-foreground">Track and manage business leads from all sources</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => toast({ title: 'Exported' })}><Download className="w-4 h-4" />Export</Button>
          <Select value={importSource} onValueChange={setImportSource}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(sourceConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" />Import Leads
          </Button>
          <Button className="gap-2" onClick={() => setShowNewLead(true)}><Plus className="w-4 h-4" />Add Lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Leads</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-blue-600">{stats.new}</p><p className="text-xs text-muted-foreground">New</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{stats.active}</p><p className="text-xs text-muted-foreground">Active Pipeline</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{stats.won}</p><p className="text-xs text-muted-foreground">Won</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-rose-600">{stats.lost}</p><p className="text-xs text-muted-foreground">Lost</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{fmt(stats.totalValue)}</p><p className="text-xs text-muted-foreground">Pipeline Value</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">{stats.imported}</p><p className="text-xs text-muted-foreground">Imported</p></CardContent></Card>
      </div>

      {/* Sales Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Sales Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pipelineData.map((stage, i) => {
              const maxCount = Math.max(...pipelineData.map(s => s.count), 1);
              const widthPercent = Math.max(((pipelineData.length - i) / pipelineData.length) * 100, 30);
              const fillPercent = stage.count > 0 ? (stage.count / maxCount) * 100 : 0;
              const StIcon = stage.icon;
              const conversionRate = i > 0 && pipelineData[i - 1].count > 0
                ? Math.round((stage.count / pipelineData[i - 1].count) * 100)
                : null;
              return (
                <div key={stage.status} className="flex items-center gap-3">
                  {/* Conversion arrow */}
                  <div className="w-12 text-right shrink-0">
                    {conversionRate !== null && (
                      <span className={`text-xs font-semibold ${conversionRate >= 50 ? 'text-emerald-600' : conversionRate >= 25 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {conversionRate}%
                      </span>
                    )}
                  </div>
                  {/* Funnel bar */}
                  <div className="flex-1 flex justify-center">
                    <div
                      className="relative rounded-lg overflow-hidden h-12 transition-all duration-500 cursor-pointer hover:opacity-90"
                      style={{ width: `${widthPercent}%` }}
                      onClick={() => setStatusFilter(statusFilter === stage.status ? 'all' : stage.status)}
                    >
                      <div className="absolute inset-0 bg-muted/40 border border-border rounded-lg" />
                      <div
                        className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ${
                          stage.status === 'won' ? 'bg-emerald-500/30' :
                          stage.status === 'lost' ? 'bg-rose-500/20' :
                          'bg-primary/20'
                        }`}
                        style={{ width: `${fillPercent}%` }}
                      />
                      <div className="relative flex items-center justify-between px-4 h-full">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${stage.color} text-xs`}>
                            <StIcon className="w-3 h-3 mr-1" />{stage.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold">{stage.count}</span>
                          <span className="text-xs text-muted-foreground">{fmt(stage.value)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Funnel summary */}
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-bold text-emerald-600">
                {stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Loss Rate</p>
              <p className="text-lg font-bold text-rose-600">
                {stats.total > 0 ? Math.round((stats.lost / stats.total) * 100) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Active Conversion</p>
              <p className="text-lg font-bold text-primary">
                {stats.new > 0 ? Math.round((stats.active / (stats.new + stats.active)) * 100) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pipeline Value</p>
              <p className="text-lg font-bold">{fmt(stats.totalValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search leads..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(sourceConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Lead</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold text-right">Value</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => {
                const src = sourceConfig[lead.source] || { label: lead.source, icon: '📋', color: '' };
                const st = statusConfig[lead.status] || { label: lead.status, color: '', icon: AlertCircle };
                const StIcon = st.icon;
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.company_name}</p>
                        <p className="text-xs text-muted-foreground">{lead.contact_person}</p>
                        {lead.imported_via && <Badge variant="outline" className="text-[10px] mt-0.5 bg-muted/50">Imported</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm">{lead.phone || '—'}</p>
                        <p className="text-xs text-muted-foreground">{lead.email || '—'}</p>
                        {lead.whatsapp && <p className="text-xs text-emerald-600 flex items-center gap-1"><MessageCircle className="w-3 h-3" />{lead.whatsapp}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={src.color}>{src.icon} {src.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={st.color}><StIcon className="w-3 h-3 mr-1" />{st.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={lead.priority === 'high' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : lead.priority === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-muted text-muted-foreground'}>{lead.priority}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{fmt(lead.value || 0)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                );
              })}
              {leads.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads found. Import leads or add your first one.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={open => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedLead?.company_name}</DialogTitle></DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Contact</p><p className="font-medium">{selectedLead.contact_person}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p>{selectedLead.phone || '—'}</p></div>
                <div><p className="text-muted-foreground">Email</p><p>{selectedLead.email || '—'}</p></div>
                <div><p className="text-muted-foreground">Value</p><p className="font-bold">{fmt(selectedLead.value || 0)}</p></div>
              </div>

              {/* Enrichment fields */}
              {(selectedLead.whatsapp || selectedLead.website || selectedLead.gstin || selectedLead.address) && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrichment Data</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedLead.whatsapp && (
                      <div className="flex items-start gap-2"><MessageCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><div><p className="text-muted-foreground text-xs">WhatsApp</p><p>{selectedLead.whatsapp}</p></div></div>
                    )}
                    {selectedLead.website && (
                      <div className="flex items-start gap-2"><Globe className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" /><div><p className="text-muted-foreground text-xs">Website</p><a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{selectedLead.website}</a></div></div>
                    )}
                    {selectedLead.gstin && (
                      <div className="flex items-start gap-2"><Building2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /><div><p className="text-muted-foreground text-xs">GSTIN</p><p className="font-mono text-xs">{selectedLead.gstin}</p></div></div>
                    )}
                    {(selectedLead.address || selectedLead.city || selectedLead.state) && (
                      <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" /><div><p className="text-muted-foreground text-xs">Address</p><p>{[selectedLead.address, selectedLead.city, selectedLead.state].filter(Boolean).join(', ')}</p></div></div>
                    )}
                  </div>
                </div>
              )}

              {selectedLead.imported_via && (
                <Badge variant="outline" className="bg-muted/50">📥 Imported via {selectedLead.imported_via}</Badge>
              )}

              {selectedLead.notes && <div><p className="text-sm text-muted-foreground">Notes</p><p className="text-sm">{selectedLead.notes}</p></div>}
              <div className="flex gap-2 flex-wrap">
                {(['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'] as LeadStatus[]).map(s => (
                  <Button key={s} variant={selectedLead.status === s ? 'default' : 'outline'} size="sm" onClick={() => { handleUpdateStatus(selectedLead.id, s); setSelectedLead({ ...selectedLead, status: s }); }}>
                    {statusConfig[s]?.label || s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Lead Dialog */}
      <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company Name *</Label><Input value={newLead.company_name} onChange={e => setNewLead(p => ({ ...p, company_name: e.target.value }))} /></div>
              <div><Label>Contact Person *</Label><Input value={newLead.contact_person} onChange={e => setNewLead(p => ({ ...p, contact_person: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>WhatsApp Number</Label><Input value={newLead.whatsapp} onChange={e => setNewLead(p => ({ ...p, whatsapp: e.target.value }))} placeholder="e.g. 9876543210" /></div>
              <div><Label>Website</Label><Input value={newLead.website} onChange={e => setNewLead(p => ({ ...p, website: e.target.value }))} placeholder="www.example.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>GST Number</Label><Input value={newLead.gstin} onChange={e => setNewLead(p => ({ ...p, gstin: e.target.value }))} placeholder="e.g. 27AABCA1234C1Z5" /></div>
              <div><Label>Address</Label><Input value={newLead.address} onChange={e => setNewLead(p => ({ ...p, address: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={newLead.city} onChange={e => setNewLead(p => ({ ...p, city: e.target.value }))} /></div>
              <div><Label>State</Label><Input value={newLead.state} onChange={e => setNewLead(p => ({ ...p, state: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Source</Label>
                <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(sourceConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Value (₹)</Label><Input type="number" value={newLead.value} onChange={e => setNewLead(p => ({ ...p, value: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLead(false)}>Cancel</Button>
            <Button onClick={handleCreateLead} disabled={!newLead.company_name || !newLead.contact_person}>Create Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <LeadImport open={showImport} onOpenChange={setShowImport} defaultSource={importSource} onComplete={fetchLeads} />
    </div>
  );
}
