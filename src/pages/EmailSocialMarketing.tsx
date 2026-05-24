import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { broadcastsDb, socialMessagesDb } from '@/services/database';
import {
  Mail, Send, Plus, Eye, Clock, CheckCircle2, XCircle, Users, BarChart3,
  Instagram, Facebook, Store, Sparkles, Target, TrendingUp, MessageCircle,
  Calendar, Image, FileText, Megaphone, PenTool, Layers, ArrowUpRight
} from 'lucide-react';

type CampaignRow = {
  id: string | number;
  name: string;
  subject?: string;
  status: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  date: string;
  template: string;
};

type SocialRow = {
  id: string | number;
  platform: 'instagram' | 'facebook' | 'gmb';
  name: string;
  type: string;
  status: string;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  spend: number;
  date: string;
};

type WhatsAppRow = {
  id: string | number;
  name: string;
  template: string;
  audience: string;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  date: string;
  status: string;
};

const mapBroadcast = (row: any): CampaignRow => ({
  id: row.id,
  name: row.title || row.subject || row.name || row.channel || 'Broadcast',
  subject: row.preview || row.subject || row.content || '',
  status: row.status || 'sent',
  sent: Number(row.sent_count ?? row.sent ?? 0),
  opened: Number(row.opened_count ?? row.opened ?? 0),
  clicked: Number(row.clicked_count ?? row.clicked ?? 0),
  bounced: Number(row.bounced_count ?? row.bounced ?? 0),
  date: row.created_at ? String(row.created_at).slice(0, 10) : '',
  template: row.template || row.type || row.channel || 'broadcast',
});

const mapSocialMessage = (row: any): SocialRow => ({
  id: row.id,
  platform: (row.channel === 'facebook' || row.channel === 'instagram' || row.channel === 'gmb') ? row.channel : 'facebook',
  name: row.subject || row.preview || row.sender || 'Social message',
  type: row.category || row.task_category || row.auto_reply_flow || 'message',
  status: row.status || 'sent',
  reach: Number(row.reach ?? row.views ?? 0),
  engagement: Number(row.ai_confidence ?? 0) || (row.human_replied ? 1.0 : 0),
  likes: Number(row.likes ?? 0),
  comments: Number(row.comments ?? 0),
  shares: Number(row.shares ?? 0),
  spend: Number(row.spend ?? 0),
  date: row.created_at ? String(row.created_at).slice(0, 10) : '',
});

const mapWhatsApp = (row: any): WhatsAppRow => ({
  id: row.id,
  name: row.subject || row.preview || row.sender || 'WhatsApp message',
  template: row.auto_reply_flow || row.category || 'whatsapp',
  audience: row.task_category || row.escalated_to || 'Audience',
  sent: Number(row.sent ?? 0),
  delivered: Number(row.delivered ?? 0),
  read: Number(row.read ?? 0),
  replied: Number(row.replied ?? (row.human_replied ? 1 : 0)),
  date: row.created_at ? String(row.created_at).slice(0, 10) : '',
  status: row.status || 'sent',
});

const statusStyle: Record<string, string> = {
  sent: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  active: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  scheduled: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  completed: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
};

const platformIcon: Record<string, React.ElementType> = { instagram: Instagram, facebook: Facebook, gmb: Store };
const platformColor: Record<string, string> = { instagram: 'text-pink-500', facebook: 'text-blue-600', gmb: 'text-emerald-600' };

export default function EmailSocialMarketing() {
  const { toast } = useToast();
  const [emailCampaigns, setEmailCampaigns] = useState<CampaignRow[]>([]);
  const [socialCampaigns, setSocialCampaigns] = useState<SocialRow[]>([]);
  const [whatsappCampaigns, setWhatsAppCampaigns] = useState<WhatsAppRow[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ broadcastsDb, socialMessagesDb }] = await Promise.all([import('@/services/database')]);
        const [broadcasts, messages] = await Promise.all([
          broadcastsDb.getAll(50).catch(() => []),
          socialMessagesDb.getAll({ limit: 200 }).catch(() => []),
        ]);
        if (!mounted) return;
        setEmailCampaigns((broadcasts || []).map(mapBroadcast));
        const socials = (messages || []).filter((row: any) => ['facebook', 'instagram', 'gmb'].includes(String(row.channel || '').toLowerCase())).map(mapSocialMessage);
        const whatsapp = (messages || []).filter((row: any) => String(row.channel || '').toLowerCase() === 'whatsapp').map(mapWhatsApp);
        setSocialCampaigns(socials);
        setWhatsAppCampaigns(whatsapp);
      } catch (error) {
        console.error('Failed to load marketing data', error);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const totalEmailsSent = useMemo(() => emailCampaigns.reduce((s, c) => s + c.sent, 0), [emailCampaigns]);
  const totalOpened = useMemo(() => emailCampaigns.reduce((s, c) => s + c.opened, 0), [emailCampaigns]);
  const totalClicked = useMemo(() => emailCampaigns.reduce((s, c) => s + c.clicked, 0), [emailCampaigns]);
  const openRate = totalEmailsSent > 0 ? ((totalOpened / totalEmailsSent) * 100).toFixed(1) : '0';
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

  const totalSocialReach = useMemo(() => socialCampaigns.reduce((s, c) => s + c.reach, 0), [socialCampaigns]);
  const totalSocialSpend = useMemo(() => socialCampaigns.reduce((s, c) => s + c.spend, 0), [socialCampaigns]);
  const avgEngagement = useMemo(() => {
    const engaging = socialCampaigns.filter(c => c.engagement > 0);
    return engaging.length ? (engaging.reduce((s, c) => s + c.engagement, 0) / engaging.length).toFixed(1) : '0';
  }, [socialCampaigns]);

  const totalWASent = useMemo(() => whatsappCampaigns.reduce((s, c) => s + c.sent, 0), [whatsappCampaigns]);
  const totalWARead = useMemo(() => whatsappCampaigns.reduce((s, c) => s + c.read, 0), [whatsappCampaigns]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Hub</h1>
          <p className="text-muted-foreground">Email campaigns, WhatsApp broadcasts & social media marketing</p>
        </div>
        <Button className="gap-1.5"><Plus className="w-4 h-4" />Create Campaign</Button>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="flex-wrap">
          <TabsTrigger value="email" className="gap-1.5"><Mail className="w-4 h-4" />Email Marketing</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5"><MessageCircle className="w-4 h-4" />WhatsApp Marketing</TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5"><Instagram className="w-4 h-4" />Social Media Ads</TabsTrigger>
        </TabsList>

        {/* Email Marketing Tab */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{totalEmailsSent.toLocaleString()}</p><p className="text-xs text-muted-foreground">Emails Sent</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{openRate}%</p><p className="text-xs text-muted-foreground">Open Rate</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">{clickRate}%</p><p className="text-xs text-muted-foreground">Click Rate</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{emailCampaigns.filter(c => c.status === 'active').length}</p><p className="text-xs text-muted-foreground">Active Automations</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-rose-600">{emailCampaigns.reduce((s, c) => s + c.bounced, 0)}</p><p className="text-xs text-muted-foreground">Total Bounced</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Email Campaigns</CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5"><Plus className="w-4 h-4" />New Campaign</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Campaign</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Sent</TableHead>
                    <TableHead className="font-semibold">Opened</TableHead>
                    <TableHead className="font-semibold">Clicked</TableHead>
                    <TableHead className="font-semibold">Open Rate</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailCampaigns.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No email campaigns yet</TableCell></TableRow>}
                  {emailCampaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p></div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{c.template}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={`capitalize ${statusStyle[c.status]}`}>{c.status}</Badge></TableCell>
                      <TableCell>{c.sent.toLocaleString()}</TableCell>
                      <TableCell>{c.opened.toLocaleString()}</TableCell>
                      <TableCell>{c.clicked.toLocaleString()}</TableCell>
                      <TableCell>
                        {c.sent > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress value={(c.opened / c.sent) * 100} className="h-2 w-16" />
                            <span className="text-xs font-medium">{((c.opened / c.sent) * 100).toFixed(0)}%</span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.date || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Email Templates Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Layers className="w-5 h-5 text-primary" />Email Templates</CardTitle>
              <CardDescription>Pre-built templates for different campaign types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'Promotional Sale', desc: 'Bold layout with CTA for flash sales & discounts', uses: 45, type: 'promotional' },
                  { name: 'Product Newsletter', desc: 'Weekly digest with product highlights & news', uses: 32, type: 'newsletter' },
                  { name: 'Cart Recovery', desc: 'Automated reminder for abandoned carts', uses: 28, type: 'automated' },
                  { name: 'Welcome Series', desc: 'Onboarding emails for new subscribers', uses: 56, type: 'automated' },
                  { name: 'Order Confirmation', desc: 'Transactional email with order details', uses: 120, type: 'transactional' },
                  { name: 'Feedback Request', desc: 'Post-purchase review & rating request', uses: 38, type: 'transactional' },
                ].map((t, i) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{t.name}</h4>
                        <Badge variant="secondary" className="text-[10px]">{t.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{t.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t.uses} times used</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Eye className="w-3 h-3" />Preview</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Marketing Tab */}
        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{totalWASent.toLocaleString()}</p><p className="text-xs text-muted-foreground">Messages Sent</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{totalWARead.toLocaleString()}</p><p className="text-xs text-muted-foreground">Read</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">{totalWASent > 0 ? ((totalWARead / totalWASent) * 100).toFixed(0) : 0}%</p><p className="text-xs text-muted-foreground">Read Rate</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{whatsappCampaigns.filter(c => c.status === 'scheduled').length}</p><p className="text-xs text-muted-foreground">Scheduled</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{whatsappCampaigns.reduce((s, c) => s + c.replied, 0)}</p><p className="text-xs text-muted-foreground">Replies</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">WhatsApp Broadcast Campaigns</CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5"><Plus className="w-4 h-4" />New Broadcast</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Campaign</TableHead>
                    <TableHead className="font-semibold">Template</TableHead>
                    <TableHead className="font-semibold">Audience</TableHead>
                    <TableHead className="font-semibold">Sent</TableHead>
                    <TableHead className="font-semibold">Delivered</TableHead>
                    <TableHead className="font-semibold">Read</TableHead>
                    <TableHead className="font-semibold">Replied</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whatsappCampaigns.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No WhatsApp campaigns yet</TableCell></TableRow>}
                  {whatsappCampaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs font-mono">{c.template}</Badge></TableCell>
                      <TableCell className="text-sm">{c.audience}</TableCell>
                      <TableCell>{c.sent.toLocaleString()}</TableCell>
                      <TableCell>{c.delivered.toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600 font-medium">{c.read.toLocaleString()}</TableCell>
                      <TableCell>{c.replied}</TableCell>
                      <TableCell><Badge variant="outline" className={`capitalize ${statusStyle[c.status]}`}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Ads Tab */}
        <TabsContent value="social" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{(totalSocialReach / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Total Reach</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{avgEngagement}%</p><p className="text-xs text-muted-foreground">Avg Engagement</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">₹{totalSocialSpend.toLocaleString()}</p><p className="text-xs text-muted-foreground">Ad Spend</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{socialCampaigns.filter(c => c.status === 'active').length}</p><p className="text-xs text-muted-foreground">Active Ads</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{socialCampaigns.length}</p><p className="text-xs text-muted-foreground">Total Campaigns</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Social Media Campaigns</CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5"><Plus className="w-4 h-4" />New Ad Campaign</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Campaign</TableHead>
                    <TableHead className="font-semibold">Platform</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Reach</TableHead>
                    <TableHead className="font-semibold">Engagement</TableHead>
                    <TableHead className="font-semibold">Spend</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {socialCampaigns.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No social campaigns yet</TableCell></TableRow>}
                  {socialCampaigns.map(c => {
                    const Icon = platformIcon[c.platform] || Store;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${platformColor[c.platform]}`} />
                            <span className="text-sm capitalize">{c.platform === 'gmb' ? 'GMB' : c.platform}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{c.type}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={`capitalize ${statusStyle[c.status]}`}>{c.status}</Badge></TableCell>
                        <TableCell>{c.reach > 0 ? `${(c.reach / 1000).toFixed(1)}K` : '—'}</TableCell>
                        <TableCell>
                          {c.engagement > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{c.engagement}%</span>
                              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{c.spend > 0 ? `₹${c.spend.toLocaleString()}` : 'Organic'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.date}</TableCell>
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
