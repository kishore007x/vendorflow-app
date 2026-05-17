import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Upload, Clock, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnboardingEntry {
  id: string;
  company: string;
  platforms: string[];
  gst: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  auditLog: { action: string; by: string; at: string }[];
}

const mockEntries: OnboardingEntry[] = [
  {
    id: 'ONB-001', company: 'TechMart India Pvt Ltd', platforms: ['Flipkart', 'Amazon'],
    gst: '29ABCDE1234F1Z5', status: 'approved', submittedAt: '2025-10-15',
    auditLog: [
      { action: 'Submitted', by: 'Vendor', at: '2025-10-15 09:30' },
      { action: 'Under Review', by: 'Admin', at: '2025-10-16 11:00' },
      { action: 'Approved', by: 'Admin', at: '2025-10-18 14:20' },
    ],
  },
  {
    id: 'ONB-002', company: 'StyleHub Commerce', platforms: ['Meesho', 'Flipkart'],
    gst: '07FGHIJ5678K2L3', status: 'under_review', submittedAt: '2025-11-02',
    auditLog: [
      { action: 'Submitted', by: 'Vendor', at: '2025-11-02 10:15' },
      { action: 'Under Review', by: 'Admin', at: '2025-11-03 09:00' },
    ],
  },
  {
    id: 'ONB-003', company: 'QuickShip Logistics', platforms: ['Amazon'],
    gst: '33MNOPQ9012R3S4', status: 'rejected', submittedAt: '2025-11-10',
    auditLog: [
      { action: 'Submitted', by: 'Vendor', at: '2025-11-10 16:45' },
      { action: 'Rejected - Invalid GST', by: 'Admin', at: '2025-11-12 10:30' },
    ],
  },
  {
    id: 'ONB-004', company: 'HomeDecor Express', platforms: ['Flipkart', 'Amazon', 'Meesho'],
    gst: '27TUVWX3456Y7Z8', status: 'submitted', submittedAt: '2025-12-01',
    auditLog: [
      { action: 'Submitted', by: 'Vendor', at: '2025-12-01 08:00' },
    ],
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-rose-500/20 text-rose-400', icon: XCircle },
};

const platforms = ['Flipkart', 'Amazon', 'Meesho'];

export default function DemoOnboarding() {
  const [entries, setEntries] = useState(mockEntries);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [gst, setGst] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!companyName || !gst || selectedPlatforms.length === 0) {
      toast({ title: 'Missing Fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    const newEntry: OnboardingEntry = {
      id: `ONB-${String(entries.length + 1).padStart(3, '0')}`,
      company: companyName, platforms: selectedPlatforms, gst,
      status: 'submitted', submittedAt: new Date().toISOString().split('T')[0],
      auditLog: [{ action: 'Submitted', by: 'Vendor', at: new Date().toLocaleString() }],
    };
    setEntries([newEntry, ...entries]);
    setCompanyName(''); setGst(''); setSelectedPlatforms([]);
    toast({ title: 'Application Submitted', description: 'Your onboarding request is under review.' });
  };

  const updateStatus = (id: string, status: OnboardingEntry['status']) => {
    setEntries((prev) => prev.map((e) =>
      e.id === id ? {
        ...e, status,
        auditLog: [...e.auditLog, { action: statusConfig[status].label, by: 'Admin', at: new Date().toLocaleString() }]
      } : e
    ));
    toast({ title: 'Status Updated', description: `${id} marked as ${statusConfig[status].label}.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Business Onboarding</h1>
        <p className="text-sm text-gray-400">Submit and manage marketplace onboarding applications</p>
      </div>

      <Tabs defaultValue="form" className="w-full">
        <TabsList className="bg-[#111833] border border-white/10">
          <TabsTrigger value="form" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">New Application</TabsTrigger>
          <TabsTrigger value="admin" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">Admin Panel</TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">Audit Log</TabsTrigger>
        </TabsList>

        {/* New Application */}
        <TabsContent value="form">
          <Card className="bg-[#111833] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Business Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Company Name *</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter company name" className="bg-white/[0.03] border-white/10 text-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">GST / Business ID *</Label>
                  <Input value={gst} onChange={(e) => setGst(e.target.value)} placeholder="e.g. 29ABCDE1234F1Z5" className="bg-white/[0.03] border-white/10 text-gray-200 font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Marketplace Platforms *</Label>
                <div className="flex gap-4">
                  {platforms.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <Checkbox
                        checked={selectedPlatforms.includes(p)}
                        onCheckedChange={(checked) =>
                          setSelectedPlatforms(checked ? [...selectedPlatforms, p] : selectedPlatforms.filter((x) => x !== p))
                        }
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Documents Upload</Label>
                <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-white/20 transition-colors">
                  <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Drag & drop or click to upload GST certificate, PAN, etc.</p>
                </div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit}>Submit Application</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Panel */}
        <TabsContent value="admin">
          <Card className="bg-[#111833] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-200">Applications ({entries.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {entries.map((e) => {
                const sc = statusConfig[e.status];
                return (
                  <div key={e.id} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-white/5"><Building2 className="w-4 h-4 text-gray-400" /></div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{e.company}</p>
                        <p className="text-xs text-gray-500">{e.id} • GST: {e.gst} • {e.platforms.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                      {(e.status === 'submitted' || e.status === 'under_review') && (
                        <div className="flex gap-1 ml-2">
                          {e.status === 'submitted' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, 'under_review')} className="h-7 text-xs border-white/10 text-gray-400">Review</Button>
                          )}
                          <Button size="sm" onClick={() => updateStatus(e.id, 'approved')} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(e.id, 'rejected')} className="h-7 text-xs">Reject</Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <Card className="bg-[#111833] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-200">Audit History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {entries.map((e) => (
                <div key={e.id} className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">{e.company} ({e.id})</p>
                  <div className="ml-4 border-l-2 border-white/10 pl-4 space-y-2">
                    {e.auditLog.map((log, i) => (
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
