import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, RefreshCw, CheckCircle2, AlertCircle, Zap, Globe, Webhook, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
  responseTime: string;
}

export default function APISettings() {
  const { toast } = useToast();
  const [apiEnabled, setApiEnabled] = useState(true);
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('sk_live_51234567890abcdef');
  const [webhookUrl, setWebhookUrl] = useState('https://yourdomain.com/webhooks/vendorflow');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // API logs are sourced from the backend. Start with an empty list.
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  // fetch api logs from DB if available
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { apiLogsDb } = await import('@/services/database');
        const rows = await apiLogsDb.getAll(50);
        if (mounted) setApiLogs(rows || []);
      } catch (e) {
        console.debug('api_logs fetch failed:', e);
      } finally {
        if (mounted) setLoadingLogs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    
    // Simulate API test
    setTimeout(() => {
      const success = Math.random() > 0.2;
      if (success) {
        setConnectionStatus('success');
        toast({
          title: 'Connection Successful',
          description: 'API and webhook endpoints are responding correctly.',
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: 'Connection Failed',
          description: 'Unable to reach webhook endpoint. Check URL and retry.',
          variant: 'destructive',
        });
      }
      setTestingConnection(false);
    }, 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({ title: 'Copied', description: 'API key copied to clipboard.' });
  };

  const handleRegenerateKey = () => {
    const newKey = `sk_live_${Math.random().toString(36).substring(2, 20)}`;
    setApiKey(newKey);
    toast({
      title: 'API Key Regenerated',
      description: 'A new API key has been generated. Update your integrations.',
      variant: 'destructive',
    });
  };

  const handleSaveWebhook = () => {
    toast({ title: 'Webhook URL Saved', description: 'Webhook configuration updated.' });
  };

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left flex-1">
        <h1 className="text-2xl font-bold text-foreground">API Settings & Integration</h1>
        <p className="text-muted-foreground mt-1">Manage API keys, webhooks, and test integrations with external services</p>
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="mx-auto w-fit">
          <TabsTrigger value="keys" className="gap-2">
            <Zap className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Globe className="w-4 h-4" />
            API Logs
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-6">
          {/* API Status Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Website API Status
                  </CardTitle>
                  <CardDescription>Enable API access for third-party integrations</CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div>
                  <p className="font-medium text-foreground">Enable API</p>
                  <p className="text-sm text-muted-foreground">Allow external applications to access your VendorFlow data</p>
                </div>
                <Switch checked={apiEnabled} onCheckedChange={setApiEnabled} />
              </div>

              {apiEnabled && (
                <Alert className="border-blue-500/30 bg-blue-500/5">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-600 ml-2">
                    API is active. Keep your API key secure and never share it publicly.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* API Key Management */}
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>Your primary API key for authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="api-key" className="text-foreground font-medium mb-2 block">
                  Live API Key
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                    title="Copy API Key"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this key in your API requests as: <code className="bg-muted px-1 py-0.5 rounded">Authorization: Bearer {apiKey}</code>
                </p>
              </div>

              <div>
                <Label htmlFor="api-base-url" className="text-foreground font-medium mb-2 block">
                  API Base URL
                </Label>
                <Input
                  id="api-base-url"
                  type="text"
                  value="https://api.vendorflow.app/v1"
                  readOnly
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Use this URL as the base for all API requests
                </p>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleRegenerateKey}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Key
                </Button>
                <p className="text-sm text-muted-foreground flex items-center">
                  Regenerating will invalidate the current key. Update all integrations immediately.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* API Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p>
                  <strong className="text-foreground">Documentation:</strong>{' '}
                  <Button variant="link" className="h-auto p-0 text-primary">
                    View API Docs
                  </Button>
                </p>
                <p>
                  <strong className="text-foreground">Endpoints:</strong> /api/products, /api/orders, /api/inventory, /api/settlements
                </p>
                <p>
                  <strong className="text-foreground">Rate Limit:</strong> 1000 requests/hour per API key
                </p>
                <p>
                  <strong className="text-foreground">Supported Methods:</strong> GET, POST, PUT, DELETE
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    Webhook Configuration
                  </CardTitle>
                  <CardDescription>Receive real-time notifications for platform events</CardDescription>
                </div>
                <Badge variant="outline" className={webhookEnabled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                  {webhookEnabled ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                  {webhookEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div>
                  <p className="font-medium text-foreground">Enable Webhooks</p>
                  <p className="text-sm text-muted-foreground">Receive POST requests for order, inventory, and settlement updates</p>
                </div>
                <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
              </div>

              {webhookEnabled && (
                <>
                  <div>
                    <Label htmlFor="webhook-url" className="text-foreground font-medium mb-2 block">
                      Webhook URL
                    </Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://yourdomain.com/webhooks/vendorflow"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      We'll send POST requests to this URL with event data
                    </p>
                  </div>

                  <div>
                    <Label className="text-foreground font-medium mb-2 block">
                      Webhook Events
                    </Label>
                    <div className="space-y-2">
                      {[
                        { name: 'order.created', desc: 'New order placed' },
                        { name: 'order.updated', desc: 'Order status changed' },
                        { name: 'inventory.low', desc: 'Low stock alert' },
                        { name: 'settlement.completed', desc: 'Settlement processed' },
                        { name: 'product.synced', desc: 'Product updated across channels' },
                      ].map(event => (
                        <div key={event.name} className="flex items-center gap-3 p-2 rounded border">
                          <input type="checkbox" id={event.name} defaultChecked className="rounded" />
                          <label htmlFor={event.name} className="flex-1 cursor-pointer">
                            <p className="text-sm font-medium">{event.name}</p>
                            <p className="text-xs text-muted-foreground">{event.desc}</p>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t flex gap-3">
                    <Button onClick={handleSaveWebhook} className="gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Save Webhook
                    </Button>
                    <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
                      {testingConnection ? 'Testing...' : 'Test Webhook'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Webhook Test Results */}
          {connectionStatus !== 'idle' && (
            <Card className={connectionStatus === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}>
              <CardContent className="p-4 flex items-start gap-3">
                {connectionStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-600">Webhook Test Successful</p>
                      <p className="text-sm text-muted-foreground">Your webhook endpoint is receiving requests correctly.</p>
                      <p className="text-xs text-muted-foreground mt-1">Status: 200 OK • Response time: 234ms</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-600">Webhook Test Failed</p>
                      <p className="text-sm text-muted-foreground">Check your webhook URL and ensure it's publicly accessible.</p>
                      <p className="text-xs text-muted-foreground mt-1">Error: Connection timeout after 30s</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* API Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                API Request Logs
              </CardTitle>
              <CardDescription>Recent API calls and their response status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold">Timestamp</th>
                      <th className="text-left p-3 font-semibold">Method</th>
                      <th className="text-left p-3 font-semibold">Endpoint</th>
                      <th className="text-center p-3 font-semibold">Status</th>
                      <th className="text-right p-3 font-semibold">Response Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiLogs.map(log => (
                      <tr key={log.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground">{log.timestamp}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.method}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono">{log.endpoint}</td>
                        <td className="p-3 text-center">
                          <Badge
                            variant="outline"
                            className={log.status === 200 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-muted-foreground">{log.responseTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Showing last 5 requests. Full logs available in your account dashboard.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Load API logs on mount
// (placed at bottom intentionally to keep top-level component minimal)
export async function loadApiLogs(setter: (logs: any[]) => void, setLoading?: (v: boolean) => void) {
  try {
    const { apiLogsDb } = await import('@/services/database');
    const rows = await apiLogsDb.getAll(50);
    setter(rows || []);
  } catch (e) {
    console.debug('No api_logs table or fetch failed:', e);
  } finally {
    if (setLoading) setLoading(false);
  }
}
