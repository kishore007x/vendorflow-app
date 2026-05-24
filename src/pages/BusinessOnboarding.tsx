import { useState, useMemo } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GlobalDateFilter, DateRange } from '@/components/GlobalDateFilter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, Plus, FileText, CheckCircle2, Clock, XCircle, Upload, Eye,
  AlertCircle, Shield, Users, ClipboardList, Download, FileSpreadsheet,
  Search, Bell, History, ToggleLeft, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { getChannels } from '@/services/channelManager';

type OnboardingStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';
type SubscriptionStatus = 'trial' | 'fully_paid' | 'partially_paid' | 'wallet_balance';

interface OnboardingRequest {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  platforms: string[];
  status: OnboardingStatus;
  submittedAt: string;
  updatedAt: string;
  documents: { name: string; uploaded: boolean }[];
  adminNotes: string;
  auditLog: { action: string; by: string; time: string }[];
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry: string;
  accessEnabled: boolean;
  changeLog: { field: string; oldValue: string; newValue: string; by: string; time: string }[];
}

const daysAgo = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString(); };
const daysFromNow = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString(); };

const subStatusConfig: Record<SubscriptionStatus, { label: string; color: string }> = {
  trial: { label: 'Trial', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  fully_paid: { label: 'Fully Paid', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  partially_paid: { label: 'Partially Paid', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  wallet_balance: { label: 'Wallet Balance', color: 'bg-violet-500/15 text-violet-600 border-violet-500/30' },
};

// Onboarding requests are fetched from DB

const statusConfig: Record<OnboardingStatus, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Eye },
  approved: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-rose-500/15 text-rose-600 border-rose-500/30', icon: XCircle },
};

const allPlatforms = getChannels().map(c => c.name);

export default function BusinessOnboarding() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [showChangeLog, setShowChangeLog] = useState<OnboardingRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [sortKey, setSortKey] = useState<string>('submittedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // load onboarding requests from DB
  useMemo(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const data = await db.onboardingDb.getAll().catch(() => []);
        if (!mounted) return;
        setRequests(data || []);
      } catch (e) { console.debug('failed to load onboarding', e); }
    })();
    return () => { mounted = false; };
  }, []);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 inline text-primary" />;
  };

  const filtered = useMemo(() => {
    const data = requests.filter(r => {
      const matchSearch = r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchSub = subFilter === 'all' || r.subscriptionStatus === subFilter;
      let matchDate = true;
      if (dateRange.from && dateRange.to) {
        const d = new Date(r.submittedAt);
        matchDate = d >= dateRange.from && d <= dateRange.to;
      }
      return matchSearch && matchStatus && matchSub && matchDate;
    });
    data.sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [requests, searchQuery, statusFilter, subFilter, dateRange, sortKey, sortDir]);

  const stats = {
    total: requests.length,
    submitted: requests.filter(r => r.status === 'submitted').length,
    underReview: requests.filter(r => r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const handleAdminAction = (id: string, action: 'approved' | 'rejected') => {
    setRequests(prev => prev.map(r => r.id === id ? {
      ...r, status: action, updatedAt: new Date().toISOString(),
      auditLog: [...r.auditLog, { action: action === 'approved' ? 'Approved by admin' : 'Rejected by admin', by: 'Admin', time: new Date().toISOString() }],
      changeLog: [...r.changeLog, { field: 'status', oldValue: r.status, newValue: action, by: 'Admin', time: new Date().toISOString() }],
    } : r));
    toast({ title: action === 'approved' ? 'Application Approved' : 'Application Rejected', description: `Onboarding request ${id} has been ${action}` });
    setSelectedRequest(null);
  };

  const toggleAccess = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? {
      ...r, accessEnabled: !r.accessEnabled, updatedAt: new Date().toISOString(),
      changeLog: [...r.changeLog, { field: 'accessEnabled', oldValue: String(r.accessEnabled), newValue: String(!r.accessEnabled), by: 'Admin', time: new Date().toISOString() }],
    } : r));
  };

  const handleExport = () => {
    const headers = ['ID', 'Company', 'Contact', 'Email', 'GSTIN', 'Status', 'Subscription', 'Expiry', 'Access'];
    const rows = requests.map(r => [r.id, r.companyName, r.contactPerson, r.email, r.gstin, r.status, r.subscriptionStatus, r.subscriptionExpiry, r.accessEnabled]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'onboarding_requests.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Onboarding data exported to CSV' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Onboarding</h1>
          <p className="text-muted-foreground">Manage business onboarding requests and approvals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}><FileSpreadsheet className="w-4 h-4" />Export</Button>
          <Button className="gap-2" onClick={() => setShowNewRequest(true)}><Plus className="w-4 h-4" />New Request</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Requests</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-blue-600">{stats.submitted}</p><p className="text-xs text-muted-foreground">Submitted</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{stats.underReview}</p><p className="text-xs text-muted-foreground">Under Review</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{stats.approved}</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-rose-600">{stats.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ClipboardList className="w-4 h-4" />All Requests</TabsTrigger>
          <TabsTrigger value="admin" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="w-4 h-4" />Admin Panel</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-4">
          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by company, contact, ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={subFilter} onValueChange={setSubFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Subscription" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subscriptions</SelectItem>
                {Object.entries(subStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <GlobalDateFilter value={dateRange} onChange={setDateRange} />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('id')}>ID<SortIcon col="id" /></TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('companyName')}>Company<SortIcon col="companyName" /></TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('contactPerson')}>Contact<SortIcon col="contactPerson" /></TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('status')}>Status<SortIcon col="status" /></TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('subscriptionStatus')}>Subscription<SortIcon col="subscriptionStatus" /></TableHead>
                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('subscriptionExpiry')}>Expiry<SortIcon col="subscriptionExpiry" /></TableHead>
                    <TableHead className="font-semibold">Access</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(req => {
                    const st = statusConfig[req.status];
                    const sub = subStatusConfig[req.subscriptionStatus];
                    const daysLeft = differenceInDays(new Date(req.subscriptionExpiry), new Date());
                    const expiryWarning = daysLeft <= 7 && daysLeft > 0;
                    const expired = daysLeft <= 0;
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-sm">{req.id}</TableCell>
                        <TableCell><div><p className="font-medium">{req.companyName}</p><p className="text-xs text-muted-foreground">{req.gstin}</p></div></TableCell>
                        <TableCell><div><p className="text-sm">{req.contactPerson}</p><p className="text-xs text-muted-foreground">{req.email}</p></div></TableCell>
                        <TableCell><Badge variant="outline" className={`gap-1 ${st.color}`}><st.icon className="w-3 h-3" />{st.label}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={sub.color}>{sub.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{format(new Date(req.subscriptionExpiry), 'dd MMM yyyy')}</span>
                            {expiryWarning && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-0.5"><Bell className="w-2.5 h-2.5" />{daysLeft}d</Badge>}
                            {expired && <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">Expired</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch checked={req.accessEnabled} onCheckedChange={() => toggleAccess(req.id)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowChangeLog(req)}><History className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                    {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No requests yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Pending Approvals</CardTitle><CardDescription>Review and approve/reject onboarding requests</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.filter(r => ['submitted', 'under_review'].includes(r.status)).map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{req.companyName}</p>
                      <p className="text-sm text-muted-foreground">{req.contactPerson} • {req.platforms.join(', ')}</p>
                      <div className="flex gap-2 mt-2">
                        {req.documents.map(d => (
                          <Badge key={d.name} variant="outline" className={d.uploaded ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs' : 'bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs'}>
                            {d.uploaded ? '✓' : '✗'} {d.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-rose-600" onClick={() => setConfirmAction({ id: req.id, action: 'rejected' })}>Reject</Button>
                      <Button size="sm" onClick={() => setConfirmAction({ id: req.id, action: 'approved' })}>Approve</Button>
                    </div>
                  </div>
                ))}
                {requests.filter(r => ['submitted', 'under_review'].includes(r.status)).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No pending approvals</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={open => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.companyName}</DialogTitle>
            <DialogDescription>{selectedRequest?.id}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Contact</p><p className="font-medium">{selectedRequest.contactPerson}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selectedRequest.email}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedRequest.phone}</p></div>
                <div><p className="text-muted-foreground">GSTIN</p><p className="font-medium font-mono">{selectedRequest.gstin}</p></div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Documents</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.documents.map(d => (
                    <Badge key={d.name} variant="outline" className={d.uploaded ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}>
                      {d.uploaded ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}{d.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedRequest.adminNotes && (
                <div><p className="text-sm font-semibold">Admin Notes</p><p className="text-sm text-muted-foreground mt-1">{selectedRequest.adminNotes}</p></div>
              )}
              <div>
                <p className="text-sm font-semibold mb-3">Audit Trail</p>
                <div className="space-y-3">
                  {selectedRequest.auditLog.map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === selectedRequest.auditLog.length - 1 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                        {i < selectedRequest.auditLog.length - 1 && <div className="w-px flex-1 bg-muted-foreground/20" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.by} • {format(new Date(a.time), 'dd MMM, HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {['submitted', 'under_review'].includes(selectedRequest.status) && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 text-rose-600" onClick={() => handleAdminAction(selectedRequest.id, 'rejected')}>Reject</Button>
                  <Button className="flex-1" onClick={() => handleAdminAction(selectedRequest.id, 'approved')}>Approve</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Onboarding Request</DialogTitle><DialogDescription>Fill in business details to begin onboarding</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Company Name</Label><Input placeholder="Company name" /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input placeholder="Full name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@company.com" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+91" /></div>
            </div>
            <div className="space-y-2"><Label>GSTIN / Business ID</Label><Input placeholder="e.g., 27AABCN1234M1Z5" /></div>
            <div className="space-y-2">
              <Label>Marketplace Platforms</Label>
              <div className="flex flex-wrap gap-3">
                {allPlatforms.map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selectedPlatforms.includes(p)} onCheckedChange={c => setSelectedPlatforms(prev => c ? [...prev, p] : prev.filter(x => x !== p))} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload Documents</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload GST Certificate, PAN, Bank Statement</p>
              </div>
            </div>
            <div className="space-y-2"><Label>Additional Notes</Label><Textarea placeholder="Any additional information..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRequest(false)}>Cancel</Button>
            <Button onClick={() => { toast({ title: 'Request Submitted', description: 'Your onboarding request has been submitted for review' }); setShowNewRequest(false); }}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Log Dialog */}
      <Dialog open={!!showChangeLog} onOpenChange={open => !open && setShowChangeLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5" />Change Log — {showChangeLog?.companyName}</DialogTitle>
          </DialogHeader>
          {showChangeLog && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {showChangeLog.changeLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No changes recorded yet</p>
              ) : (
                showChangeLog.changeLog.map((cl, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">{cl.field}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(cl.time), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                    <p><span className="text-rose-600 line-through">{cl.oldValue}</span> → <span className="text-emerald-600 font-medium">{cl.newValue}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Changed by: {cl.by}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Admin Actions */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.action === 'approved' ? 'Approve Application' : 'Reject Application'}
        description={`Are you sure you want to ${confirmAction?.action === 'approved' ? 'approve' : 'reject'} this onboarding request? This action will be logged in the audit trail.`}
        confirmLabel={confirmAction?.action === 'approved' ? 'Approve' : 'Reject'}
        variant={confirmAction?.action === 'rejected' ? 'destructive' : 'default'}
        onConfirm={() => {
          if (confirmAction) handleAdminAction(confirmAction.id, confirmAction.action);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
