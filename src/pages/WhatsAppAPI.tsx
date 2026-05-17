import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Wifi, WifiOff, Clock, Send, Settings, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WhatsAppTemplates from '@/components/whatsapp/WhatsAppTemplates';
import WhatsAppMessaging from '@/components/whatsapp/WhatsAppMessaging';
import WhatsAppMessageLog from '@/components/whatsapp/WhatsAppMessageLog';
import WhatsAppMetaConfig from '@/components/whatsapp/WhatsAppMetaConfig';

interface WhatsAppNumber {
  id: string;
  label: string;
  phone: string;
  quality: string;
  verified: boolean;
  isConnected: boolean;
  autoReply: boolean;
  messagesSent: number;
  delivered: number;
  read: number;
  failed: number;
}

const initialNumbers: WhatsAppNumber[] = [
  { id: 'wa-1', label: 'Primary (Sales)', phone: '+91 98765 00001', quality: 'High', verified: true, isConnected: true, autoReply: true, messagesSent: 5, delivered: 3, read: 2, failed: 1 },
  { id: 'wa-2', label: 'Support Line', phone: '+91 98765 00002', quality: 'Medium', verified: true, isConnected: false, autoReply: false, messagesSent: 0, delivered: 0, read: 0, failed: 0 },
];

export default function WhatsAppAPI() {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState(initialNumbers);
  const [activeNumber, setActiveNumber] = useState(initialNumbers[0].id);

  const current = numbers.find(n => n.id === activeNumber) || numbers[0];

  const toggleConnection = () => {
    setNumbers(prev => prev.map(n => n.id === activeNumber ? { ...n, isConnected: !n.isConnected } : n));
    toast({ title: current.isConnected ? 'Disconnected' : 'Connected', description: `${current.label} ${current.isConnected ? 'disconnected' : 'connected'}` });
  };

  const toggleAutoReply = (v: boolean) => {
    setNumbers(prev => prev.map(n => n.id === activeNumber ? { ...n, autoReply: v } : n));
    toast({ title: v ? 'Auto-reply enabled' : 'Auto-reply disabled' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Business API</h1>
          <p className="text-muted-foreground">Manage messaging, templates, and conversation logs</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Number Switcher */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            {numbers.map(n => (
              <button
                key={n.id}
                onClick={() => setActiveNumber(n.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeNumber === n.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${n.isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {n.label}
                </div>
              </button>
            ))}
          </div>
          <Badge variant="outline" className={current.isConnected ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1.5' : 'bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1.5'}>
            {current.isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {current.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button variant={current.isConnected ? 'outline' : 'default'} className="gap-2" onClick={toggleConnection}>
            {current.isConnected ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {current.isConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Business Account</p>
              <p className="font-semibold">VendorFlow Commerce</p>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">✓ Verified</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Number</p>
              <p className="font-semibold">{current.phone}</p>
              <p className="text-xs text-muted-foreground">{current.label} · Quality: {current.quality}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Second Number</p>
              {numbers.filter(n => n.id !== activeNumber).map(n => (
                <div key={n.id}>
                  <p className="font-semibold">{n.phone}</p>
                  <p className="text-xs text-muted-foreground">{n.label} · {n.isConnected ? 'Active' : 'Inactive'}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">API Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${current.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <p className="font-semibold">{current.isConnected ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Auto Reply</p>
              <div className="flex items-center gap-2">
                <Switch checked={current.autoReply} onCheckedChange={toggleAutoReply} />
                <span className="text-sm">{current.autoReply ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{current.messagesSent}</p><p className="text-xs text-muted-foreground">Messages Sent</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{current.delivered}</p><p className="text-xs text-muted-foreground">Delivered</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{current.read}</p><p className="text-xs text-muted-foreground">Read</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-rose-600">{current.failed}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">8</p><p className="text-xs text-muted-foreground">Active Templates</p></CardContent></Card>
      </div>

      <Tabs defaultValue="messaging">
        <TabsList>
          <TabsTrigger value="messaging" className="gap-1.5"><Send className="w-4 h-4" />Messaging</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><MessageSquare className="w-4 h-4" />Templates</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><Clock className="w-4 h-4" />Message Log</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-4 h-4" />Meta API Config</TabsTrigger>
        </TabsList>

        <TabsContent value="messaging" className="mt-4">
          <WhatsAppMessaging />
        </TabsContent>
        <TabsContent value="templates" className="space-y-4 mt-4">
          <WhatsAppTemplates />
        </TabsContent>
        <TabsContent value="logs" className="space-y-4 mt-4">
          <WhatsAppMessageLog />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4 mt-4">
          <WhatsAppMetaConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
