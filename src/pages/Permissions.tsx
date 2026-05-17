import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Plus, UserCheck, History, LogIn, Edit3, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PermissionRow {
  feature: string;
  category: string;
  superAdmin: boolean;
  financeManager: boolean;
  operationsManager: boolean;
  vendorUser: boolean;
  analyst: boolean;
}

interface AuditLogEntry {
  id: string;
  action: 'login' | 'status_change' | 'financial_edit' | 'approval' | 'permission_change';
  user: string;
  role: string;
  description: string;
  timestamp: string;
  module?: string;
}

const initialPermissions: PermissionRow[] = [
  { feature: 'Dashboard Overview', category: 'Overview', superAdmin: true, financeManager: true, operationsManager: true, vendorUser: true, analyst: true },
  { feature: 'Product Catalog', category: 'Catalog', superAdmin: true, financeManager: false, operationsManager: false, vendorUser: true, analyst: false },
  { feature: 'Product Health', category: 'Catalog', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: true, analyst: true },
  { feature: 'SKU Mapping', category: 'Catalog', superAdmin: true, financeManager: false, operationsManager: false, vendorUser: true, analyst: false },
  { feature: 'Inventory Management', category: 'Inventory', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: true, analyst: false },
  { feature: 'Orders', category: 'Inventory', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: true, analyst: true },
  { feature: 'Consolidated Orders', category: 'Inventory', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: false, analyst: true },
  { feature: 'Returns & Claims', category: 'Inventory', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: false, analyst: false },
  { feature: 'Settlements', category: 'Finance', superAdmin: true, financeManager: true, operationsManager: false, vendorUser: true, analyst: true },
  { feature: 'Reconciliation', category: 'Finance', superAdmin: true, financeManager: true, operationsManager: true, vendorUser: false, analyst: true },
  { feature: 'Price & Payout', category: 'Finance', superAdmin: true, financeManager: true, operationsManager: false, vendorUser: true, analyst: true },
  { feature: 'Landing Cost Analysis', category: 'Finance', superAdmin: true, financeManager: true, operationsManager: false, vendorUser: false, analyst: true },
  { feature: 'Vendor Management', category: 'Vendors', superAdmin: true, financeManager: false, operationsManager: false, vendorUser: false, analyst: false },
  { feature: 'Warehouse & Storage', category: 'Vendors', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: false, analyst: false },
  { feature: 'Data Import', category: 'Operations', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: false, analyst: false },
  { feature: 'Task Manager', category: 'Operations', superAdmin: true, financeManager: false, operationsManager: true, vendorUser: false, analyst: false },
  { feature: 'Analytics', category: 'Operations', superAdmin: true, financeManager: true, operationsManager: false, vendorUser: true, analyst: true },
  { feature: 'Social Insights', category: 'Marketing', superAdmin: true, financeManager: false, operationsManager: false, vendorUser: true, analyst: false },
  { feature: 'Reports & History', category: 'Reports', superAdmin: true, financeManager: true, operationsManager: true, vendorUser: true, analyst: true },
  { feature: 'Support Center', category: 'System', superAdmin: true, financeManager: true, operationsManager: true, vendorUser: true, analyst: true },
  { feature: 'Subscription', category: 'System', superAdmin: true, financeManager: false, operationsManager: false, vendorUser: false, analyst: false },
  { feature: 'System Settings', category: 'Admin', superAdmin: true, financeManager: false, operationsManager: false, vendorUser: false, analyst: false },
  { feature: 'AI Hub', category: 'System', superAdmin: true, financeManager: false, operationsManager: false, vendorUser: false, analyst: false },
];

const roles = [
  { key: 'superAdmin' as const, label: 'Super Admin', desc: 'Full system access', color: 'bg-primary/10 text-primary' },
  { key: 'financeManager' as const, label: 'Finance Manager', desc: 'Financial oversight', color: 'bg-emerald-500/10 text-emerald-600' },
  { key: 'operationsManager' as const, label: 'Operations Mgr', desc: 'Operations control', color: 'bg-blue-500/10 text-blue-600' },
  { key: 'vendorUser' as const, label: 'Vendor User', desc: 'Vendor portal access', color: 'bg-amber-500/10 text-amber-600' },
  { key: 'analyst' as const, label: 'Analyst', desc: 'Read-only analytics', color: 'bg-purple-500/10 text-purple-600' },
];

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const initialAuditLog: AuditLogEntry[] = [
  { id: 'AL-001', action: 'login', user: 'Sarah Johnson', role: 'Super Admin', description: 'Logged in from 192.168.1.1', timestamp: daysAgo(0), module: 'Auth' },
  { id: 'AL-002', action: 'permission_change', user: 'Sarah Johnson', role: 'Super Admin', description: 'Enabled Analytics access for Vendor User', timestamp: daysAgo(0), module: 'Permissions' },
  { id: 'AL-003', action: 'financial_edit', user: 'Emily Davis', role: 'Operations', description: 'Updated settlement batch SET-AMZ-2024-02', timestamp: daysAgo(1), module: 'Settlements' },
  { id: 'AL-004', action: 'approval', user: 'Sarah Johnson', role: 'Super Admin', description: 'Approved return claim RET-2024-002', timestamp: daysAgo(1), module: 'Returns' },
  { id: 'AL-005', action: 'status_change', user: 'Emily Davis', role: 'Operations', description: 'Changed order ORD-2024-003 status to Shipped', timestamp: daysAgo(2), module: 'Orders' },
  { id: 'AL-006', action: 'login', user: 'Michael Chen', role: 'Vendor', description: 'Logged in from mobile', timestamp: daysAgo(2), module: 'Auth' },
  { id: 'AL-007', action: 'financial_edit', user: 'Sarah Johnson', role: 'Super Admin', description: 'Adjusted stock for SKU-AMZ-006', timestamp: daysAgo(3), module: 'Inventory' },
  { id: 'AL-008', action: 'approval', user: 'Sarah Johnson', role: 'Super Admin', description: 'Approved vendor VEN-003 activation', timestamp: daysAgo(4), module: 'Vendors' },
];

const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  login: { label: 'Login', color: 'bg-blue-500/10 text-blue-600', icon: LogIn },
  status_change: { label: 'Status Change', color: 'bg-amber-500/10 text-amber-600', icon: Edit3 },
  financial_edit: { label: 'Financial Edit', color: 'bg-rose-500/10 text-rose-600', icon: AlertTriangle },
  approval: { label: 'Approval', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
  permission_change: { label: 'Permission Change', color: 'bg-purple-500/10 text-purple-600', icon: Shield },
};

export default function Permissions() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState(initialPermissions);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const categories = [...new Set(permissions.map(p => p.category))];

  const togglePermission = (idx: number, role: typeof roles[number]['key']) => {
    if (role === 'superAdmin') return;
    setPermissions(prev => prev.map((p, i) => i === idx ? { ...p, [role]: !p[role] } : p));
    const perm = permissions[idx];
    const roleName = roles.find(r => r.key === role)?.label || role;
    const newVal = !perm[role];
    setAuditLog(prev => [{
      id: `AL-${Date.now()}`,
      action: 'permission_change',
      user: 'Admin',
      role: 'Super Admin',
      description: `${newVal ? 'Enabled' : 'Disabled'} "${perm.feature}" for ${roleName}`,
      timestamp: new Date().toISOString(),
      module: 'Permissions',
    }, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Permissions & Role-Based Access</h1>
          <p className="text-muted-foreground">Configure module access per role with full audit trail</p>
        </div>
        <Button className="gap-2" onClick={() => toast({ title: 'Add Role', description: 'Role creation form would open here.' })}>
          <Plus className="w-4 h-4" />Add Role
        </Button>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {roles.map(r => (
          <Card key={r.key}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${r.color}`}><Shield className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-bold">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {permissions.filter(p => p[r.key]).length}/{permissions.length} features
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="audit">Audit Log ({auditLog.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" />Permission Matrix</CardTitle>
                  <CardDescription>Toggle features per role. Super Admin always has full access.</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1"><Shield className="w-3 h-3" />Security-Driven</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Feature</TableHead>
                      {roles.map(r => <TableHead key={r.key} className="text-center font-semibold text-xs">{r.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map(cat =>
                      permissions.filter(p => p.category === cat).map((perm, idx, arr) => {
                        const globalIdx = permissions.indexOf(perm);
                        return (
                          <TableRow key={perm.feature}>
                            {idx === 0 && (
                              <TableCell rowSpan={arr.length} className="font-medium align-top border-r">
                                <Badge variant="secondary">{cat}</Badge>
                              </TableCell>
                            )}
                            <TableCell className="font-medium">{perm.feature}</TableCell>
                            {roles.map(r => (
                              <TableCell key={r.key} className="text-center">
                                <Switch checked={perm[r.key]} onCheckedChange={() => togglePermission(globalIdx, r.key)} disabled={r.key === 'superAdmin'} />
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Audit Log</CardTitle>
              <CardDescription>Complete trail of login, status changes, financial edits, and approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Timestamp</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Module</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map(log => {
                    const cfg = actionConfig[log.action];
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(log.timestamp), 'dd MMM yyyy HH:mm')}</TableCell>
                        <TableCell><Badge variant="secondary" className={`gap-1 ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</Badge></TableCell>
                        <TableCell className="font-medium text-sm">{log.user}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{log.role}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.module}</TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{log.description}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
