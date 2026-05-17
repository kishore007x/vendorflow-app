import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileUp, ShieldCheck, Lock, ClipboardCheck, AlertTriangle, Upload, FileText,
  CheckCircle2, XCircle, Clock, Eye, Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NDAFile {
  id: string;
  name: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'active' | 'expired' | 'pending_review';
  expiryDate: string;
}

const mockNDAs: NDAFile[] = [];

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium';
}

const initialChecklist: ChecklistItem[] = [
  { id: 'SR-01', category: 'Data Security', title: 'End-to-end encryption for sensitive data', description: 'All PII, financial data, and credentials must be encrypted in transit and at rest.', completed: true, priority: 'critical' },
  { id: 'SR-02', category: 'Data Security', title: 'Database access restricted to authorized services', description: 'No direct DB access from client-side. All queries routed through authenticated API layers.', completed: true, priority: 'critical' },
  { id: 'SR-03', category: 'Authentication', title: 'Multi-factor authentication enabled for admin users', description: 'MFA required for all admin and operations roles accessing sensitive modules.', completed: false, priority: 'critical' },
  { id: 'SR-04', category: 'Authentication', title: 'Session timeout configured (30 min idle)', description: 'Auto-logout after 30 minutes of inactivity to prevent unauthorized access.', completed: true, priority: 'high' },
  { id: 'SR-05', category: 'API Security', title: 'API rate limiting enabled', description: 'Rate limits configured for all public-facing and internal API endpoints.', completed: false, priority: 'high' },
  { id: 'SR-06', category: 'API Security', title: 'API keys rotated quarterly', description: 'All third-party API keys and secrets must be rotated every 90 days.', completed: false, priority: 'high' },
  { id: 'SR-07', category: 'Compliance', title: 'GDPR/Data Protection compliance audit', description: 'Annual audit of data handling practices against GDPR and local data protection regulations.', completed: true, priority: 'medium' },
  { id: 'SR-08', category: 'Compliance', title: 'Vendor data processing agreements signed', description: 'All vendors handling customer data must have signed DPAs on file.', completed: false, priority: 'high' },
  { id: 'SR-09', category: 'Infrastructure', title: 'Backup & disaster recovery plan tested', description: 'Monthly backup verification and quarterly DR drill completed.', completed: true, priority: 'critical' },
  { id: 'SR-10', category: 'Infrastructure', title: 'Vulnerability scan within last 30 days', description: 'Automated vulnerability scanning running on all production infrastructure.', completed: false, priority: 'high' },
];

export default function LegalCompliance() {
  const { toast } = useToast();
  const [checklist, setChecklist] = useState(initialChecklist);

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const completedCount = checklist.filter(i => i.completed).length;
  const criticalPending = checklist.filter(i => !i.completed && i.priority === 'critical');

  const handleUploadNDA = () => {
    toast({ title: 'Upload NDA', description: 'NDA upload dialog opened. Select your file to proceed.' });
  };

  const handleExport = (format: 'excel' | 'pdf' | 'txt' = 'excel') => {
    toast({ title: `${format.toUpperCase()} Report Exported`, description: 'Compliance report exported successfully.' });
  };

  const statusBadge = (status: NDAFile['status']) => {
    if (status === 'active') return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Active</Badge>;
    if (status === 'expired') return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-xs"><XCircle className="w-3 h-3" />Expired</Badge>;
    return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-xs"><Clock className="w-3 h-3" />Pending Review</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Legal & Compliance</h1>
          <p className="text-muted-foreground">NDA management, IP protection, security assessments & audit readiness</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4" />Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4" />PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleExport('txt')}>
            <FileText className="w-4 h-4" />TXT
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div>
              <div><p className="text-xl font-bold">{mockNDAs.length}</p><p className="text-xs text-muted-foreground">NDAs on File</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="text-xl font-bold">{completedCount}/{checklist.length}</p><p className="text-xs text-muted-foreground">Security Checks Passed</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
              <div><p className="text-xl font-bold text-destructive">{criticalPending.length}</p><p className="text-xs text-muted-foreground">Critical Pending</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-xl font-bold text-amber-600">{mockNDAs.filter(n => n.status === 'expired').length}</p><p className="text-xs text-muted-foreground">Expired NDAs</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="nda">
        <TabsList>
          <TabsTrigger value="nda">NDA Management</TabsTrigger>
          <TabsTrigger value="ip">IP & Source Code</TabsTrigger>
          <TabsTrigger value="security">Security Assessment</TabsTrigger>
          <TabsTrigger value="audit">Post-Completion Audit</TabsTrigger>
        </TabsList>

        {/* NDA Upload Section */}
        <TabsContent value="nda" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">NDA Upload & Tracking</CardTitle>
                  <CardDescription>Upload, manage, and track Non-Disclosure Agreements</CardDescription>
                </div>
                <Button className="gap-2" onClick={handleUploadNDA}><Upload className="w-4 h-4" />Upload NDA</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockNDAs.map(nda => (
                <div key={nda.id} className={`flex items-center justify-between p-4 rounded-lg border ${nda.status === 'expired' ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted"><FileUp className="w-5 h-5 text-muted-foreground" /></div>
                    <div>
                      <p className="font-medium text-sm">{nda.name}</p>
                      <p className="text-xs text-muted-foreground">Uploaded by {nda.uploadedBy} on {nda.uploadedAt} · Expires {nda.expiryDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(nda.status)}
                    <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IP Ownership & Source Code Protection */}
        <TabsContent value="ip" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Lock className="w-5 h-5 text-primary" />IP Ownership Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <p className="text-sm leading-relaxed">
                  All intellectual property, including but not limited to source code, algorithms, data models, UI/UX designs,
                  branding assets, and documentation developed as part of the <strong>VendorFlow VMS Platform</strong> are the
                  exclusive property of the commissioning organization. No contractor, vendor, or third-party partner may claim
                  ownership, redistribute, or reverse-engineer any portion of this system without express written consent.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This statement is binding under the terms of the Master Service Agreement (MSA) and any applicable NDA signed
                  by all parties involved in the development and maintenance of the platform.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Legally Binding</Badge>
                  <Badge variant="outline" className="text-xs">Last Reviewed: 2026-02-01</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" />Source Code Protection Notice</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <Lock className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">Confidential & Proprietary</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground">
                  This source code is classified as confidential. Unauthorized access, copying, modification, or distribution
                  is strictly prohibited. All access is logged and auditable.
                </AlertDescription>
              </Alert>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Repository Access Control', desc: 'Only authorized team members with signed NDAs have repository access.', done: true },
                  { label: 'Code Obfuscation (Production)', desc: 'Production builds use minification and obfuscation to protect logic.', done: true },
                  { label: 'Dependency Audit', desc: 'All third-party dependencies audited for licensing compliance.', done: false },
                  { label: 'Code Signing & Integrity Checks', desc: 'Deployment artifacts are signed to prevent tampering.', done: true },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border">
                    {item.done ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Risk Assessment */}
        <TabsContent value="security" className="space-y-4">
          {criticalPending.length > 0 && (
            <Alert className="border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive">Critical Items Pending</AlertTitle>
              <AlertDescription className="text-sm">{criticalPending.length} critical security check(s) require immediate attention: {criticalPending.map(i => i.title).join(', ')}.</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="w-5 h-5" />Security Risk Assessment Checklist</CardTitle>
                  <CardDescription>{completedCount} of {checklist.length} checks completed ({Math.round((completedCount / checklist.length) * 100)}%)</CardDescription>
                </div>
                <Badge variant="outline" className={`text-xs ${completedCount === checklist.length ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                  {completedCount === checklist.length ? 'All Clear' : 'In Progress'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['Data Security', 'Authentication', 'API Security', 'Compliance', 'Infrastructure'].map(category => {
                  const items = checklist.filter(i => i.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category}>
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 mt-4">{category}</p>
                      {items.map(item => (
                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border mb-1.5 ${!item.completed && item.priority === 'critical' ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                          <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklist(item.id)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
                              <Badge variant="outline" className={`text-[10px] ${item.priority === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/30' : item.priority === 'high' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/30'}`}>
                                {item.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post-Completion Audit Placeholder */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Post-Completion Audit</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                This section will be activated upon project completion. A comprehensive audit covering code quality,
                security compliance, data integrity, and deliverable verification will be conducted here.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {['Code Review', 'Security Scan', 'Data Integrity Check', 'Performance Audit', 'Compliance Verification', 'Deliverable Sign-off'].map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                <Clock className="w-3 h-3" />Placeholder — Pending Project Completion
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
