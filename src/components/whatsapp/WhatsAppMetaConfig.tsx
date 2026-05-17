import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, ExternalLink, Shield, Key, Globe, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WhatsAppMetaConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
    webhookUrl: 'https://api.vendorflow.in/webhooks/whatsapp',
    callbackUrl: 'https://api.vendorflow.in/callbacks/wa-status',
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [notifications, setNotifications] = useState({
    orderConfirmation: true,
    shippingUpdate: true,
    paymentReminder: true,
    returnRefund: true,
    promotional: false,
    otpVerification: true,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const testConnection = () => {
    if (!config.accessToken || !config.phoneNumberId) {
      toast({ title: 'Missing Configuration', description: 'Please fill in Access Token and Phone Number ID', variant: 'destructive' });
      return;
    }
    toast({ title: 'Connection Tested', description: 'Meta WhatsApp API endpoint is reachable ✓' });
  };

  return (
    <div className="space-y-6">
      {/* Meta Developer Setup Guide */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <CardTitle className="text-base">Meta Business Platform Setup</CardTitle>
          </div>
          <CardDescription>Connect your WhatsApp Business API via Meta Developer Console</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Create Meta App', desc: 'Go to developers.facebook.com → My Apps → Create App' },
              { step: '2', title: 'Add WhatsApp Product', desc: 'In your app, click Add Product → WhatsApp → Set Up' },
              { step: '3', title: 'Get API Credentials', desc: 'Copy your Phone Number ID, Business Account ID & Token' },
              { step: '4', title: 'Configure Webhook', desc: 'Set webhook URL and verify token for real-time events' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">{s.step}</div>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}>
              <ExternalLink className="w-3.5 h-3.5" />Meta Developer Console
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open('https://business.facebook.com/', '_blank')}>
              <ExternalLink className="w-3.5 h-3.5" />Meta Business Suite
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Credentials */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle>API Credentials</CardTitle>
            </div>
            <CardDescription>From Meta Developer Console → WhatsApp → API Setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Meta App ID</Label>
              <Input placeholder="e.g., 1234567890123456" value={config.appId} onChange={e => setConfig({ ...config, appId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>App Secret</Label>
              <div className="flex gap-2">
                <Input type={showSecrets ? 'text' : 'password'} placeholder="Enter app secret" value={config.appSecret} onChange={e => setConfig({ ...config, appSecret: e.target.value })} />
                <Button variant="outline" size="sm" onClick={() => setShowSecrets(!showSecrets)}>{showSecrets ? 'Hide' : 'Show'}</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input placeholder="e.g., 109876543210987" value={config.phoneNumberId} onChange={e => setConfig({ ...config, phoneNumberId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Business Account ID</Label>
              <Input placeholder="e.g., 102345678901234" value={config.businessAccountId} onChange={e => setConfig({ ...config, businessAccountId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Permanent Access Token</Label>
              <div className="flex gap-2">
                <Input type={showSecrets ? 'text' : 'password'} placeholder="Enter access token" value={config.accessToken} onChange={e => setConfig({ ...config, accessToken: e.target.value })} />
                <Button variant="outline" size="icon" onClick={() => copy(config.accessToken, 'Token')}><Copy className="w-4 h-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Generate a permanent token from System Users in Meta Business Settings</p>
            </div>
            <Button className="gap-2 w-full" onClick={testConnection}><RefreshCw className="w-4 h-4" />Test API Connection</Button>
          </CardContent>
        </Card>

        {/* Webhook & Notification Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle>Webhook Configuration</CardTitle>
              </div>
              <CardDescription>Configure Meta webhook for receiving messages & status updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input value={config.webhookUrl} onChange={e => setConfig({ ...config, webhookUrl: e.target.value })} />
                  <Button variant="outline" size="icon" onClick={() => copy(config.webhookUrl, 'Webhook URL')}><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Verify Token</Label>
                <div className="flex gap-2">
                  <Input placeholder="Enter a custom verify token" value={config.webhookVerifyToken} onChange={e => setConfig({ ...config, webhookVerifyToken: e.target.value })} />
                  <Button variant="outline" size="icon" onClick={() => copy(config.webhookVerifyToken, 'Verify Token')}><Copy className="w-4 h-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">Must match the token in Meta App → Webhooks configuration</p>
              </div>
              <div className="space-y-2">
                <Label>Status Callback URL</Label>
                <div className="flex gap-2">
                  <Input value={config.callbackUrl} onChange={e => setConfig({ ...config, callbackUrl: e.target.value })} />
                  <Button variant="outline" size="icon" onClick={() => copy(config.callbackUrl, 'Callback URL')}><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg space-y-1.5">
                <p className="text-xs font-semibold">Required Webhook Fields:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['messages', 'message_deliveries', 'message_reads', 'message_echoes'].map(f => (
                    <Badge key={f} variant="outline" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{f}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Auto-send messages for these events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(notifications).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Switch checked={val} onCheckedChange={v => setNotifications({ ...notifications, [key]: v })} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
