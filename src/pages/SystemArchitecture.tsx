import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, ShoppingCart, BoxIcon, RotateCcw, CreditCard, Scale, Users, Warehouse, Upload, BarChart3, 
  CheckCircle, Plug, AlertTriangle, Shield, TrendingDown, Truck, Globe, Smartphone, Server,
  Database, Lock, Cloud, Layers, Key, FileText, UserCheck, Eye
} from 'lucide-react';

const modules = [
  { name: 'Inventory', icon: BoxIcon, desc: 'Stock tracking across portals & warehouses', ready: true, apiReady: true },
  { name: 'Orders', icon: ShoppingCart, desc: 'Multi-portal order lifecycle management', ready: true, apiReady: true },
  { name: 'Returns & Claims', icon: RotateCcw, desc: 'Return processing & claim eligibility', ready: true, apiReady: true },
  { name: 'Settlements', icon: CreditCard, desc: 'Batch & individual payment tracking', ready: true, apiReady: true },
  { name: 'Reconciliation', icon: Scale, desc: 'Expected vs processed order matching', ready: true, apiReady: true },
  { name: 'Vendors', icon: Users, desc: 'Vendor onboarding & performance', ready: true, apiReady: false },
  { name: 'Warehouses', icon: Warehouse, desc: 'Storage & logistics management', ready: true, apiReady: false },
  { name: 'Data Import', icon: Upload, desc: 'Excel import & barcode scanning', ready: true, apiReady: true },
  { name: 'Products', icon: Package, desc: 'Catalog & SKU management', ready: true, apiReady: true },
  { name: 'Analytics', icon: BarChart3, desc: 'BI dashboards & reports', ready: true, apiReady: false },
];

const reconciliationModules = [
  { name: 'Settlement Mismatch Detection', desc: 'Flag discrepancies between expected and actual settlement amounts', icon: AlertTriangle, severity: 'critical', alertCount: 3 },
  { name: 'Commission Discrepancy Tracking', desc: 'Track portal-wise commission deviations from agreed rates', icon: TrendingDown, severity: 'warning', alertCount: 5 },
  { name: 'Refund Reconciliation', desc: 'Match refund claims with actual credits received from portals', icon: RotateCcw, severity: 'warning', alertCount: 2 },
  { name: 'Penalty Tracking', desc: 'Monitor SLA penalties, late shipment fees, and cancellation charges', icon: Shield, severity: 'info', alertCount: 8 },
  { name: 'Logistics Cost Audit', desc: 'Validate shipping charges against carrier rate cards', icon: Truck, severity: 'warning', alertCount: 4 },
  { name: 'Margin Leakage Alerts', desc: 'Detect products selling below profitable threshold after all deductions', icon: TrendingDown, severity: 'critical', alertCount: 6 },
];

const severityConfig: Record<string, { className: string }> = {
  critical: { className: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
  warning: { className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  info: { className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
};

const integrations = [
  { name: 'Amazon Seller API', icon: '🛒', status: 'Connected' },
  { name: 'Flipkart API', icon: '🛍️', status: 'Connected' },
  { name: 'Meesho API', icon: '📦', status: 'Connected' },
  { name: 'Payment Gateway', icon: '💳', status: 'Active' },
  { name: 'WhatsApp Business API', icon: '💬', status: 'Active' },
  { name: 'Meta Pixel', icon: '📊', status: 'Tracking' },
  { name: 'Google Merchant Center', icon: '🔍', status: 'Synced' },
  { name: 'Social Media APIs', icon: '📱', status: 'Connected' },
];

const securityFeatures = [
  { name: 'JWT-based Authentication', desc: 'Stateless token-based auth with refresh rotation', icon: Key, color: 'bg-emerald-500/10 text-emerald-600' },
  { name: 'Role-based Permission Engine', desc: 'Admin, Vendor, Operations — granular module-level access', icon: UserCheck, color: 'bg-blue-500/10 text-blue-600' },
  { name: 'Audit Logs', desc: 'Complete trail of all user actions with timestamps', icon: FileText, color: 'bg-violet-500/10 text-violet-600' },
  { name: 'Encrypted API Communication', desc: 'TLS 1.3 encrypted data transfer on all endpoints', icon: Lock, color: 'bg-amber-500/10 text-amber-600' },
];

export default function SystemArchitecture() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Architecture</h1>
          <p className="text-muted-foreground">Modular platform overview — all modules are reusable and API-ready</p>
        </div>
        <Badge variant="outline" className="gap-1 text-sm bg-primary/5 border-primary/20 text-primary">
          <Plug className="w-3.5 h-3.5" />
          Enterprise SaaS Architecture
        </Badge>
      </div>

      {/* ── Architecture Diagram ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" />Platform Architecture Diagram</CardTitle>
          <CardDescription>End-to-end system flow from client to database with integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-0">
            {/* User Layer */}
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 w-full max-w-md text-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
              <Smartphone className="w-6 h-6 text-primary" />
              <div>
                <p className="font-semibold">User (Web / Mobile)</p>
                <p className="text-xs text-muted-foreground">Browser & Mobile Responsive PWA</p>
              </div>
            </div>
            <div className="w-0.5 h-8 bg-border" />

            {/* Frontend */}
            <div className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 w-full max-w-md text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Layers className="w-5 h-5 text-blue-600" />
                <p className="font-semibold">Frontend (React UI)</p>
              </div>
              <p className="text-xs text-muted-foreground">Vite + React + TypeScript + Tailwind CSS</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">SPA</Badge>
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">Component Library</Badge>
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">Design System</Badge>
              </div>
            </div>
            <div className="w-0.5 h-8 bg-border" />

            {/* API Layer */}
            <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 w-full max-w-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Server className="w-5 h-5 text-emerald-600" />
                <p className="font-semibold">API Layer (RESTful Services)</p>
              </div>
              <p className="text-xs text-muted-foreground">Authentication, Business Logic, Data Validation</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><Lock className="w-3 h-3" />TLS 1.3</Badge>
                <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><Key className="w-3 h-3" />JWT Auth</Badge>
              </div>
            </div>

            {/* Split: DB + Integrations */}
            <div className="flex w-full max-w-2xl gap-6 mt-6">
              {/* Database */}
              <div className="flex-1">
                <div className="w-0.5 h-8 bg-border mx-auto" />
                <div className="p-4 rounded-xl border-2 border-violet-500/30 bg-violet-500/5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Database className="w-5 h-5 text-violet-600" />
                    <p className="font-semibold">Database</p>
                  </div>
                  <p className="text-xs text-muted-foreground">PostgreSQL with RLS Policies</p>
                  <div className="flex justify-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 border-violet-500/30">Orders</Badge>
                    <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 border-violet-500/30">Products</Badge>
                    <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 border-violet-500/30">Settlements</Badge>
                    <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 border-violet-500/30">Users</Badge>
                  </div>
                </div>
              </div>

              {/* Side Integrations */}
              <div className="flex-1">
                <div className="w-0.5 h-8 bg-border mx-auto" />
                <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5">
                  <p className="font-semibold text-center text-sm mb-3">External Integrations</p>
                  <div className="grid grid-cols-2 gap-2">
                    {integrations.map(int => (
                      <div key={int.name} className="flex items-center gap-2 p-2 bg-background/60 rounded-lg">
                        <span className="text-lg">{int.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{int.name}</p>
                          <p className="text-[10px] text-muted-foreground">{int.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud deployment */}
            <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 w-full max-w-2xl text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Cloud className="w-5 h-5 text-muted-foreground" />
                <p className="font-semibold text-muted-foreground">Cloud Deployment</p>
              </div>
              <p className="text-xs text-muted-foreground">Auto-scaling, CDN, SSL, CI/CD pipeline • 99.9% uptime SLA</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">Docker</Badge>
                <Badge variant="outline" className="text-xs">Auto-scale</Badge>
                <Badge variant="outline" className="text-xs">CDN</Badge>
                <Badge variant="outline" className="text-xs">CI/CD</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Security & Authentication Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Security & Authentication</CardTitle>
          <CardDescription>Enterprise-grade security measures implemented across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityFeatures.map(feat => (
              <div key={feat.name} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className={`p-2.5 rounded-lg shrink-0 ${feat.color}`}>
                  <feat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">{feat.name}</p>
                  <p className="text-sm text-muted-foreground">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card key={mod.name} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">{mod.name}</h3>
                    <p className="text-sm text-muted-foreground">{mod.desc}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {mod.ready && (
                        <Badge variant="outline" className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" />Reusable Module
                        </Badge>
                      )}
                      {mod.apiReady && (
                        <Badge variant="outline" className="gap-1 text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                          <Plug className="w-3 h-3" />API Ready
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reconciliation Modules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5" />Reconciliation Engine Modules</CardTitle>
              <CardDescription>Essential ecommerce reconciliation modules with financial discrepancy alerts</CardDescription>
            </div>
            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1">
              <AlertTriangle className="w-3 h-3" />
              {reconciliationModules.reduce((s, m) => s + m.alertCount, 0)} Active Alerts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reconciliationModules.map(mod => {
              const Icon = mod.icon;
              return (
                <Card key={mod.name} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${severityConfig[mod.severity].className.split(' ').slice(0, 1).join(' ')}`}>
                        <Icon className={`w-5 h-5 ${severityConfig[mod.severity].className.split(' ')[1]}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm">{mod.name}</h4>
                          <Badge variant="outline" className={`text-xs ${severityConfig[mod.severity].className}`}>
                            {mod.alertCount} alerts
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{mod.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground text-sm">
            All modules follow a standardized data architecture with typed interfaces, mock service layers, and consistent identifiers (productId, skuId, orderId) for seamless backend integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
