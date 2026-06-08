import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  MessageCircle, Youtube, Users, Send, Plus, Clock, CheckCircle2,
  Image, Paperclip, Smile, Calendar, BarChart3, Eye, UserPlus,
  ExternalLink, Hash, Video, Megaphone, Globe, ArrowRight
} from 'lucide-react';

interface BroadcastMessage {
  id: string;
  channel: 'whatsapp' | 'youtube' | 'community';
  title: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sentAt?: string;
  scheduledAt?: string;
  reach?: number;
  opens?: number;
}

// Broadcasts are provided by the backend. Use local state and fetch as needed.

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  sent: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  failed: 'bg-destructive/15 text-destructive border-destructive/30',
};

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  youtube: Youtube,
  community: Users,
};

const channelColors: Record<string, string> = {
  whatsapp: 'text-emerald-500',
  youtube: 'text-red-500',
  community: 'text-blue-500',
};

export default function Broadcast() {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const { toast } = useToast();
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [composeChannel, setComposeChannel] = useState<string>('whatsapp');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const whatsappStats = useMemo(() => {
    const sent = broadcasts.filter(b => b.channel === 'whatsapp' && b.status === 'sent').length;
    const reach = broadcasts.filter(b => b.channel === 'whatsapp').reduce((s, b) => s + (b.reach || 0), 0);
    return { subscribers: reach, sent, delivered: reach, read: 0 };
  }, [broadcasts]);
  const youtubeStats = useMemo(() => {
    const sent = broadcasts.filter(b => b.channel === 'youtube' && b.status === 'sent').length;
    const views = broadcasts.filter(b => b.channel === 'youtube').reduce((s, b) => s + (b.reach || 0), 0);
    return { subscribers: 0, videos: sent, views, likes: 0 };
  }, [broadcasts]);
  const communityStats = useMemo(() => {
    const sent = broadcasts.filter(b => b.channel === 'community' && b.status === 'sent').length;
    const reach = broadcasts.filter(b => b.channel === 'community').reduce((s, b) => s + (b.reach || 0), 0);
    return { members: reach, posts: sent, activeToday: 0, newThisWeek: 0 };
  }, [broadcasts]);

  const performanceSummary = useMemo(() => {
    const last7Cutoff = Date.now() - 7 * 86400000;
    const last7 = broadcasts.filter(b => {
      const ts = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return ts >= last7Cutoff;
    });
    const totalReach = last7.reduce((s, b) => s + (b.reach || 0), 0);
    const totalOpens = last7.reduce((s, b) => s + (b.opens || 0), 0);
    const engagementRate = totalReach > 0 ? Math.round((totalOpens / totalReach) * 1000) / 10 : 0;
    return { totalReach, engagementRate, broadcastsSent: last7.length, newSubscribers: 0 };
  }, [broadcasts]);

  const handleSend = () => {
    if (!composeTitle || !composeContent) {
      toast({ title: 'Missing fields', description: 'Please fill in both title and message content.', variant: 'destructive' });
      return;
    }
    toast({ title: scheduleEnabled ? 'Broadcast Scheduled' : 'Broadcast Sent', description: `Your ${composeChannel} broadcast "${composeTitle}" has been ${scheduleEnabled ? 'scheduled' : 'queued for delivery'}.` });
    setComposeTitle('');
    setComposeContent('');
  };

  // Load broadcasts from DB when available
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await (await import('@/services/database')).broadcastsDb.getAll(50);
        if (mounted) setBroadcasts(rows || []);
      } catch (e) {
        console.debug('No broadcasts table or fetch failed:', e);
      } finally {
        if (mounted) setLoadingBroadcasts(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Broadcast Center
          </h1>
          <p className="text-muted-foreground">Send messages across WhatsApp, YouTube & Community channels</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" />3 Channels Active</Badge>
        </div>
      </div>

      {/* Channel Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">WhatsApp Channel</p>
                  <p className="text-xs text-muted-foreground">{whatsappStats.subscribers.toLocaleString()} subscribers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{whatsappStats.sent}</p>
                <p className="text-xs text-muted-foreground">broadcasts sent</p>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>• {whatsappStats.delivered} delivered</span>
              <span>• {whatsappStats.read} read</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <Youtube className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">YouTube Channel</p>
                  <p className="text-xs text-muted-foreground">{youtubeStats.subscribers.toLocaleString()} subscribers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{youtubeStats.videos}</p>
                <p className="text-xs text-muted-foreground">videos posted</p>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>• {youtubeStats.views.toLocaleString()} views</span>
              <span>• {youtubeStats.likes.toLocaleString()} likes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Community Hub</p>
                  <p className="text-xs text-muted-foreground">{communityStats.members.toLocaleString()} members</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{communityStats.posts}</p>
                <p className="text-xs text-muted-foreground">total posts</p>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>• {communityStats.activeToday} active today</span>
              <span>• +{communityStats.newThisWeek} this week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="join">Join Links</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Broadcasts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Broadcasts</CardTitle>
                <CardDescription>Latest messages across all channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {broadcasts.slice(0, 5).map((msg) => {
                  const Icon = channelIcons[msg.channel];
                  return (
                    <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <Icon className={`w-4 h-4 mt-0.5 ${channelColors[msg.channel]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{msg.title}</p>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[msg.status]}`}>
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{msg.content}</p>
                          {msg.sentAt && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Sent: {new Date(msg.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {msg.reach ? ` • ${msg.reach.toLocaleString()} reached` : ''}
                          </p>
                        )}
                        {msg.scheduledAt && (
                          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Scheduled: {new Date(msg.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {broadcasts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No broadcasts yet</p>}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => { setComposeChannel('whatsapp'); setActiveTab('compose'); }}>
                    <MessageCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs">WhatsApp Blast</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => { setComposeChannel('youtube'); setActiveTab('compose'); }}>
                    <Youtube className="w-5 h-5 text-red-500" />
                    <span className="text-xs">Post on YouTube</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => { setComposeChannel('community'); setActiveTab('compose'); }}>
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-xs">Community Post</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('join')}>
                    <UserPlus className="w-5 h-5 text-primary" />
                    <span className="text-xs">Share Join Links</span>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Total Reach (7d)</span>
                    <span className="text-sm font-bold text-foreground">{performanceSummary.totalReach.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Engagement Rate</span>
                    <span className="text-sm font-bold text-emerald-600">{performanceSummary.engagementRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">New Subscribers (7d)</span>
                    <span className="text-sm font-bold text-foreground">+{performanceSummary.newSubscribers}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Broadcasts Sent (7d)</span>
                    <span className="text-sm font-bold text-foreground">{performanceSummary.broadcastsSent}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" />Compose Broadcast</CardTitle>
              <CardDescription>Create and send a broadcast across your channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Select Channel</Label>
                <Select value={composeChannel} onValueChange={setComposeChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500" />WhatsApp Channel</span>
                    </SelectItem>
                    <SelectItem value="youtube">
                      <span className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500" />YouTube Community</span>
                    </SelectItem>
                    <SelectItem value="community">
                      <span className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />Community Hub</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Broadcast Title</Label>
                <Input placeholder="e.g. Flash Sale Alert, New Product Launch..." value={composeTitle} onChange={e => setComposeTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea placeholder="Write your broadcast message here..." className="min-h-[150px]" value={composeContent} onChange={e => setComposeContent(e.target.value)} />
                <div className="flex items-center gap-2 mt-1">
                  <Button variant="ghost" size="sm"><Image className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><Paperclip className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><Smile className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><Video className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Switch id="schedule" checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                <Label htmlFor="schedule" className="text-sm cursor-pointer">Schedule for later</Label>
                {scheduleEnabled && (
                  <Input type="datetime-local" className="w-auto ml-auto" />
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSend}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {scheduleEnabled ? 'Schedule Broadcast' : 'Send Now'}
                </Button>
                <Button variant="outline">
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Broadcast History</CardTitle>
              <CardDescription>Track performance of all sent broadcasts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {broadcasts.map((msg) => {
                  const Icon = channelIcons[msg.channel];
                  return (
                    <div key={msg.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        msg.channel === 'whatsapp' ? 'bg-emerald-500/15' :
                        msg.channel === 'youtube' ? 'bg-red-500/15' : 'bg-blue-500/15'
                      }`}>
                        <Icon className={`w-5 h-5 ${channelColors[msg.channel]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{msg.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                      </div>
                      <Badge variant="outline" className={`${statusColors[msg.status]}`}>{msg.status}</Badge>
                      <div className="text-right hidden sm:block">
                        {msg.reach ? (
                          <>
                            <p className="text-sm font-medium text-foreground">{msg.reach.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">reached</p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">—</p>
                        )}
                      </div>
                      <div className="text-right hidden md:block">
                        {msg.opens ? (
                          <>
                            <p className="text-sm font-medium text-foreground">{msg.opens.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">opens</p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">—</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {broadcasts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No broadcast history</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Join Links Tab */}
        <TabsContent value="join">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-emerald-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  WhatsApp Channel
                </CardTitle>
                <CardDescription>Share your WhatsApp channel invite link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Channel Invite Link</Label>
                  <Input placeholder="https://whatsapp.com/channel/..." defaultValue="https://whatsapp.com/channel/your-channel" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subscribers</span>
                  <span className="font-medium text-foreground">4,280</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />Copy Link
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Hash className="w-3.5 h-3.5 mr-1" />QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Youtube className="w-5 h-5 text-red-500" />
                  YouTube Channel
                </CardTitle>
                <CardDescription>Share your YouTube channel link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Channel URL</Label>
                  <Input placeholder="https://youtube.com/@yourchannel" defaultValue="https://youtube.com/@yourchannel" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subscribers</span>
                  <span className="font-medium text-foreground">12,400</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />Copy Link
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <ArrowRight className="w-3.5 h-3.5 mr-1" />Subscribe
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-blue-500" />
                  Community Hub
                </CardTitle>
                <CardDescription>Share your community join link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Community Invite Link</Label>
                  <Input placeholder="https://community.yourstore.com/join" defaultValue="https://community.yourstore.com/join" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium text-foreground">1,860</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />Copy Link
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <UserPlus className="w-3.5 h-3.5 mr-1" />Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
