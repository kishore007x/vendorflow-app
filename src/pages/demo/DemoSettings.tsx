import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Bell, Shield, Globe, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DemoSettings() {
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState('30');
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400">Configure your integration preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#111833] border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> API Configuration
            </CardTitle>
            <CardDescription className="text-gray-500">Marketplace API credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {['Flipkart', 'Amazon', 'Meesho'].map((mp) => (
              <div key={mp} className="space-y-2">
                <Label className="text-xs text-gray-400">{mp} API Key</Label>
                <Input
                  type="password"
                  defaultValue="sk_live_xxxxxxxxxxxx"
                  className="bg-white/[0.03] border-white/10 text-gray-300 font-mono text-xs"
                />
              </div>
            ))}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
              onClick={() => toast({ title: 'API Keys Saved', description: 'Credentials updated successfully.' })}
            >
              Save API Keys
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#111833] border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" /> Sync Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-200">Auto Sync</p>
                <p className="text-xs text-gray-500">Automatically pull data from marketplaces</p>
              </div>
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-200">Notifications</p>
                <p className="text-xs text-gray-500">Get alerts for sync failures</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Sync Interval</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger className="bg-white/[0.03] border-white/10 text-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2240] border-white/10">
                  <SelectItem value="15" className="text-gray-200 focus:bg-white/10">Every 15 min</SelectItem>
                  <SelectItem value="30" className="text-gray-200 focus:bg-white/10">Every 30 min</SelectItem>
                  <SelectItem value="60" className="text-gray-200 focus:bg-white/10">Every 1 hour</SelectItem>
                  <SelectItem value="360" className="text-gray-200 focus:bg-white/10">Every 6 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
