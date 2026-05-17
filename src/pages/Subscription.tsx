import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, X, Crown, Zap, Building2, Users, Lock, IndianRupee, AlertTriangle, Calendar, Eye, FileSpreadsheet, FileDown, MessageCircle, Clock, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ElementType;
  features: { name: string; included: boolean }[];
  popular?: boolean;
  current?: boolean;
  moduleAccess: string[];
  aiAccess: boolean;
  analyticsAccess: boolean;
}

const plans: Plan[] = [
  {
    id: 'trial', name: 'Trial', price: '₹0', period: '/30 days',
    description: '30-day free trial with essential features', icon: Clock,
    moduleAccess: ['Dashboard', 'Products', 'Orders'],
    aiAccess: false, analyticsAccess: false,
    features: [
      { name: 'Up to 2 marketplaces', included: true },
      { name: '100 orders/month', included: true },
      { name: 'Basic inventory tracking', included: true },
      { name: 'Email support', included: true },
      { name: 'Auto-expires after 30 days', included: true },
      { name: 'SKU mapping', included: false },
      { name: 'Order reconciliation', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'AI Automation', included: false },
      { name: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'basic', name: 'Basic', price: '₹4,999', period: '/month',
    description: 'Perfect for small vendors getting started', icon: Zap,
    moduleAccess: ['Dashboard', 'Products', 'Orders', 'Inventory'],
    aiAccess: false, analyticsAccess: false,
    features: [
      { name: 'Up to 3 marketplaces', included: true },
      { name: '500 orders/month', included: true },
      { name: 'Basic inventory tracking', included: true },
      { name: 'Email support', included: true },
      { name: 'SKU mapping', included: false },
      { name: 'Order reconciliation', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'API access', included: false },
      { name: 'AI Automation', included: false },
      { name: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: '₹14,999', period: '/month',
    description: 'For growing businesses scaling operations', icon: Crown,
    popular: true, current: true,
    moduleAccess: ['Dashboard', 'Products', 'Orders', 'Inventory', 'Returns', 'Settlements', 'SKU Mapping', 'Analytics'],
    aiAccess: false, analyticsAccess: true,
    features: [
      { name: 'All 6 marketplaces', included: true },
      { name: '5,000 orders/month', included: true },
      { name: 'Full inventory management', included: true },
      { name: 'Priority support', included: true },
      { name: 'SKU mapping', included: true },
      { name: 'Order reconciliation', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'API access', included: false },
      { name: 'AI Automation', included: false },
      { name: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '₹39,999', period: '/month',
    description: 'Full-scale enterprise vendor management', icon: Building2,
    moduleAccess: ['All Modules', 'AI Hub', 'System Settings', 'Custom Integrations'],
    aiAccess: true, analyticsAccess: true,
    features: [
      { name: 'Unlimited marketplaces', included: true },
      { name: 'Unlimited orders', included: true },
      { name: 'Full inventory management', included: true },
      { name: '24/7 dedicated support', included: true },
      { name: 'SKU mapping', included: true },
      { name: 'Order reconciliation', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Full API access', included: true },
      { name: 'AI Automation', included: true },
      { name: 'Custom integrations', included: true },
    ],
  },
];

interface VendorSub {
  vendorId: string;
  name: string;
  plan: string;
  status: 'active' | 'expired' | 'trial';
  enabled: boolean;
  lastPayment: string;
  expiryDate: string;
  daysRemaining: number;
  paymentStatus: 'paid' | 'pending' | 'overdue' | 'na';
  whatsappReminder: boolean;
  email: string;
  phone: string;
  lockedModules: string[];
}

const initialVendorSubs: VendorSub[] = [
  { vendorId: 'VEN-001', name: 'TechGadgets India Pvt Ltd', plan: 'Pro', status: 'active', enabled: true, lastPayment: '2026-02-01', expiryDate: '2026-03-01', daysRemaining: 17, paymentStatus: 'paid', whatsappReminder: true, email: 'admin@techgadgets.in', phone: '+91 98765 43210', lockedModules: [] },
  { vendorId: 'VEN-002', name: 'FashionHub Exports', plan: 'Enterprise', status: 'active', enabled: true, lastPayment: '2026-02-05', expiryDate: '2026-03-05', daysRemaining: 21, paymentStatus: 'paid', whatsappReminder: false, email: 'ops@fashionhub.com', phone: '+91 87654 32109', lockedModules: [] },
  { vendorId: 'VEN-003', name: 'BabyCare Essentials', plan: 'Basic', status: 'expired', enabled: false, lastPayment: '2026-01-15', expiryDate: '2026-02-15', daysRemaining: -3, paymentStatus: 'overdue', whatsappReminder: true, email: 'info@babycare.in', phone: '+91 76543 21098', lockedModules: ['Returns', 'Settlements', 'SKU Mapping', 'Analytics', 'AI Hub'] },
  { vendorId: 'VEN-004', name: 'HomeLiving Store', plan: 'Trial', status: 'trial', enabled: true, lastPayment: '—', expiryDate: '2026-03-10', daysRemaining: 4, paymentStatus: 'na', whatsappReminder: true, email: 'hello@homeliving.in', phone: '+91 65432 10987', lockedModules: ['Returns', 'Settlements', 'SKU Mapping', 'Analytics'] },
  { vendorId: 'VEN-005', name: 'SportsFit Global', plan: 'Basic', status: 'active', enabled: true, lastPayment: '2026-02-08', expiryDate: '2026-03-08', daysRemaining: 24, paymentStatus: 'paid', whatsappReminder: false, email: 'sales@sportsfit.com', phone: '+91 54321 09876', lockedModules: [] },
  { vendorId: 'VEN-006', name: 'GreenLeaf Organics', plan: 'Trial', status: 'trial', enabled: true, lastPayment: '—', expiryDate: '2026-02-16', daysRemaining: 3, paymentStatus: 'na', whatsappReminder: false, email: 'contact@greenleaf.in', phone: '+91 43210 98765', lockedModules: ['Returns', 'Settlements', 'SKU Mapping', 'Analytics'] },
];

export default function Subscription() {
  const { toast } = useToast();
  const [vendorSubs, setVendorSubs] = useState(initialVendorSubs);
  const [detailVendor, setDetailVendor] = useState<VendorSub | null>(null);

  const adminDashboard = useMemo(() => ({
    active: vendorSubs.filter(v => v.status === 'active').length,
    expired: vendorSubs.filter(v => v.status === 'expired').length,
    trial: vendorSubs.filter(v => v.status === 'trial').length,
    expiringWarning: vendorSubs.filter(v => v.daysRemaining > 0 && v.daysRemaining <= 5).length,
    monthlyRevenue: vendorSubs.filter(v => v.status === 'active').reduce((s, v) => {
      const plan = plans.find(p => p.name === v.plan);
      return s + (plan ? parseInt(plan.price.replace(/[₹,]/g, '')) : 0);
    }, 0),
  }), [vendorSubs]);

  const toggleVendor = (vendorId: string) => {
    setVendorSubs(prev => prev.map(v => {
      if (v.vendorId !== vendorId) return v;
      const newEnabled = !v.enabled;
      if (v.status === 'expired' && newEnabled) {
        toast({ title: 'Cannot Enable', description: `${v.name} subscription has expired. Renewal required.`, variant: 'destructive' });
        return v;
      }
      toast({
        title: newEnabled ? 'Vendor Enabled' : 'Vendor Disabled',
        description: `${v.name} has been ${newEnabled ? 'enabled' : 'disabled'}.`,
      });
      return { ...v, enabled: newEnabled };
    }));
  };

  const toggleWhatsapp = (vendorId: string) => {
    setVendorSubs(prev => prev.map(v => {
      if (v.vendorId !== vendorId) return v;
      const next = !v.whatsappReminder;
      toast({ title: next ? 'WhatsApp Reminder On' : 'WhatsApp Reminder Off', description: `${v.name} — reminders ${next ? 'enabled' : 'disabled'}` });
      return { ...v, whatsappReminder: next };
    }));
  };

  const handleExport = (fmt: 'excel' | 'pdf' | 'txt') => {
    toast({ title: `Export ${fmt.toUpperCase()}`, description: `Preparing subscription data export...` });
  };

  const paymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Paid</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>;
      case 'overdue': return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">Overdue</Badge>;
      default: return <Badge variant="secondary" className="text-xs">N/A</Badge>;
    }
  };

  // Vendors about to expire (<=5 days)
  const expiringVendors = vendorSubs.filter(v => v.daysRemaining > 0 && v.daysRemaining <= 5);
  const expiredVendors = vendorSubs.filter(v => v.status === 'expired');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans & Access Control</h1>
          <p className="text-muted-foreground mt-1">Plans control module access, AI availability, and vendor activation status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="w-4 h-4" />Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('pdf')}>
            <FileDown className="w-4 h-4" />PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('txt')}>
            <FileDown className="w-4 h-4" />TXT
          </Button>
        </div>
      </div>

      {/* Expiry Warning Banner */}
      {expiringVendors.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-600">Expiry Warning — {expiringVendors.length} vendor(s) expiring within 5 days</p>
              <div className="mt-1 space-y-1">
                {expiringVendors.map(v => (
                  <p key={v.vendorId} className="text-sm text-muted-foreground">
                    <span className="font-medium">{v.name}</span> ({v.plan}) — {v.daysRemaining} day{v.daysRemaining !== 1 ? 's' : ''} remaining • Expires {format(new Date(v.expiryDate), 'dd MMM yyyy')}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Banner for Expired */}
      {expiredVendors.length > 0 && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-rose-600">{expiredVendors.length} Vendor(s) Expired — Modules Locked</p>
              <p className="text-sm text-muted-foreground">Expired vendors have restricted access. Renew to restore full module access.</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => toast({ title: 'Renewal Reminder Sent', description: `Sent to ${expiredVendors.length} expired vendor(s)` })}>
              Send Renewal Reminder
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="plans">
        <TabsList className="mx-auto w-fit">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Management</TabsTrigger>
          <TabsTrigger value="admin">Admin Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map(plan => {
              const Icon = plan.icon;
              return (
                <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-[1.02]' : ''}`}>
                  {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-primary text-primary-foreground">Most Popular</Badge></div>}
                  {plan.current && <div className="absolute -top-3 right-4"><Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Current</Badge></div>}
                  {plan.id === 'trial' && <div className="absolute -top-3 left-4"><Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/30">Free</Badge></div>}
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto p-3 rounded-xl bg-primary/10 w-fit mb-2"><Icon className="w-6 h-6 text-primary" /></div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-3"><span className="text-3xl font-bold">{plan.price}</span><span className="text-muted-foreground">{plan.period}</span></div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Module Access:</p>
                      <div className="flex flex-wrap gap-1">
                        {plan.moduleAccess.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
                      </div>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <Badge variant={plan.aiAccess ? 'default' : 'secondary'} className={`text-xs ${!plan.aiAccess ? 'opacity-50' : ''}`}>
                        {plan.aiAccess ? '✓' : <Lock className="w-3 h-3 mr-1" />}AI Hub
                      </Badge>
                      <Badge variant={plan.analyticsAccess ? 'default' : 'secondary'} className={`text-xs ${!plan.analyticsAccess ? 'opacity-50' : ''}`}>
                        {plan.analyticsAccess ? '✓' : <Lock className="w-3 h-3 mr-1" />}Analytics
                      </Badge>
                    </div>
                    <div className="space-y-3 mb-6">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          {f.included ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                          <span className={`text-sm ${f.included ? '' : 'text-muted-foreground'}`}>{f.name}</span>
                        </div>
                      ))}
                    </div>
                    {plan.current ? (
                      <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                    ) : plan.id === 'trial' ? (
                      <Button className="w-full" variant="outline" onClick={() => toast({ title: 'Start Trial', description: '30-day trial activated!' })}>
                        Start Free Trial
                      </Button>
                    ) : (
                      <Button className="w-full" variant={plan.popular ? 'default' : 'outline'} onClick={() => toast({ title: 'Upgrade Requested', description: `Request to upgrade to ${plan.name} submitted.` })}>
                        Upgrade to {plan.name}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Vendor Subscription Status</CardTitle>
              <CardDescription>Manage vendor access — expired subscriptions auto-disable access, trial auto-expires after 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Vendor ID</TableHead>
                    <TableHead className="font-semibold">Vendor Name</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Payment</TableHead>
                    <TableHead className="font-semibold">Last Payment</TableHead>
                    <TableHead className="font-semibold">Expiry</TableHead>
                    <TableHead className="font-semibold text-center">Days Left</TableHead>
                    <TableHead className="font-semibold text-center">WhatsApp</TableHead>
                    <TableHead className="font-semibold text-center">Active</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorSubs.map(v => (
                    <TableRow key={v.vendorId} className={!v.enabled ? 'opacity-60' : ''}>
                      <TableCell className="font-mono text-sm">{v.vendorId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{v.name}</p>
                          {v.daysRemaining > 0 && v.daysRemaining <= 5 && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />Expiring soon
                            </p>
                          )}
                          {v.status === 'expired' && (
                            <p className="text-xs text-rose-600 flex items-center gap-1 mt-0.5">
                              <Lock className="w-3 h-3" />Modules locked
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={v.plan === 'Trial' ? 'outline' : 'secondary'} className={v.plan === 'Trial' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : ''}>
                          {v.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          v.status === 'active' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                          v.status === 'trial' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' :
                          'bg-rose-500/15 text-rose-600 border-rose-500/30'
                        }>{v.status}</Badge>
                      </TableCell>
                      <TableCell>{paymentStatusBadge(v.paymentStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.lastPayment === '—' ? '—' : format(new Date(v.lastPayment), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-sm">{format(new Date(v.expiryDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={
                          v.daysRemaining <= 0 ? 'bg-rose-500/10 text-rose-600' :
                          v.daysRemaining <= 5 ? 'bg-amber-500/10 text-amber-600' :
                          'bg-emerald-500/10 text-emerald-600'
                        }>{v.daysRemaining <= 0 ? 'Expired' : `${v.daysRemaining}d`}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={v.whatsappReminder} onCheckedChange={() => toggleWhatsapp(v.vendorId)} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={v.enabled} onCheckedChange={() => toggleVendor(v.vendorId)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDetailVendor(v)}>
                          <Eye className="w-3.5 h-3.5" />Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Feature Lock Message */}
          <Card className="border-amber-500/30 bg-amber-500/5 mt-4">
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-600">Feature Access Control</p>
                <p className="text-sm text-muted-foreground">Vendors on expired or Trial plans will see locked module indicators. Upgrade prompts are shown automatically when accessing restricted features. Trial plans auto-expire after 30 days and vendor access is disabled.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{adminDashboard.active}</p><p className="text-sm text-muted-foreground">Active</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><AlertTriangle className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">{adminDashboard.expired}</p><p className="text-sm text-muted-foreground">Expired</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{adminDashboard.trial}</p><p className="text-sm text-muted-foreground">Trial</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-amber-600">{adminDashboard.expiringWarning}</p><p className="text-sm text-muted-foreground">Expiring ≤5d</p></div></div></CardContent></Card>
              <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><IndianRupee className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold text-primary">₹{adminDashboard.monthlyRevenue.toLocaleString()}</p><p className="text-sm text-muted-foreground">MRR</p></div></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Revenue Breakdown</CardTitle>
                <CardDescription>Monthly recurring revenue by plan tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Trial', 'Basic', 'Pro', 'Enterprise'].map(planName => {
                    const count = vendorSubs.filter(v => v.plan === planName && (v.status === 'active' || v.status === 'trial')).length;
                    const plan = plans.find(p => p.name === planName);
                    const revenue = count * (plan ? parseInt(plan.price.replace(/[₹,]/g, '')) : 0);
                    const pct = adminDashboard.monthlyRevenue > 0 ? Math.round((revenue / adminDashboard.monthlyRevenue) * 100) : 0;
                    return (
                      <div key={planName} className="flex items-center gap-4">
                        <div className="w-24 font-medium text-sm">{planName}</div>
                        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                          <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-20 text-right text-sm font-medium">{revenue > 0 ? `₹${revenue.toLocaleString()}` : '₹0'}</div>
                        <div className="w-16 text-right text-xs text-muted-foreground">{count} vendor{count !== 1 ? 's' : ''}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Details Modal */}
      <Dialog open={!!detailVendor} onOpenChange={(open) => { if (!open) setDetailVendor(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vendor Subscription Details</DialogTitle>
          </DialogHeader>
          {detailVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Vendor</p>
                  <p className="font-semibold">{detailVendor.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{detailVendor.vendorId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan & Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{detailVendor.plan}</Badge>
                    <Badge variant="outline" className={
                      detailVendor.status === 'active' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                      detailVendor.status === 'trial' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' :
                      'bg-rose-500/15 text-rose-600 border-rose-500/30'
                    }>{detailVendor.status}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{detailVendor.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm">{detailVendor.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Status</p>
                  <div className="mt-1">{paymentStatusBadge(detailVendor.paymentStatus)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Payment</p>
                  <p className="text-sm">{detailVendor.lastPayment === '—' ? 'N/A' : format(new Date(detailVendor.lastPayment), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiry</p>
                  <p className="text-sm">{format(new Date(detailVendor.expiryDate), 'dd MMM yyyy')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Days Remaining</p>
                  <Badge variant="secondary" className={
                    detailVendor.daysRemaining <= 0 ? 'bg-rose-500/10 text-rose-600 mt-1' :
                    detailVendor.daysRemaining <= 5 ? 'bg-amber-500/10 text-amber-600 mt-1' :
                    'bg-emerald-500/10 text-emerald-600 mt-1'
                  }>
                    {detailVendor.daysRemaining <= 0 ? 'Expired' : `${detailVendor.daysRemaining} days`}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp Reminders</p>
                  <Badge variant="outline" className={`mt-1 ${detailVendor.whatsappReminder ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : ''}`}>
                    <MessageCircle className="w-3 h-3 mr-1" />{detailVendor.whatsappReminder ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              {detailVendor.lockedModules.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Locked Modules</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailVendor.lockedModules.map(m => (
                      <Badge key={m} variant="secondary" className="gap-1 opacity-60"><Lock className="w-3 h-3" />{m}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {detailVendor.status === 'expired' && (
                <Card className="border-rose-500/30 bg-rose-500/5">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-rose-600">Subscription Expired</p>
                      <p className="text-xs text-muted-foreground">All modules locked. Vendor must renew to regain access.</p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => {
                      toast({ title: 'Renewal Link Sent', description: `Sent to ${detailVendor.email}` });
                    }}>Remind</Button>
                  </CardContent>
                </Card>
              )}

              {detailVendor.status === 'trial' && detailVendor.daysRemaining <= 5 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-600">Trial Expiring Soon</p>
                      <p className="text-xs text-muted-foreground">{detailVendor.daysRemaining} days left. Access will be auto-disabled on expiry.</p>
                    </div>
                    <Button size="sm" onClick={() => {
                      toast({ title: 'Upgrade Link Sent', description: `Sent to ${detailVendor.email}` });
                    }}>Send Upgrade Link</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
