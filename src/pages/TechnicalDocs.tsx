import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, Database, Shield, Layers, Server, Globe, Lock, Users, Package,
  Zap, BarChart3, ShoppingCart, CreditCard, Video, Brain, Bell, Workflow,
} from 'lucide-react';

const modules = [
  { name: 'Dashboard', desc: 'KPI cards, revenue charts, portal-wise analytics', status: 'complete', icon: BarChart3 },
  { name: 'Product Management', desc: 'CRUD, bulk upload, image storage, portal allocation', status: 'complete', icon: Package },
  { name: 'Inventory Sync', desc: 'Master qty, channel allocations, auto-sync on order events', status: 'complete', icon: Layers },
  { name: 'Order Management', desc: 'Multi-portal orders, status lifecycle, consolidated view', status: 'complete', icon: ShoppingCart },
  { name: 'Returns & Claims', desc: 'Return lifecycle, evidence uploads, claim tracking', status: 'complete', icon: Workflow },
  { name: 'Settlements', desc: 'Payment tracking, lock/unlock, reconciliation', status: 'complete', icon: CreditCard },
  { name: 'SKU Mapping', desc: 'Master SKU ↔ portal SKU cross-mapping', status: 'complete', icon: Layers },
  { name: 'AI Chatbot & Insights', desc: 'Streaming chat, demand forecast, pricing, return analysis', status: 'complete', icon: Brain },
  { name: 'Video Management', desc: 'Order video capture, storage, verification workflow', status: 'complete', icon: Video },
  { name: 'RBAC & Permissions', desc: 'Admin/Vendor/Operations roles with RLS enforcement', status: 'complete', icon: Shield },
  { name: 'Alerts & Notifications', desc: 'In-app alerts with severity levels', status: 'complete', icon: Bell },
  { name: 'Expense & Staff', desc: 'Expense tracking, employee management, attendance', status: 'complete', icon: Users },
  { name: 'Subscription', desc: 'Trial/paid plans, expiry management, feature gating', status: 'complete', icon: Zap },
  { name: 'Social Inbox', desc: 'Unified messaging hub with AI auto-reply', status: 'ui-only', icon: Globe },
  { name: 'WhatsApp API', desc: 'Template management, message logs (needs API key)', status: 'ui-only', icon: Globe },
  { name: 'Own Website', desc: 'Direct-to-consumer channel with live DB data', status: 'complete', icon: Globe },
];

const dbTables = [
  'profiles', 'user_roles', 'vendors', 'products', 'inventory', 'orders', 'order_items',
  'returns', 'settlements', 'sku_mappings', 'invoices', 'invoice_items', 'credit_notes',
  'debit_notes', 'expenses', 'employees', 'attendance', 'tailor_work', 'tasks', 'alerts',
  'activity_logs', 'reports', 'warehouses', 'customers', 'leads', 'videos', 'social_messages',
  'marketing_config', 'onboarding_requests', 'product_health', 'reconciliation_logs',
  'chat_conversations', 'automation_settings',
];

const securityFeatures = [
  'Row-Level Security (RLS) on all tables',
  'Role-based access: Admin, Vendor, Operations',
  'Security-definer functions (has_role, can_access_vendor_data)',
  'Vendor data isolation — vendors only see their own data',
  'Admin/Operations cross-vendor access',
  'Finalized invoice protection (guard_finalized_invoice trigger)',
  'Locked settlement protection (guard_locked_settlement trigger)',
  'JWT-based authentication via Supabase Auth',
  'Encrypted API communication (HTTPS)',
  'Secure secret management for edge functions',
];

const apiEndpoints = [
  { method: 'POST', path: '/functions/v1/chat', desc: 'AI streaming chat (SSE)', auth: 'anon key' },
  { method: 'POST', path: '/functions/v1/ai-insights', desc: 'AI insights (pricing, demand, returns)', auth: 'anon key' },
  { method: 'POST', path: '/functions/v1/seed-test-users', desc: 'Seed test users (dev only)', auth: 'none' },
];

export default function TechnicalDocs() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📄 Technical Documentation</h1>
          <p className="text-muted-foreground">System architecture, modules, database schema & security reference</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 w-fit">v1.2 — March 2026</Badge>
      </div>

      <Tabs defaultValue="architecture" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="architecture" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Architecture</TabsTrigger>
          <TabsTrigger value="modules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Modules</TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Database</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Security</TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">API Reference</TabsTrigger>
        </TabsList>

        {/* Architecture */}
        <TabsContent value="architecture" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Server className="w-5 h-5 text-primary" />System Architecture</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/20">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-blue-600" />Frontend</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• React 18 + TypeScript</li>
                      <li>• Vite build system</li>
                      <li>• Tailwind CSS + shadcn/ui</li>
                      <li>• React Router v6</li>
                      <li>• TanStack React Query</li>
                      <li>• Recharts for analytics</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Database className="w-4 h-4 text-emerald-600" />Backend</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Lovable Cloud (PostgreSQL)</li>
                      <li>• Row-Level Security (RLS)</li>
                      <li>• Real-time subscriptions</li>
                      <li>• Edge Functions (Deno)</li>
                      <li>• File storage buckets</li>
                      <li>• JWT authentication</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" />AI Layer</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Gemini AI via Lovable gateway</li>
                      <li>• Streaming chat (SSE)</li>
                      <li>• Smart pricing engine</li>
                      <li>• Demand forecasting</li>
                      <li>• Return pattern analysis</li>
                      <li>• No external API key needed</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              <Card className="bg-muted/10 border-dashed">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2">Data Flow</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    React App → Supabase JS Client → PostgreSQL (with RLS) → Response.<br />
                    AI Chat → Edge Function → Lovable AI Gateway → Streaming SSE → Client.<br />
                    File Uploads → Supabase Storage Buckets (product-images, order-videos, documents, invoices, return-evidence).
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-primary" />Module Registry</CardTitle>
              <CardDescription>{modules.filter(m => m.status === 'complete').length} complete, {modules.filter(m => m.status === 'ui-only').length} UI-only</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modules.map(mod => {
                  const Icon = mod.icon;
                  return (
                    <div key={mod.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{mod.name}</h4>
                          <Badge variant="outline" className={`text-[10px] h-4 px-1 ${mod.status === 'complete' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 border-amber-500/30'}`}>{mod.status === 'complete' ? '✔ Complete' : 'UI Only'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-primary" />Database Schema</CardTitle>
              <CardDescription>{dbTables.length} tables in public schema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {dbTables.map(t => (
                  <div key={t} className="px-3 py-2 rounded-lg bg-muted/30 border text-center">
                    <p className="font-mono text-xs">{t}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-sm">Storage Buckets</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {['product-images (public)', 'order-videos', 'documents', 'invoices', 'return-evidence'].map(b => (
                    <div key={b} className="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                      <p className="font-mono text-xs">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-sm">Database Functions</h4>
                <div className="space-y-2">
                  {[
                    { name: 'has_role(user_id, role)', desc: 'Check if user has a specific role (SECURITY DEFINER)' },
                    { name: 'can_access_vendor_data(vendor_id)', desc: 'Check if current user can access vendor data' },
                    { name: 'handle_new_user()', desc: 'Trigger: auto-create profile & assign vendor role on signup' },
                    { name: 'guard_finalized_invoice()', desc: 'Trigger: prevent edits to finalized invoices' },
                    { name: 'guard_locked_settlement()', desc: 'Trigger: prevent edits to locked settlements' },
                    { name: 'update_updated_at()', desc: 'Trigger: auto-update updated_at timestamp' },
                  ].map(fn => (
                    <div key={fn.name} className="flex items-start gap-3 p-2 rounded bg-muted/20">
                      <code className="text-xs font-mono text-primary shrink-0">{fn.name}</code>
                      <p className="text-xs text-muted-foreground">{fn.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Security Architecture</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {securityFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-sm">{f}</p>
                  </div>
                ))}
              </div>
              <Card className="bg-muted/10 border-dashed">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2">Role Hierarchy</h4>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div><Badge className="mb-2">Admin</Badge><p className="text-muted-foreground">Full access. CRUD all data, manage users, configure system.</p></div>
                    <div><Badge variant="secondary" className="mb-2">Vendor</Badge><p className="text-muted-foreground">Own data only. Products, orders, returns, settlements.</p></div>
                    <div><Badge variant="outline" className="mb-2">Operations</Badge><p className="text-muted-foreground">Cross-vendor read. Order processing, return handling.</p></div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Reference */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Edge Function Endpoints</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiEndpoints.map((ep, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border">
                    <Badge variant={ep.method === 'POST' ? 'default' : 'secondary'} className="shrink-0 font-mono text-xs">{ep.method}</Badge>
                    <div className="flex-1">
                      <code className="text-sm font-mono text-primary">{ep.path}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">{ep.desc}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Auth: {ep.auth}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-sm">Chat API Example</h4>
                <pre className="p-4 rounded-lg bg-muted/30 border text-xs font-mono overflow-x-auto whitespace-pre">{`POST /functions/v1/chat
Content-Type: application/json
Authorization: Bearer <anon-key>

{
  "messages": [
    { "role": "user", "content": "What are my top products?" }
  ]
}

Response: Server-Sent Events (SSE) stream
data: {"choices":[{"delta":{"content":"Based on..."}}]}
data: [DONE]`}</pre>
              </div>
              <div className="mt-4 space-y-3">
                <h4 className="font-semibold text-sm">AI Insights API Example</h4>
                <pre className="p-4 rounded-lg bg-muted/30 border text-xs font-mono overflow-x-auto whitespace-pre">{`POST /functions/v1/ai-insights
Content-Type: application/json

{
  "type": "smart-pricing" | "demand-forecast" | "return-analysis",
  "data": { ... context data ... }
}

Response: { "insight": "markdown formatted analysis..." }`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
