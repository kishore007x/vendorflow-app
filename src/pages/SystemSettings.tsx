import { useState, useEffect, useSyncExternalStore } from 'react';
import DropdownConfigManager from '@/components/expenses/DropdownConfigManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, Settings, Cog, Upload, Download, FileSpreadsheet, Eye, Pencil, ToggleLeft, Blocks, Clock, Zap, Users, Lock, IndianRupee, CheckCircle2, AlertTriangle, SlidersHorizontal, History, LogIn, Edit3 } from 'lucide-react';
import { getReconciliationSettings, setReconciliationSettings, subscribeReconciliationSettings } from '@/services/reconciliationSettings';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// TAB 1 — Field Configuration
interface FieldConfig {
  field: string;
  module: string;
  mandatory: boolean;
  visible: boolean;
  editable: boolean;
}

const initialFields: FieldConfig[] = [
  { field: 'SKU ID', module: 'Inventory / Orders', mandatory: true, visible: true, editable: false },
  { field: 'Master SKU ID', module: 'SKU Mapping', mandatory: true, visible: true, editable: false },
  { field: 'Product Name', module: 'Products', mandatory: true, visible: true, editable: true },
  { field: 'Brand', module: 'Products / Inventory', mandatory: true, visible: true, editable: true },
  { field: 'Category', module: 'Products', mandatory: true, visible: true, editable: true },
  { field: 'Base Price', module: 'Products', mandatory: true, visible: true, editable: true },
  { field: 'Portal', module: 'All Modules', mandatory: true, visible: true, editable: false },
  { field: 'Warehouse', module: 'Inventory', mandatory: true, visible: true, editable: true },
  { field: 'Barcode', module: 'Consolidated Orders', mandatory: false, visible: true, editable: true },
  { field: 'Video URL', module: 'Products', mandatory: false, visible: false, editable: true },
  { field: 'Tracking Number', module: 'Orders / Returns', mandatory: false, visible: true, editable: true },
  { field: 'Description', module: 'Products', mandatory: false, visible: true, editable: true },
  { field: 'Image URL', module: 'Products', mandatory: false, visible: true, editable: true },
  { field: 'Customer Email', module: 'Orders', mandatory: false, visible: true, editable: false },
  { field: 'Batch ID', module: 'Settlements', mandatory: false, visible: true, editable: false },
];

// TAB 2 — Feature Toggles
interface FeatureToggle {
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
}

const initialFeatures: FeatureToggle[] = [
  { name: 'Inventory Import', description: 'Bulk inventory data upload via Excel', enabled: true, icon: Upload },
  { name: 'Excel Upload', description: 'General Excel file uploads across modules', enabled: true, icon: FileSpreadsheet },
  { name: 'Barcode Scanning', description: 'Warehouse barcode scan for order fulfillment', enabled: true, icon: Cog },
  { name: 'AI Assistant', description: 'AI-powered chatbot and recommendations', enabled: true, icon: Zap },
  { name: 'Reconciliation', description: 'Financial order reconciliation engine', enabled: true, icon: Shield },
  { name: 'Batch Settlements', description: 'Grouped batch payment settlements', enabled: true, icon: Blocks },
  { name: 'Vendor Access', description: 'External vendor portal access', enabled: false, icon: Users },
  { name: 'Analytics', description: 'Advanced analytics and reporting', enabled: true, icon: Settings },
];

// TAB 3 — Services
interface ServiceItem {
  name: string;
  status: string;
  lastUpdated: string;
  customLabel?: string;
}

const initialServices: ServiceItem[] = [
  { name: 'API Integration', status: 'coming', lastUpdated: '2025-01-15' },
  { name: 'Data Sync Engine', status: 'planned', lastUpdated: '2025-01-10' },
  { name: 'Automation Engine', status: 'future', lastUpdated: '2025-01-01' },
  { name: 'Webhook Support', status: 'planned', lastUpdated: '2025-01-12' },
  { name: 'Multi-Tenant Architecture', status: 'future', lastUpdated: '2024-12-20' },
  { name: 'Real-time Notifications', status: 'coming', lastUpdated: '2025-01-14' },
  { name: 'Custom Report Builder', status: 'planned', lastUpdated: '2025-01-08' },
];

const defaultServiceStatusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  coming: { label: 'Coming Phase', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  planned: { label: 'Planned', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  future: { label: 'Future Ready', className: 'bg-muted text-muted-foreground' },
};

// TAB 4 — Import/Export
interface ImportExportItem {
  name: string;
  type: 'import' | 'export';
  description: string;
}

const importExportItems: ImportExportItem[] = [
  { name: 'Master Data Import', type: 'import', description: 'Upload master product catalog' },
  { name: 'Bulk Product Upload', type: 'import', description: 'Batch upload product listings' },
  { name: 'Settlement Import', type: 'import', description: 'Import settlement statements' },
  { name: 'Orders Import', type: 'import', description: 'Bulk import order records' },
  { name: 'Inventory Template', type: 'import', description: 'Download & upload inventory data' },
  { name: 'Export Master Data', type: 'export', description: 'Download complete master dataset' },
  { name: 'Export Settlements', type: 'export', description: 'Download settlement records' },
  { name: 'Export Analytics', type: 'export', description: 'Download analytics reports' },
];

export default function SystemSettings() {
  const { toast } = useToast();
  const [fields, setFields] = useState(initialFields);
  const [features, setFeatures] = useState(initialFeatures);
  const [services, setServices] = useState(initialServices);

  // Editable service status
  const [editingService, setEditingService] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // Financial Controls — tolerance threshold
  const reconSettings = useSyncExternalStore(
    subscribeReconciliationSettings,
    getReconciliationSettings,
  );
  const [tolerancePreset, setTolerancePreset] = useState(reconSettings.tolerancePreset);
  const [customTolerance, setCustomTolerance] = useState(String(reconSettings.toleranceValue));

  const toggleField = (index: number, key: 'mandatory' | 'visible' | 'editable') => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: !f[key] } : f));
  };

  const toggleFeature = (index: number) => {
    setFeatures(prev => prev.map((f, i) => i === index ? { ...f, enabled: !f.enabled } : f));
  };

  const handleSaveServiceLabel = (index: number) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, customLabel: editLabel || undefined } : s));
    setEditingService(null);
    toast({ title: 'Status Updated', description: 'Service status label has been updated.' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Centralized admin governance and platform configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-sm bg-primary/5">
            <Lock className="w-3.5 h-3.5" />
            Admin Only
          </Badge>
          <Badge variant="outline" className="gap-1 text-sm">
            <Shield className="w-3.5 h-3.5" />
            Control Center
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="fields" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Field Config</TabsTrigger>
          <TabsTrigger value="dropdowns" className="text-xs sm:text-sm data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Dropdowns</TabsTrigger>
          <TabsTrigger value="features" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Features</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Financial</TabsTrigger>
          <TabsTrigger value="services" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Services</TabsTrigger>
          <TabsTrigger value="import-export" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Import / Export</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Field Configuration</CardTitle>
                  <CardDescription>Data Governance Controls — manage mandatory, visibility, and editability per field</CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1"><Eye className="w-3 h-3" />{fields.filter(f => f.visible).length} Visible</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Field Name</TableHead>
                    <TableHead className="font-semibold">Module</TableHead>
                    <TableHead className="font-semibold text-center">Mandatory</TableHead>
                    <TableHead className="font-semibold text-center">Visible</TableHead>
                    <TableHead className="font-semibold text-center">Editable</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, idx) => (
                    <TableRow key={field.field}>
                      <TableCell className="font-medium">{field.field}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{field.module}</TableCell>
                      <TableCell className="text-center"><Switch checked={field.mandatory} onCheckedChange={() => toggleField(idx, 'mandatory')} /></TableCell>
                      <TableCell className="text-center"><Switch checked={field.visible} onCheckedChange={() => toggleField(idx, 'visible')} /></TableCell>
                      <TableCell className="text-center"><Switch checked={field.editable} onCheckedChange={() => toggleField(idx, 'editable')} /></TableCell>
                      <TableCell className="text-center">
                        {field.mandatory ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Required</Badge>
                        ) : (
                          <Badge variant="secondary">Optional</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB — DROPDOWN CONFIG */}
        <TabsContent value="dropdowns">
          <DropdownConfigManager />
        </TabsContent>

        {/* TAB 2 — FEATURE ENABLE / DISABLE */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ToggleLeft className="w-5 h-5" />Feature Management</CardTitle>
              <CardDescription>Controls module visibility across roles. Enable or disable system capabilities.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.name} className={`transition-all ${feature.enabled ? 'border-primary/30 bg-primary/5' : 'opacity-70'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`w-5 h-5 ${feature.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <Switch checked={feature.enabled} onCheckedChange={() => toggleFeature(idx)} />
                        </div>
                        <h4 className="font-semibold text-sm">{feature.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                        <Badge variant={feature.enabled ? 'default' : 'secondary'} className="mt-3 text-xs">
                          {feature.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB — FINANCIAL CONTROLS */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" />Financial Controls</CardTitle>
                  <CardDescription>Configure reconciliation tolerance thresholds and matching rules</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1 bg-primary/5">
                  <IndianRupee className="w-3 h-3" />Reconciliation Engine
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-5 rounded-lg border bg-card">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Mismatch Tolerance Threshold
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  If the difference between expected and settled amounts is within this threshold, the record will be auto-marked as <span className="font-semibold text-emerald-600">Matched</span>. Differences above the threshold are flagged as <span className="font-semibold text-rose-600">Mismatch</span>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {[
                    { value: '1' as const, label: '₹1', desc: 'Strict — only ignore ₹1 or less' },
                    { value: '5' as const, label: '₹5', desc: 'Standard — ignore ₹5 or less' },
                    { value: 'custom' as const, label: 'Custom', desc: 'Set your own threshold value' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTolerancePreset(opt.value);
                        if (opt.value !== 'custom') setCustomTolerance(opt.value);
                      }}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        tolerancePreset === opt.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-lg">{opt.label}</span>
                        {tolerancePreset === opt.value && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {tolerancePreset === 'custom' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                    <span className="text-sm font-medium">Custom Value:</span>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min={0}
                        value={customTolerance}
                        onChange={e => setCustomTolerance(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    const value = tolerancePreset === 'custom' ? parseFloat(customTolerance) || 0 : parseFloat(tolerancePreset);
                    setReconciliationSettings({ tolerancePreset, toleranceValue: value });
                    toast({ title: 'Tolerance Updated', description: `Reconciliation mismatch tolerance set to ₹${value}` });
                  }}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Tolerance Setting
                </Button>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="text-sm font-semibold mb-3">How Tolerance Works</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                      <CheckCircle2 className="w-3 h-3" />Matched
                    </Badge>
                    <span className="text-muted-foreground">Difference ≤ ₹{tolerancePreset === 'custom' ? customTolerance || '0' : tolerancePreset}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
                      <AlertTriangle className="w-3 h-3" />Minor Diff
                    </Badge>
                    <span className="text-muted-foreground">Difference {">"} ₹{tolerancePreset === 'custom' ? customTolerance || '0' : tolerancePreset} and ≤ ₹500</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1">
                      <AlertTriangle className="w-3 h-3" />Mismatch
                    </Badge>
                    <span className="text-muted-foreground">Difference {">"} ₹500</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Current Active Tolerance:</span>
                  <Badge className="text-sm">₹{reconSettings.toleranceValue}</Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({reconSettings.tolerancePreset === 'custom' ? 'Custom' : `Preset ₹${reconSettings.tolerancePreset}`})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3 — SERVICES MANAGEMENT */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Blocks className="w-5 h-5" />Services Management</CardTitle>
                  <CardDescription>Platform service roadmap and integration status</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1 bg-blue-500/5 text-blue-600 border-blue-500/30">
                  <Zap className="w-3 h-3" />Integration Ready Architecture
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Service Name</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Last Updated</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc, idx) => {
                    const cfg = defaultServiceStatusConfig[svc.status] || defaultServiceStatusConfig.future;
                    const displayLabel = svc.customLabel || cfg.label;
                    return (
                      <TableRow key={svc.name}>
                        <TableCell className="font-medium">{svc.name}</TableCell>
                        <TableCell>
                          {editingService === idx ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                className="h-8 w-40 text-sm"
                                placeholder="Custom label..."
                              />
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleSaveServiceLabel(idx)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingService(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className={cfg.className}>{displayLabel}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(svc.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setEditingService(idx); setEditLabel(svc.customLabel || cfg.label); }}>
                            <Pencil className="w-3 h-3" /> Edit Label
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4 — GLOBAL IMPORT / EXPORT CONTROLS */}
        <TabsContent value="import-export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Global Import / Export Controls</CardTitle>
              <CardDescription>Admin-only data management — import templates, upload files, and export master data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Upload className="w-4 h-4" />Import Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {importExportItems.filter(i => i.type === 'import').map((item) => (
                    <Card key={item.name} className="border-dashed">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">{item.description}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs gap-1"><Download className="w-3 h-3" />Template</Button>
                          <Button variant="outline" size="sm" className="text-xs gap-1"><Upload className="w-3 h-3" />Upload</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Download className="w-4 h-4" />Export Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {importExportItems.filter(i => i.type === 'export').map((item) => (
                    <Card key={item.name}>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">{item.description}</p>
                        <Button variant="outline" size="sm" className="text-xs gap-1"><Download className="w-3 h-3" />Export</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB — ACTIVITY LOG */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />System Activity Log</CardTitle>
              <CardDescription>Audit trail of all system actions — logins, edits, approvals, and configuration changes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Timestamp</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Module</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: 'SYS-001', action: 'login', user: 'Sarah Johnson', module: 'Auth', description: 'Admin logged in', timestamp: new Date(Date.now() - 0.5 * 3600000).toISOString(), icon: LogIn, color: 'bg-blue-500/10 text-blue-600' },
                    { id: 'SYS-002', action: 'financial_edit', user: 'Sarah Johnson', module: 'Finance', description: 'Invoice INV-2026-001 created — ₹53,100', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), icon: Edit3, color: 'bg-rose-500/10 text-rose-600' },
                    { id: 'SYS-003', action: 'approval', user: 'Admin', module: 'Onboarding', description: 'BrightWave Electronics application approved', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600' },
                    { id: 'SYS-004', action: 'status_change', user: 'Admin', module: 'Returns', description: 'Return RET-2024-001 advanced to Claim Raised', timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600' },
                    { id: 'SYS-005', action: 'permission_change', user: 'Sarah Johnson', module: 'Permissions', description: 'Analytics access enabled for Vendor User role', timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), icon: Shield, color: 'bg-purple-500/10 text-purple-600' },
                    { id: 'SYS-006', action: 'financial_edit', user: 'Admin', module: 'Settings', description: 'Reconciliation tolerance updated to ₹5', timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), icon: Edit3, color: 'bg-rose-500/10 text-rose-600' },
                    { id: 'SYS-007', action: 'status_change', user: 'Admin', module: 'Subscription', description: 'EverGreen Foods subscription changed from Trial to Fully Paid', timestamp: new Date(Date.now() - 72 * 3600000).toISOString(), icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600' },
                    { id: 'SYS-008', action: 'login', user: 'Michael Chen', module: 'Auth', description: 'Vendor logged in from mobile', timestamp: new Date(Date.now() - 96 * 3600000).toISOString(), icon: LogIn, color: 'bg-blue-500/10 text-blue-600' },
                  ].map(log => {
                    const Icon = log.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(log.timestamp), 'dd MMM yyyy HH:mm')}</TableCell>
                        <TableCell><Badge variant="secondary" className={`gap-1 ${log.color}`}><Icon className="w-3 h-3" />{log.action.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="font-medium text-sm">{log.user}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.module}</TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">{log.description}</TableCell>
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
