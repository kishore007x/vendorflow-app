import { useState, useMemo, useEffect } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { Portal, ReturnReason } from '@/types';
import { PortalFilter } from '@/components/dashboard/PortalFilter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, RotateCcw, CheckCircle, XCircle, Clock, AlertTriangle, IndianRupee,
  ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Package, Truck, Ban,
  FileSpreadsheet, FileDown, ShieldCheck, Warehouse, Link2,
  MessageSquare, PackageX, PackageMinus, Eye,
} from 'lucide-react';
import { DateFilter, ExportButton, useRowSelection, SelectAllCheckbox, RowCheckbox } from '@/components/TableEnhancements';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { GlobalDateFilter, type DateRange } from '@/components/GlobalDateFilter';
import { useAuth } from '@/contexts/AuthContext';
import { returnsDb } from '@/services/database';

// Return types
type ReturnType = 'customer_return' | 'courier_return' | 'rto' | 'before_pickup_cancel' | 'pending_return' | 'upcoming_return' | 'damaged_product' | 'missing_product' | 'partial_received';

const returnTypeConfig: Record<ReturnType, { label: string; color: string; icon: React.ElementType }> = {
  customer_return: { label: 'Customer Return', color: 'bg-rose-500/10 text-rose-600', icon: RotateCcw },
  courier_return: { label: 'Courier Return', color: 'bg-amber-500/10 text-amber-600', icon: Truck },
  rto: { label: 'RTO', color: 'bg-orange-500/10 text-orange-600', icon: Ban },
  before_pickup_cancel: { label: 'Before Pickup Cancel', color: 'bg-muted text-muted-foreground', icon: XCircle },
  pending_return: { label: 'Pending Return', color: 'bg-purple-500/10 text-purple-600', icon: Clock },
  upcoming_return: { label: 'Upcoming Return', color: 'bg-blue-500/10 text-blue-600', icon: Package },
  damaged_product: { label: 'Damaged Product', color: 'bg-destructive/10 text-destructive', icon: PackageX },
  missing_product: { label: 'Missing Product', color: 'bg-purple-500/10 text-purple-600', icon: Package },
  partial_received: { label: 'Partial Received', color: 'bg-info/10 text-info', icon: PackageMinus },
};

type LifecycleStage = 'return_initiated' | 'pickup_completed' | 'warehouse_received' | 'physical_verification' | 'claim_raised' | 'claim_approved' | 'claim_rejected' | 'refund_approved' | 'settlement_adjusted';

const stageConfig: Record<LifecycleStage, { label: string; color: string; icon: React.ElementType }> = {
  return_initiated: { label: 'Return Initiated', color: 'bg-amber-500/10 text-amber-600', icon: RotateCcw },
  pickup_completed: { label: 'Pickup Completed', color: 'bg-blue-500/10 text-blue-600', icon: Truck },
  warehouse_received: { label: 'Warehouse Received', color: 'bg-teal-500/10 text-teal-600', icon: Warehouse },
  physical_verification: { label: 'Physical Verification', color: 'bg-indigo-500/10 text-indigo-600', icon: ShieldCheck },
  claim_raised: { label: 'Claim Raised', color: 'bg-purple-500/10 text-purple-600', icon: AlertTriangle },
  claim_approved: { label: 'Claim Approved', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  claim_rejected: { label: 'Claim Rejected', color: 'bg-rose-500/10 text-rose-600', icon: XCircle },
  refund_approved: { label: 'Refund Approved', color: 'bg-green-500/10 text-green-600', icon: IndianRupee },
  settlement_adjusted: { label: 'Settlement Adjusted', color: 'bg-primary/10 text-primary', icon: Link2 },
};

type ClaimEligibility = 'eligible' | 'ineligible' | 'pending_review';
interface ClaimEligibilityInfo {
  status: ClaimEligibility;
  withinWindow: boolean;
  conditionEligible: boolean;
  categoryRestricted: boolean;
  reason?: string;
}

interface ReturnLifecycle {
  returnId: string;
  orderId: string;
  portal: Portal;
  productName: string;
  skuId: string;
  reason: ReturnReason;
  returnType: ReturnType;
  refundAmount: number;
  currentStage: LifecycleStage;
  responsibleUser: string;
  warehouseReceived: boolean;
  physicalVerification: 'pending' | 'passed' | 'failed';
  refundApproved: boolean;
  claimEligibility: ClaimEligibilityInfo;
  linkedSettlementId?: string;
  returnDate: string;
  customerReturnNote?: string;
  timeline: { stage: LifecycleStage; timestamp: string; note?: string; user: string }[];
}

const reasonLabels: Record<ReturnReason, string> = {
  damaged: 'Damaged Product', wrong_item: 'Wrong Item', not_as_described: 'Not as Described',
  size_issue: 'Size/Fit Issue', quality_issue: 'Quality Issue', changed_mind: 'Changed Mind',
};

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const mockLifecycleData: ReturnLifecycle[] = [];

const getReturnType = (reason?: string | null): ReturnType => {
  const value = (reason || '').toLowerCase();
  if (value.includes('rto')) return 'rto';
  if (value.includes('courier')) return 'courier_return';
  if (value.includes('damage') || value.includes('defect')) return 'damaged_product';
  if (value.includes('missing') || value.includes('partial')) return 'missing_product';
  return 'customer_return';
};

const getReturnReason = (reason?: string | null): ReturnReason => {
  const value = (reason || '').toLowerCase();
  if (value.includes('size') || value.includes('fit')) return 'size_issue';
  if (value.includes('wrong')) return 'wrong_item';
  if (value.includes('quality') || value.includes('fabric')) return 'quality_issue';
  if (value.includes('changed') || value.includes('mind')) return 'changed_mind';
  if (value.includes('damage') || value.includes('defect')) return 'damaged';
  return 'not_as_described';
};

const mapStageFromStatus = (status?: string | null): LifecycleStage => {
  const value = (status || '').toLowerCase();
  if (value.includes('settlement')) return 'settlement_adjusted';
  if (value.includes('refund')) return 'refund_approved';
  if (value.includes('approved')) return 'claim_approved';
  if (value.includes('rejected') || value.includes('cancel')) return 'claim_rejected';
  if (value.includes('raised')) return 'claim_raised';
  if (value.includes('verified')) return 'physical_verification';
  if (value.includes('received')) return 'warehouse_received';
  if (value.includes('pickup')) return 'pickup_completed';
  return 'return_initiated';
};

const mapAppReturn = (row: any): ReturnLifecycle => {
  const quantity = Number(row.quantity ?? 1);
  const stage = mapStageFromStatus(row.status);
  const portal = (row.portal || 'firstcry') as Portal;
  const returnId = row.return_number || row.id;
  const returnDate = row.requested_at || row.created_at || new Date().toISOString();
  const productName = row.metadata?.product_name || row.product_name || 'Firstcry return';
  const skuId = row.metadata?.vendor_style_code || row.product_id || returnId;
  const returnType = getReturnType(row.reason || row.metadata?.subreason || row.metadata?.subtype_reason);

  return {
    returnId: String(returnId || ''),
    orderId: String(row.order_id || row.metadata?.poid || returnId || ''),
    portal,
    productName,
    skuId,
    reason: getReturnReason(row.reason || row.metadata?.subreason || row.metadata?.subtype_reason),
    returnType,
    refundAmount: Number(row.refund_amount ?? row.amount ?? 0),
    currentStage: stage,
    responsibleUser: 'System',
    warehouseReceived: ['warehouse_received', 'physical_verification', 'claim_raised', 'claim_approved', 'claim_rejected', 'refund_approved', 'settlement_adjusted'].includes(stage),
    physicalVerification: stage === 'physical_verification' || stage === 'claim_raised' || stage === 'claim_approved' || stage === 'refund_approved' || stage === 'settlement_adjusted' ? 'passed' : 'pending',
    refundApproved: ['refund_approved', 'settlement_adjusted'].includes(stage),
    claimEligibility: {
      status: 'pending_review',
      withinWindow: true,
      conditionEligible: true,
      categoryRestricted: false,
    },
    linkedSettlementId: stage === 'settlement_adjusted' && row.linked_settlement_id ? row.linked_settlement_id : (stage === 'settlement_adjusted' ? `STL-${returnId}` : undefined),
    returnDate,
    customerReturnNote: row.reason || row.metadata?.subreason || row.metadata?.subtype_reason || undefined,
    timeline: [{ stage, timestamp: returnDate, user: 'System', note: row.reason || row.metadata?.subreason || undefined }],
  };
};

type SortField = 'date' | 'refund' | 'status' | null;
type SortDir = 'asc' | 'desc';
const stageOrder: LifecycleStage[] = ['return_initiated', 'pickup_completed', 'warehouse_received', 'physical_verification', 'claim_raised', 'claim_approved', 'claim_rejected', 'refund_approved', 'settlement_adjusted'];
const claimStages: LifecycleStage[] = ['claim_raised', 'claim_approved', 'claim_rejected', 'refund_approved'];
const settlementStages: LifecycleStage[] = ['refund_approved', 'settlement_adjusted'];

export default function Returns() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<Portal | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [returnTypeFilter, setReturnTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [selectedReturn, setSelectedReturn] = useState<ReturnLifecycle | null>(null);
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [lifecycleData, setLifecycleData] = useState(mockLifecycleData);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confirmAdvance, setConfirmAdvance] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('returns');

  useEffect(() => {
    if (authLoading || !user?.id) return;

    let mounted = true;
    (async () => {
      try {
        const rows = await returnsDb.getAll();
        if (mounted) setLifecycleData((Array.isArray(rows) ? rows : []).map(mapAppReturn));
      } catch (error) {
        console.error('Failed to load returns', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const portalFiltered = useMemo(() => {
    if (selectedPortal === 'all') return lifecycleData;
    return lifecycleData.filter(r => r.portal === selectedPortal);
  }, [lifecycleData, selectedPortal]);

  const sortData = (data: ReturnLifecycle[]) => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime();
      if (sortField === 'refund') cmp = a.refundAmount - b.refundAmount;
      if (sortField === 'status') cmp = stageOrder.indexOf(a.currentStage) - stageOrder.indexOf(b.currentStage);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  };

  const searchFilter = (r: ReturnLifecycle) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.returnId?.toString().toLowerCase() || '').includes(q) || 
           (r.orderId?.toString().toLowerCase() || '').includes(q) || 
           (r.productName?.toString().toLowerCase() || '').includes(q);
  };

  // Tab 1: Returns
  const filteredReturns = useMemo(() => {
    const data = portalFiltered.filter(r => {
      if (!searchFilter(r)) return false;
      if (stageFilter !== 'all' && r.currentStage !== stageFilter) return false;
      if (returnTypeFilter !== 'all' && r.returnType !== returnTypeFilter) return false;
      return true;
    });
    return sortData(data);
  }, [portalFiltered, stageFilter, returnTypeFilter, searchQuery, sortField, sortDir]);

  // Tab 2: Claims Eligible
  const filteredClaims = useMemo(() => {
    const data = portalFiltered.filter(r => {
      if (!searchFilter(r)) return false;
      return claimStages.includes(r.currentStage) || r.claimEligibility?.status !== 'ineligible';
    });
    return sortData(data);
  }, [portalFiltered, searchQuery, sortField, sortDir]);

  // Tab 3: Settlements
  const filteredSettlements = useMemo(() => {
    const data = portalFiltered.filter(r => {
      if (!searchFilter(r)) return false;
      return settlementStages.includes(r.currentStage) || !!r.linkedSettlementId;
    });
    return sortData(data);
  }, [portalFiltered, searchQuery, sortField, sortDir]);

  const currentFiltered = activeTab === 'returns' ? filteredReturns : activeTab === 'claims' ? filteredClaims : filteredSettlements;
  const rowSelection = useRowSelection(currentFiltered.map(r => r.returnId));

  // KPIs
  const summary = useMemo(() => ({
    total: portalFiltered.length,
    pending: portalFiltered.filter(r => ['return_initiated', 'pickup_completed'].includes(r.currentStage)).length,
    warehouseReceived: portalFiltered.filter(r => r.warehouseReceived).length,
    warehousePending: portalFiltered.filter(r => !r.warehouseReceived).length,
    claimsPending: portalFiltered.filter(r => r.currentStage === 'claim_raised').length,
    claimsApproved: portalFiltered.filter(r => ['claim_approved', 'refund_approved', 'settlement_adjusted'].includes(r.currentStage)).length,
    claimsRejected: portalFiltered.filter(r => r.currentStage === 'claim_rejected').length,
    financialImpact: portalFiltered.filter(r => r.currentStage !== 'claim_rejected').reduce((s, r) => s + r.refundAmount, 0),
    linkedSettlements: portalFiltered.filter(r => r.linkedSettlementId).length,
    settledAmount: portalFiltered.filter(r => r.currentStage === 'settlement_adjusted').reduce((s, r) => s + r.refundAmount, 0),
    customerReturn: portalFiltered.filter(r => r.returnType === 'customer_return').length,
    courierReturn: portalFiltered.filter(r => r.returnType === 'courier_return').length,
    rto: portalFiltered.filter(r => r.returnType === 'rto').length,
    beforePickup: portalFiltered.filter(r => r.returnType === 'before_pickup_cancel').length,
    pendingReturn: portalFiltered.filter(r => r.returnType === 'pending_return').length,
    upcomingReturn: portalFiltered.filter(r => r.returnType === 'upcoming_return').length,
  }), [portalFiltered]);

  const advanceStage = (returnId: string) => {
    const advanceOrder: LifecycleStage[] = ['return_initiated', 'pickup_completed', 'warehouse_received', 'physical_verification', 'claim_raised', 'claim_approved', 'refund_approved', 'settlement_adjusted'];
    setLifecycleData(prev => prev.map(r => {
      if (r.returnId !== returnId) return r;
      const currentIdx = advanceOrder.indexOf(r.currentStage);
      if (currentIdx < 0 || currentIdx >= advanceOrder.length - 1) return r;
      const nextStage = advanceOrder[currentIdx + 1];
      const updated = { ...r, currentStage: nextStage, timeline: [...r.timeline, { stage: nextStage, timestamp: new Date().toISOString(), user: 'Admin' }] };
      if (nextStage === 'warehouse_received') updated.warehouseReceived = true;
      if (nextStage === 'physical_verification') updated.physicalVerification = 'passed' as const;
      if (nextStage === 'refund_approved') updated.refundApproved = true;
      if (nextStage === 'settlement_adjusted') updated.linkedSettlementId = `STL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      return updated;
    }));
    toast({ title: 'Stage Advanced', description: `Return ${returnId} moved to next stage` });
  };

  const handleExport = (type: 'excel' | 'pdf' | 'txt') => {
    toast({ title: `${type.toUpperCase()} Export`, description: `${currentFiltered.length} items exported` });
  };

  const getEligibilityBadge = (info: ClaimEligibilityInfo) => {
    if (info.status === 'eligible') return <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 text-xs"><CheckCircle className="w-3 h-3" />Eligible</Badge>;
    if (info.status === 'ineligible') return <Badge variant="secondary" className="gap-1 bg-rose-500/10 text-rose-600 text-xs"><XCircle className="w-3 h-3" />Ineligible</Badge>;
    return <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
  };

  // Generic table renderer
  const renderTable = (data: ReturnLifecycle[], columns: { returnType?: boolean; whRecon?: boolean; claim?: boolean; settlement?: boolean }) => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10"><SelectAllCheckbox checked={rowSelection.isAllSelected} onCheckedChange={rowSelection.toggleAll} /></TableHead>
                <TableHead className="font-semibold">Return ID</TableHead>
                <TableHead className="font-semibold">Order ID</TableHead>
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">Portal</TableHead>
                {columns.returnType && <TableHead className="font-semibold">Return Type</TableHead>}
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="flex items-center">Date<SortIcon field="date" /></span>
                </TableHead>
                <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('refund')}>
                  <span className="flex items-center justify-end">Refund ₹<SortIcon field="refund" /></span>
                </TableHead>
                {columns.whRecon && <TableHead className="font-semibold">WH Recon</TableHead>}
                {columns.claim && <TableHead className="font-semibold">Claim</TableHead>}
                {columns.settlement && <TableHead className="font-semibold">Settlement</TableHead>}
                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <span className="flex items-center">Stage<SortIcon field="status" /></span>
                </TableHead>
                <TableHead className="font-semibold">Note</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(r => {
                const stage = stageConfig[r.currentStage] || { label: 'Unknown Stage', color: 'bg-muted', icon: Clock };
                const StageIcon = stage.icon;
                const portal = getChannels().find(p => p.id === r.portal);
                const rtConfig = returnTypeConfig[r.returnType] || returnTypeConfig['customer_return'];
                const RTIcon = rtConfig.icon;
                return (
                  <TableRow key={r.returnId} className={`hover:bg-muted/30 ${rowSelection.isSelected(r.returnId) ? 'bg-primary/5' : ''}`}>
                    <TableCell><RowCheckbox checked={rowSelection.isSelected(r.returnId)} onCheckedChange={() => rowSelection.toggle(r.returnId)} /></TableCell>
                    <TableCell className="font-medium">{r.returnId}</TableCell>
                    <TableCell className="text-accent font-medium">{r.orderId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{r.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.skuId}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="gap-1"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</Badge></TableCell>
                    {columns.returnType && (
                      <TableCell>
                        <Badge variant="secondary" className={`gap-1 text-xs ${rtConfig.color}`}>
                          <RTIcon className="w-3 h-3" />{rtConfig.label}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(r.returnDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right font-medium">₹{r.refundAmount.toLocaleString()}</TableCell>
                    {columns.whRecon && (
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="secondary" className={`text-[10px] gap-0.5 ${r.warehouseReceived ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                            {r.warehouseReceived ? <CheckCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                            {r.warehouseReceived ? 'Received' : 'Pending'}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] gap-0.5 ${
                            r.physicalVerification === 'passed' ? 'bg-emerald-500/10 text-emerald-600' :
                            r.physicalVerification === 'failed' ? 'bg-rose-500/10 text-rose-600' : 'bg-muted text-muted-foreground'
                          }`}>
                            {r.physicalVerification === 'passed' ? <ShieldCheck className="w-2.5 h-2.5" /> :
                             r.physicalVerification === 'failed' ? <XCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                            QC: {r.physicalVerification.charAt(0).toUpperCase() + r.physicalVerification.slice(1)}
                          </Badge>
                        </div>
                      </TableCell>
                    )}
                    {columns.claim && <TableCell>{getEligibilityBadge(r.claimEligibility)}</TableCell>}
                    {columns.settlement && (
                      <TableCell>
                        {r.linkedSettlementId ? (
                          <Badge variant="outline" className="text-xs gap-0.5"><Link2 className="w-2.5 h-2.5" />{r.linkedSettlementId}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground"><Clock className="w-2.5 h-2.5" />Pending</Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary" className={`gap-1 text-xs ${stage.color}`}>
                        <StageIcon className="w-3 h-3" />{stage.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.customerReturnNote ? (
                        <div className="max-w-[150px]" title={r.customerReturnNote}>
                          <p className="text-xs text-muted-foreground truncate">{r.customerReturnNote}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedReturn(r)}>Details</Button>
                        {r.currentStage !== 'settlement_adjusted' && r.currentStage !== 'claim_rejected' && (
                          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setConfirmAdvance(r.returnId)}>
                            <ChevronRight className="w-3 h-3" />Advance
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 && (
          <div className="text-center py-12"><RotateCcw className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No items found</p></div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Returns & Claims Management</h1>
          <p className="text-muted-foreground">Full lifecycle tracking with warehouse reconciliation & claim eligibility</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="w-4 h-4" />Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('pdf')}>
            <FileDown className="w-4 h-4" />PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('txt')}>
            <FileDown className="w-4 h-4" />TXT
          </Button>
          <GlobalDateFilter value={globalDateRange} onChange={setGlobalDateRange} />
          <ExportButton selectedCount={rowSelection.count} data={filteredReturns} filename="returns" />
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card><CardContent className="p-3"><div className="flex flex-col items-center text-center gap-1"><RotateCcw className="w-5 h-5 text-primary" /><p className="text-xl font-bold">{summary.total}</p><p className="text-[11px] text-muted-foreground leading-tight">Total Returns</p></div></CardContent></Card>
        <Card className="border-warning/30"><CardContent className="p-3"><div className="flex flex-col items-center text-center gap-1"><Clock className="w-5 h-5 text-warning" /><p className="text-xl font-bold text-warning">{summary.pending}</p><p className="text-[11px] text-muted-foreground leading-tight">Pending Pickup</p></div></CardContent></Card>
        <Card className="border-success/30"><CardContent className="p-3"><div className="flex flex-col items-center text-center gap-1"><Warehouse className="w-5 h-5 text-success" /><p className="text-xl font-bold text-success">{summary.warehouseReceived}</p><p className="text-[11px] text-muted-foreground leading-tight">WH Received</p></div></CardContent></Card>
        <Card className="border-amber-500/30"><CardContent className="p-3"><div className="flex flex-col items-center text-center gap-1"><Warehouse className="w-5 h-5 text-amber-600" /><p className="text-xl font-bold text-amber-600">{summary.warehousePending}</p><p className="text-[11px] text-muted-foreground leading-tight">WH Pending</p></div></CardContent></Card>
        <Card className="border-purple-500/30"><CardContent className="p-3"><div className="flex flex-col items-center text-center gap-1"><AlertTriangle className="w-5 h-5 text-purple-600" /><p className="text-xl font-bold text-purple-600">{summary.claimsPending}</p><p className="text-[11px] text-muted-foreground leading-tight">Claims Pending</p></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex flex-col items-center text-center gap-1"><IndianRupee className="w-5 h-5 text-info" /><p className="text-xl font-bold">₹{(summary.financialImpact / 1000).toFixed(1)}K</p><p className="text-[11px] text-muted-foreground leading-tight">Financial Impact</p></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex flex-col items-center text-center gap-1"><Link2 className="w-5 h-5 text-primary" /><p className="text-xl font-bold">{summary.linkedSettlements}</p><p className="text-[11px] text-muted-foreground leading-tight">Settled</p></div></CardContent></Card>
      </div>

      {/* Portal Filter + Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <PortalFilter selectedPortal={selectedPortal} onPortalChange={setSelectedPortal} />
            <div className="flex flex-1 flex-wrap gap-3">
              <DateFilter value={dateFilter} onChange={setDateFilter} />
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search Return ID, Order ID, or Product..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Separate Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger value="returns" className="gap-1.5 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-600">
            <RotateCcw className="w-4 h-4" />Returns
            <Badge variant="secondary" className="text-xs ml-1">{filteredReturns.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600">
            <ShieldCheck className="w-4 h-4" />Claims Eligible
            <Badge variant="secondary" className="text-xs ml-1">{filteredClaims.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="settlements" className="gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600">
            <IndianRupee className="w-4 h-4" />Settlements
            <Badge variant="secondary" className="text-xs ml-1">{filteredSettlements.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ========== TAB 1: RETURNS ========== */}
        <TabsContent value="returns" className="space-y-4 mt-4">
          {/* Return Type Filter Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {([
              { type: 'customer_return' as ReturnType, count: summary.customerReturn, label: 'Customer Return', icon: RotateCcw, color: 'text-rose-600' },
              { type: 'courier_return' as ReturnType, count: summary.courierReturn, label: 'Courier Return', icon: Truck, color: 'text-amber-600' },
              { type: 'rto' as ReturnType, count: summary.rto, label: 'RTO', icon: Ban, color: 'text-orange-600' },
              { type: 'before_pickup_cancel' as ReturnType, count: summary.beforePickup, label: 'Before Pickup Cancel', icon: XCircle, color: 'text-muted-foreground' },
              { type: 'pending_return' as ReturnType, count: summary.pendingReturn, label: 'Pending Return', icon: Clock, color: 'text-purple-600' },
              { type: 'upcoming_return' as ReturnType, count: summary.upcomingReturn, label: 'Upcoming Return', icon: Package, color: 'text-blue-600' },
            ]).map(item => (
              <Card
                key={item.type}
                className={`cursor-pointer transition-all hover:shadow-md ${returnTypeFilter === item.type ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => setReturnTypeFilter(returnTypeFilter === item.type ? 'all' : item.type)}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col items-center text-center gap-1">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <p className="text-lg font-bold">{item.count}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={returnTypeFilter} onValueChange={setReturnTypeFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Return Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Return Types</SelectItem>
                {Object.entries(returnTypeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Lifecycle Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(stageConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {renderTable(filteredReturns, { returnType: true, whRecon: true, claim: true })}
        </TabsContent>

        {/* ========== TAB 2: CLAIMS ELIGIBLE ========== */}
        <TabsContent value="claims" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-purple-500/30">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                  <p className="text-xl font-bold text-purple-600">{portalFiltered.filter(r => r.currentStage === 'claim_raised').length}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Claims Raised</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-success/30">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <p className="text-xl font-bold text-success">{portalFiltered.filter(r => r.currentStage === 'claim_approved' || r.currentStage === 'refund_approved').length}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Approved</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/30">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <p className="text-xl font-bold text-destructive">{summary.claimsRejected}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Rejected</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <p className="text-xl font-bold text-amber-600">{portalFiltered.filter(r => r.claimEligibility.status === 'pending_review').length}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Pending Review</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {renderTable(filteredClaims, { claim: true, whRecon: true })}
        </TabsContent>

        {/* ========== TAB 3: SETTLEMENTS ========== */}
        <TabsContent value="settlements" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-primary/30">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <Link2 className="w-5 h-5 text-primary" />
                  <p className="text-xl font-bold">{summary.linkedSettlements}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Linked Settlements</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-success/30">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <IndianRupee className="w-5 h-5 text-success" />
                  <p className="text-xl font-bold text-success">₹{(summary.settledAmount / 1000).toFixed(1)}K</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Settled Amount</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-warning/30">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <Clock className="w-5 h-5 text-warning" />
                  <p className="text-xl font-bold text-warning">{portalFiltered.filter(r => r.currentStage === 'refund_approved' && !r.linkedSettlementId).length}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Pending Settlement</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <CheckCircle className="w-5 h-5 text-info" />
                  <p className="text-xl font-bold">{portalFiltered.filter(r => r.refundApproved).length}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Refunds Approved</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {renderTable(filteredSettlements, { settlement: true })}
        </TabsContent>
      </Tabs>

      {/* Return Detail Dialog */}
      <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Return Details — {selectedReturn?.returnId}
              {selectedReturn && (
                <Badge variant="secondary" className={`gap-1 text-xs ${returnTypeConfig[selectedReturn.returnType].color}`}>
                  {returnTypeConfig[selectedReturn.returnType].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Order:</span> <span className="font-medium">{selectedReturn.orderId}</span></div>
                <div><span className="text-muted-foreground">Portal:</span> <span className="font-medium">{getChannels().find(p => p.id === selectedReturn.portal)?.name}</span></div>
                <div><span className="text-muted-foreground">Product:</span> <span className="font-medium">{selectedReturn.productName}</span></div>
                <div><span className="text-muted-foreground">Reason:</span> <span className="font-medium">{reasonLabels[selectedReturn.reason] || 'Other'}</span></div>
                <div><span className="text-muted-foreground">Refund:</span> <span className="font-bold">₹{selectedReturn.refundAmount.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Responsible:</span> <Badge variant="secondary" className="text-xs ml-1">{selectedReturn.responsibleUser}</Badge></div>
              </div>

              {selectedReturn.customerReturnNote && (
                <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-600" />Customer Return Note
                  </h4>
                  <p className="text-sm text-muted-foreground italic">"{selectedReturn.customerReturnNote}"</p>
                </div>
              )}

              {/* Warehouse Reconciliation */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Warehouse className="w-4 h-4" />Warehouse Reconciliation</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Received at WH</p>
                    <Badge variant="secondary" className={`mt-1 text-xs gap-1 ${selectedReturn.warehouseReceived ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {selectedReturn.warehouseReceived ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {selectedReturn.warehouseReceived ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Physical Verification</p>
                    <Badge variant="secondary" className={`mt-1 text-xs gap-1 ${
                      selectedReturn.physicalVerification === 'passed' ? 'bg-emerald-500/10 text-emerald-600' :
                      selectedReturn.physicalVerification === 'failed' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {selectedReturn.physicalVerification === 'passed' ? <ShieldCheck className="w-3 h-3" /> :
                       selectedReturn.physicalVerification === 'failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {selectedReturn.physicalVerification.charAt(0).toUpperCase() + selectedReturn.physicalVerification.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Refund Approved</p>
                    <Badge variant="secondary" className={`mt-1 text-xs gap-1 ${selectedReturn.refundApproved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {selectedReturn.refundApproved ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {selectedReturn.refundApproved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Claim Eligibility */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />Claim Eligibility</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    {selectedReturn.claimEligibility.withinWindow
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span className={selectedReturn.claimEligibility.withinWindow ? 'text-emerald-600' : 'text-rose-600'}>
                      {selectedReturn.claimEligibility.withinWindow ? 'Within Window' : 'Outside Window'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedReturn.claimEligibility.conditionEligible
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span className={selectedReturn.claimEligibility.conditionEligible ? 'text-emerald-600' : 'text-rose-600'}>
                      {selectedReturn.claimEligibility.conditionEligible ? 'Condition OK' : 'Condition Fail'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!selectedReturn.claimEligibility.categoryRestricted
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                    <span className={!selectedReturn.claimEligibility.categoryRestricted ? 'text-emerald-600' : 'text-amber-600'}>
                      {selectedReturn.claimEligibility.categoryRestricted ? 'Category Restricted' : 'Category OK'}
                    </span>
                  </div>
                </div>
                {selectedReturn.claimEligibility.reason && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{selectedReturn.claimEligibility.reason}</p>
                )}
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Verdict:</span>
                  {getEligibilityBadge(selectedReturn.claimEligibility)}
                </div>
              </div>

              {selectedReturn.linkedSettlementId && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-sm">Linked to Settlement:</span>
                  <Badge variant="outline" className="font-mono">{selectedReturn.linkedSettlementId}</Badge>
                  <span className="text-xs text-muted-foreground">• Refund ₹{selectedReturn.refundAmount.toLocaleString()} adjusted</span>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">Lifecycle Timeline</h4>
                <div className="space-y-3">
                  {selectedReturn.timeline.map((entry, idx) => {
                    const cfg = stageConfig[entry.stage];
                    const Icon = cfg.icon;
                    const isLast = idx === selectedReturn.timeline.length - 1;
                    return (
                      <div key={idx} className={`flex gap-3 ${isLast ? '' : 'pb-3 border-b border-dashed'}`}>
                        <div className={`p-1.5 rounded-lg shrink-0 ${cfg.color}`}><Icon className="w-4 h-4" /></div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{cfg.label}</p>
                          {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm')}</span>
                            <Badge variant="secondary" className="text-xs">{entry.user}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAdvance}
        onOpenChange={(open) => !open && setConfirmAdvance(null)}
        title="Advance Return Stage"
        description={`Are you sure you want to advance return ${confirmAdvance} to the next lifecycle stage? This action cannot be undone.`}
        confirmLabel="Advance Stage"
        onConfirm={() => {
          if (confirmAdvance) advanceStage(confirmAdvance);
          setConfirmAdvance(null);
        }}
      />
    </div>
  );
}
