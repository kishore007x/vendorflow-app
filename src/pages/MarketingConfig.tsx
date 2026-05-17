import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { marketingConfigDb } from '@/services/database';
import { Mail, MessageCircle, Share2, Video, Save, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MarketingConfig() {
  const { toast } = useToast();
  const [emailConfig, setEmailConfig] = useState({ host: '', port: '587', username: '', password: '', fromName: 'VendorFlow', fromEmail: '' });
  const [whatsappConfig, setWhatsappConfig] = useState({ apiKey: '', phoneNumberId: '', businessAccountId: '', webhookUrl: '' });
  const [socialConfig, setSocialConfig] = useState({ fbAppId: '', fbAppSecret: '', igAccessToken: '', gmbApiKey: '' });
  const [meetConfig, setMeetConfig] = useState({ clientId: '', clientSecret: '', calendarId: '' });
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [socialEnabled, setSocialEnabled] = useState(false);
  const [meetEnabled, setMeetEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const configs = await marketingConfigDb.getAll();
        configs.forEach((c: any) => {
          if (c.channel === 'email') { setEmailConfig(c.config); setEmailEnabled(c.enabled); }
          if (c.channel === 'whatsapp') { setWhatsappConfig(c.config); setWhatsappEnabled(c.enabled); }
          if (c.channel === 'social') { setSocialConfig(c.config); setSocialEnabled(c.enabled); }
          if (c.channel === 'meet') { setMeetConfig(c.config); setMeetEnabled(c.enabled); }
        });
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  const handleSave = async (section: string) => {
    try {
      const channelMap: Record<string, { config: any; enabled: boolean }> = {
        Email: { config: emailConfig, enabled: emailEnabled },
        WhatsApp: { config: whatsappConfig, enabled: whatsappEnabled },
        'Social Media': { config: socialConfig, enabled: socialEnabled },
        'Google Meet': { config: meetConfig, enabled: meetEnabled },
      };
      const key = section === 'Email' ? 'email' : section === 'WhatsApp' ? 'whatsapp' : section === 'Social Media' ? 'social' : 'meet';
      await marketingConfigDb.upsert(key, channelMap[section].config, channelMap[section].enabled);
      toast({ title: `${section} Settings Saved`, description: 'Configuration updated successfully.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Configuration</h1>
          <p className="text-muted-foreground">Configure marketing channel integrations</p>
        </div>
        <Badge variant="outline" className="w-fit">✔ Updated</Badge>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Mail className="w-4 h-4 mr-1.5" />Email</TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp</TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Share2 className="w-4 h-4 mr-1.5" />Social Media</TabsTrigger>
          <TabsTrigger value="meet" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Video className="w-4 h-4 mr-1.5" />Google Meet</TabsTrigger>
        </TabsList>

        {/* Email Marketing */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Email Marketing (SMTP)</CardTitle>
                  <CardDescription>Configure SMTP server for email campaigns</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="email-toggle" className="text-sm">Enable</Label>
                  <Switch id="email-toggle" checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SMTP Host</Label><Input placeholder="smtp.gmail.com" value={emailConfig.host} onChange={e => setEmailConfig(p => ({ ...p, host: e.target.value }))} /></div>
                <div className="space-y-2"><Label>SMTP Port</Label><Input placeholder="587" value={emailConfig.port} onChange={e => setEmailConfig(p => ({ ...p, port: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Username</Label><Input placeholder="your@email.com" value={emailConfig.username} onChange={e => setEmailConfig(p => ({ ...p, username: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="••••••••" value={emailConfig.password} onChange={e => setEmailConfig(p => ({ ...p, password: e.target.value }))} /></div>
                <div className="space-y-2"><Label>From Name</Label><Input value={emailConfig.fromName} onChange={e => setEmailConfig(p => ({ ...p, fromName: e.target.value }))} /></div>
                <div className="space-y-2"><Label>From Email</Label><Input placeholder="noreply@yourdomain.com" value={emailConfig.fromEmail} onChange={e => setEmailConfig(p => ({ ...p, fromEmail: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">SMTP credentials are stored securely. No emails will be sent until integration is activated.</span>
              </div>
              <Button onClick={() => handleSave('Email')} className="bg-primary hover:bg-primary/90"><Save className="w-4 h-4 mr-1.5" />Save Email Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-emerald-600" />WhatsApp Marketing</CardTitle>
                  <CardDescription>Configure WhatsApp Business API for messaging</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="wa-toggle" className="text-sm">Enable</Label>
                  <Switch id="wa-toggle" checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="whatsapp_api_key_..." value={whatsappConfig.apiKey} onChange={e => setWhatsappConfig(p => ({ ...p, apiKey: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone Number ID</Label><Input placeholder="1234567890" value={whatsappConfig.phoneNumberId} onChange={e => setWhatsappConfig(p => ({ ...p, phoneNumberId: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Business Account ID</Label><Input placeholder="business_account_id" value={whatsappConfig.businessAccountId} onChange={e => setWhatsappConfig(p => ({ ...p, businessAccountId: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Webhook URL</Label><Input placeholder="https://yourdomain.com/webhook" value={whatsappConfig.webhookUrl} onChange={e => setWhatsappConfig(p => ({ ...p, webhookUrl: e.target.value }))} /></div>
              </div>
              <Button onClick={() => handleSave('WhatsApp')} className="bg-primary hover:bg-primary/90"><Save className="w-4 h-4 mr-1.5" />Save WhatsApp Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5 text-blue-600" />Social Media Integration</CardTitle>
                  <CardDescription>Connect Facebook, Instagram & Google My Business</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="social-toggle" className="text-sm">Enable</Label>
                  <Switch id="social-toggle" checked={socialEnabled} onCheckedChange={setSocialEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3 text-sm">Facebook</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>App ID</Label><Input placeholder="fb_app_id" value={socialConfig.fbAppId} onChange={e => setSocialConfig(p => ({ ...p, fbAppId: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>App Secret</Label><Input type="password" placeholder="fb_app_secret" value={socialConfig.fbAppSecret} onChange={e => setSocialConfig(p => ({ ...p, fbAppSecret: e.target.value }))} /></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-sm">Instagram</h4>
                <div className="space-y-2"><Label>Access Token</Label><Input type="password" placeholder="ig_access_token" value={socialConfig.igAccessToken} onChange={e => setSocialConfig(p => ({ ...p, igAccessToken: e.target.value }))} /></div>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-sm">Google My Business</h4>
                <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="gmb_api_key" value={socialConfig.gmbApiKey} onChange={e => setSocialConfig(p => ({ ...p, gmbApiKey: e.target.value }))} /></div>
              </div>
              <Button onClick={() => handleSave('Social Media')} className="bg-primary hover:bg-primary/90"><Save className="w-4 h-4 mr-1.5" />Save Social Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Meet */}
        <TabsContent value="meet">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Video className="w-5 h-5 text-emerald-600" />Google Meet Integration</CardTitle>
                  <CardDescription>Configure Google Calendar & Meet for scheduled meetings</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="meet-toggle" className="text-sm">Enable</Label>
                  <Switch id="meet-toggle" checked={meetEnabled} onCheckedChange={setMeetEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>OAuth Client ID</Label><Input placeholder="client_id.apps.googleusercontent.com" value={meetConfig.clientId} onChange={e => setMeetConfig(p => ({ ...p, clientId: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Client Secret</Label><Input type="password" placeholder="client_secret" value={meetConfig.clientSecret} onChange={e => setMeetConfig(p => ({ ...p, clientSecret: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Calendar ID</Label><Input placeholder="your_calendar@gmail.com" value={meetConfig.calendarId} onChange={e => setMeetConfig(p => ({ ...p, calendarId: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Google Meet links will be auto-generated for vendor meetings when integration is active.</span>
              </div>
              <Button onClick={() => handleSave('Google Meet')} className="bg-primary hover:bg-primary/90"><Save className="w-4 h-4 mr-1.5" />Save Meet Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
