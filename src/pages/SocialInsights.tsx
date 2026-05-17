import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle, Instagram, Facebook, Mail, Search, Send, Bot, Zap, UserPlus, AlertTriangle,
  ChevronRight, Phone, Users, CheckCircle, Clock, XCircle, Sparkles, Tag, Brain, RotateCcw, Ban, CalendarClock, Loader2,
  ShoppingCart, ArrowRight, Flame, ThermometerSun, Snowflake, Shield, Bell, Settings2, Play, GitBranch, User,
  TrendingUp, AlertCircle, Smile, Frown, Meh, Angry, ClipboardList, ListTodo,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { socialMessagesDb, alertsDb, customersDb, tasksDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';

type Channel = 'all' | 'instagram' | 'facebook' | 'whatsapp' | 'email' | 'marketplace';

const channelTabs: { id: Channel; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: MessageCircle },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
];

const statusColors: Record<string, string> = {
  unread: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  replied: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  escalated: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  ai_processing: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
};

const categoryConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new_lead: { label: 'New Lead', color: 'bg-emerald-500/10 text-emerald-600', icon: UserPlus },
  order_status: { label: 'Order Status', color: 'bg-blue-500/10 text-blue-600', icon: ShoppingCart },
  complaint: { label: 'Complaint', color: 'bg-rose-500/10 text-rose-600', icon: AlertTriangle },
  return: { label: 'Return', color: 'bg-orange-500/10 text-orange-600', icon: RotateCcw },
  follow_up: { label: 'Follow-up', color: 'bg-purple-500/10 text-purple-600', icon: CalendarClock },
  ignore: { label: 'Ignore', color: 'bg-muted text-muted-foreground', icon: Ban },
};

const leadQualColors: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  hot: { label: 'Hot Lead 🔥', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: Flame },
  warm: { label: 'Warm Lead', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: ThermometerSun },
  cold: { label: 'Cold Lead', color: 'bg-blue-400/10 text-blue-500 border-blue-400/30', icon: Snowflake },
  not_a_lead: { label: 'Not a Lead', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const sentimentConfig: Record<string, { icon: React.ElementType; color: string }> = {
  positive: { icon: Smile, color: 'text-emerald-500' },
  neutral: { icon: Meh, color: 'text-muted-foreground' },
  negative: { icon: Frown, color: 'text-amber-500' },
  angry: { icon: Angry, color: 'text-red-500' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-amber-500/10 text-amber-600',
  urgent: 'bg-red-500/10 text-red-600',
};

// Flow trigger configurations
const DEFAULT_FLOW_TRIGGERS = [
  { id: 'new_lead_hot', category: 'new_lead', qualification: 'hot', action: 'Auto-reply with catalog + Assign to sales team', enabled: true, autoReply: true, escalate: false },
  { id: 'new_lead_warm', category: 'new_lead', qualification: 'warm', action: 'Auto-reply with product info', enabled: true, autoReply: true, escalate: false },
  { id: 'new_lead_cold', category: 'new_lead', qualification: 'cold', action: 'Auto-reply with general info', enabled: true, autoReply: true, escalate: false },
  { id: 'order_status', category: 'order_status', qualification: 'not_a_lead', action: 'Auto-reply with order tracking', enabled: true, autoReply: true, escalate: false },
  { id: 'complaint', category: 'complaint', qualification: 'not_a_lead', action: 'Escalate to human + Alert', enabled: true, autoReply: false, escalate: true },
  { id: 'return', category: 'return', qualification: 'not_a_lead', action: 'Auto-reply with return policy + Flag for review', enabled: true, autoReply: true, escalate: true },
  { id: 'follow_up', category: 'follow_up', qualification: 'not_a_lead', action: 'Continue AI conversation', enabled: true, autoReply: true, escalate: false },
];

export default function SocialInsights() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel>('all');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [aiAutoReply, setAiAutoReply] = useState(true);
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState(50);
  const [flowTriggers, setFlowTriggers] = useState(DEFAULT_FLOW_TRIGGERS);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [manualReply, setManualReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await socialMessagesDb.getAll({
        channel: activeChannel !== 'all' ? activeChannel : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchQuery || undefined,
      });
      setMessages(data);
      if (data.length > 0 && !selectedMessage) setSelectedMessage(data[0]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMessages(); }, [activeChannel, searchQuery, categoryFilter]);

  const stats = useMemo(() => ({
    total: messages.length,
    unread: messages.filter(m => m.status === 'unread').length,
    pending: messages.filter(m => m.status === 'pending').length,
    replied: messages.filter(m => m.status === 'replied').length,
    escalated: messages.filter(m => m.status === 'escalated').length,
    newLeads: messages.filter(m => m.category === 'new_lead').length,
    autoReplied: messages.filter(m => m.auto_reply_triggered).length,
    lowConfidence: messages.filter(m => (m.ai_confidence || 0) * 100 < aiConfidenceThreshold).length,
  }), [messages, aiConfidenceThreshold]);

  // AI-powered message processing
  const processMessageWithAI = useCallback(async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    setProcessingId(msgId);
    try {
      const latestMessage = msg.preview || msg.subject || '';
      const { data, error } = await supabase.functions.invoke('inbox-auto-reply', {
        body: {
          message: latestMessage,
          sender: msg.sender,
          channel: msg.channel,
          conversation_history: msg.conversation_history || [],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const {
        category, confidence, can_handle, escalation_reason,
        suggested_reply, lead_qualification, priority, suggested_action, sentiment,
      } = data;

      // Find matching flow trigger
      const trigger = flowTriggers.find(t =>
        t.enabled && t.category === category &&
        (t.qualification === lead_qualification || t.qualification === 'not_a_lead')
      );

      // Build updates
      const updates: any = {
        category,
        ai_confidence: confidence,
        auto_reply_flow: suggested_action || null,
        task_category: priority || 'medium',
      };

      const newHistory = [...(msg.conversation_history || [])];

      // Determine if we should auto-reply or escalate
      if (!can_handle || confidence < (aiConfidenceThreshold / 100)) {
        // Cannot handle → escalate to human
        updates.status = 'escalated';
        updates.escalated_to = 'Human Agent';
        updates.human_replied = false;

        // Create alert for the team
        try {
          await alertsDb.create({
            title: `⚠️ Message requires human attention`,
            message: `From ${msg.sender} (${msg.channel}): "${latestMessage.substring(0, 100)}..." — ${escalation_reason || 'AI confidence too low'}`,
            severity: priority === 'urgent' ? 'critical' : 'warning',
            type: 'inbox_escalation',
            portal: msg.channel,
          });
        } catch (alertErr) { console.error('Alert creation failed:', alertErr); }

        toast({
          title: '🚨 Escalated to Human Agent',
          description: escalation_reason || `AI confidence (${Math.round(confidence * 100)}%) below threshold`,
          variant: 'destructive',
        });
      } else if (trigger?.autoReply && aiAutoReply && suggested_reply) {
        // Can handle + auto-reply enabled → send AI reply
        newHistory.push({
          role: 'customer',
          message: latestMessage,
          time: new Date().toLocaleTimeString(),
        });
        newHistory.push({
          role: 'ai',
          message: suggested_reply,
          time: new Date().toLocaleTimeString(),
        });
        updates.conversation_history = newHistory;
        updates.status = 'replied';
        updates.auto_reply_triggered = true;

        // Auto-save WhatsApp contacts as customers when classified as new leads
        if (msg.channel === 'whatsapp' && msg.sender_phone && category === 'new_lead' && !msg.saved_to_contacts) {
          try {
            const existing = await customersDb.getAll({ search: msg.sender_phone });
            const alreadyExists = (existing || []).some((c: any) => c.phone === msg.sender_phone);
            if (!alreadyExists) {
              await customersDb.create({
                name: msg.sender || 'WhatsApp Contact',
                phone: msg.sender_phone,
                channels: ['whatsapp'],
                source: 'whatsapp_inbox',
              });
            }
            updates.saved_to_contacts = true;
          } catch (saveErr) { console.error('Auto-save contact failed:', saveErr); }
        }

        // If trigger also wants escalation (like returns)
        if (trigger?.escalate) {
          updates.escalated_to = 'Review Queue';
          try {
            await alertsDb.create({
              title: `📋 Auto-replied but flagged for review`,
              message: `${category} from ${msg.sender}: AI replied but needs human review. Action: ${suggested_action}`,
              severity: 'info',
              type: 'inbox_review',
              portal: msg.channel,
            });
          } catch (alertErr) { console.error('Alert creation failed:', alertErr); }
        }

        toast({
          title: '✅ AI Auto-Reply Sent',
          description: `Category: ${categoryConfig[category]?.label || category} | Lead: ${lead_qualification} | Sentiment: ${sentiment}`,
        });
      } else {
        // Can handle but auto-reply disabled → keep pending with AI suggestion
        updates.status = 'pending';
        updates.auto_reply_flow = `Suggested: ${suggested_reply?.substring(0, 100)}...`;
        toast({
          title: '🤖 AI Classified',
          description: `${categoryConfig[category]?.label} — Reply ready for review`,
        });
      }

      await socialMessagesDb.update(msgId, updates);

      // Update local state immediately
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, ...updates, _aiResult: data } : m));
      if (selectedMessage?.id === msgId) {
        setSelectedMessage((prev: any) => prev ? { ...prev, ...updates, _aiResult: data } : prev);
      }
    } catch (err: any) {
      console.error('AI processing error:', err);
      toast({
        title: 'AI Processing Failed',
        description: err.message || 'Could not process message',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  }, [messages, selectedMessage, flowTriggers, aiAutoReply, aiConfidenceThreshold, toast]);

  // Process all unread messages
  const processAllUnread = async () => {
    const unread = messages.filter(m => m.status === 'unread');
    if (unread.length === 0) {
      toast({ title: 'No unread messages to process' });
      return;
    }
    for (const msg of unread) {
      await processMessageWithAI(msg.id);
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1500));
    }
    toast({ title: `✅ Processed ${unread.length} messages` });
  };

  // Manual reply
  const sendManualReply = async () => {
    if (!selectedMessage || !manualReply.trim()) return;
    setSendingReply(true);
    try {
      const newHistory = [...(selectedMessage.conversation_history || [])];
      newHistory.push({
        role: 'agent',
        message: manualReply.trim(),
        time: new Date().toLocaleTimeString(),
      });
      await socialMessagesDb.update(selectedMessage.id, {
        conversation_history: newHistory,
        status: 'replied',
        human_replied: true,
      });
      setManualReply('');
      setSelectedMessage((prev: any) => prev ? { ...prev, conversation_history: newHistory, status: 'replied', human_replied: true } : prev);
      toast({ title: 'Reply sent' });
      fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  };

  const escalateMessage = async (msgId: string) => {
    await socialMessagesDb.update(msgId, { status: 'escalated', escalated_to: 'Operations Manager' });
    try {
      const msg = messages.find(m => m.id === msgId);
      await alertsDb.create({
        title: '🔴 Manual Escalation',
        message: `Message from ${msg?.sender || 'Unknown'} manually escalated to Operations Manager`,
        severity: 'warning',
        type: 'inbox_escalation',
        portal: msg?.channel || 'unknown',
      });
    } catch (e) { console.error(e); }
    toast({ title: 'Escalated with notification alert' });
    fetchMessages();
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Unified Inbox</h1>
          <p className="text-muted-foreground">AI-powered auto-reply, lead qualification & flow triggers</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
            <Bot className="w-4 h-4 text-primary" />
            <Label className="text-xs font-medium">AI Auto-Reply</Label>
            <Switch checked={aiAutoReply} onCheckedChange={setAiAutoReply} />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Threshold: {aiConfidenceThreshold}%</span>
            <Slider value={[aiConfidenceThreshold]} onValueChange={v => setAiConfidenceThreshold(v[0])} min={10} max={95} step={5} className="w-20" />
          </div>
          <Button size="sm" variant="default" className="gap-1.5" onClick={processAllUnread} disabled={!!processingId}>
            <Play className="w-3.5 h-3.5" />Process All Unread
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: MessageCircle, color: 'text-foreground' },
          { label: 'Unread', value: stats.unread, icon: Mail, color: 'text-blue-500' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Replied', value: stats.replied, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Escalated', value: stats.escalated, icon: AlertTriangle, color: 'text-red-500' },
          { label: 'New Leads', value: stats.newLeads, icon: UserPlus, color: 'text-emerald-500' },
          { label: 'Auto-Replied', value: stats.autoReplied, icon: Zap, color: 'text-primary' },
          { label: 'Low Conf.', value: stats.lowConfidence, icon: Brain, color: 'text-amber-500' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5"><MessageCircle className="w-4 h-4" />Inbox</TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5"><GitBranch className="w-4 h-4" />Flow Triggers</TabsTrigger>
          <TabsTrigger value="ai-settings" className="gap-1.5"><Settings2 className="w-4 h-4" />AI Settings</TabsTrigger>
        </TabsList>

        {/* INBOX TAB */}
        <TabsContent value="inbox" className="space-y-4 mt-4">
          {/* Channel Tabs */}
          <div className="flex gap-2 flex-wrap">
            {channelTabs.map(ch => (
              <Button key={ch.id} variant={activeChannel === ch.id ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={() => setActiveChannel(ch.id)}>
                <ch.icon className="w-4 h-4" />{ch.label}
              </Button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Message List + Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-base">Messages ({messages.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[550px]">
                  {messages.map(msg => {
                    const catCfg = categoryConfig[msg.category] || categoryConfig.new_lead;
                    const CatIcon = catCfg.icon;
                    const isProcessing = processingId === msg.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        className={`p-3 border-b cursor-pointer hover:bg-muted/30 transition-colors ${selectedMessage?.id === msg.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''} ${isProcessing ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{msg.sender}</p>
                              {msg.status === 'unread' && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                              {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{msg.subject || msg.preview}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-[9px] h-4 px-1 ${catCfg.color}`}>
                                <CatIcon className="w-2.5 h-2.5 mr-0.5" />{catCfg.label}
                              </Badge>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1 ${statusColors[msg.status] || ''}`}>
                                {msg.status}
                              </Badge>
                              {msg.auto_reply_triggered && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-primary/10 text-primary">
                                  <Zap className="w-2.5 h-2.5 mr-0.5" />AI
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && <p className="text-center py-12 text-muted-foreground">No messages found</p>}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Detail Panel */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedMessage ? selectedMessage.sender : 'Select a message'}</CardTitle>
                    {selectedMessage && <CardDescription>{selectedMessage.subject || selectedMessage.preview}</CardDescription>}
                  </div>
                  {selectedMessage && (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5"
                      onClick={() => processMessageWithAI(selectedMessage.id)}
                      disabled={!!processingId}
                    >
                      {processingId === selectedMessage.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                      AI Process
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedMessage ? (
                  <div className="space-y-4">
                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={statusColors[selectedMessage.status] || ''}>{selectedMessage.status}</Badge>
                      <Badge variant="outline">{selectedMessage.channel}</Badge>
                      {selectedMessage.ai_confidence != null && (
                        <Badge variant="outline" className="gap-1">
                          <Brain className="w-3 h-3" />AI: {Math.round((selectedMessage.ai_confidence || 0) * 100)}%
                        </Badge>
                      )}
                      {selectedMessage.auto_reply_triggered && (
                        <Badge variant="outline" className="bg-primary/10 text-primary gap-1"><Zap className="w-3 h-3" />Auto-replied</Badge>
                      )}
                      {selectedMessage.escalated_to && (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 gap-1"><AlertTriangle className="w-3 h-3" />{selectedMessage.escalated_to}</Badge>
                      )}
                      {selectedMessage.human_replied && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 gap-1"><User className="w-3 h-3" />Human Replied</Badge>
                      )}
                    </div>

                    {/* AI Analysis Card (if processed) */}
                    {selectedMessage._aiResult && (
                      <Card className="border-primary/20">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">AI Analysis</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Category */}
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <p className="text-[10px] text-muted-foreground uppercase">Category</p>
                              <Badge className={`mt-1 ${categoryConfig[selectedMessage._aiResult.category]?.color || ''}`}>
                                {categoryConfig[selectedMessage._aiResult.category]?.label || selectedMessage._aiResult.category}
                              </Badge>
                            </div>
                            {/* Lead Qual */}
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <p className="text-[10px] text-muted-foreground uppercase">Lead</p>
                              <Badge className={`mt-1 ${leadQualColors[selectedMessage._aiResult.lead_qualification]?.color || ''}`}>
                                {leadQualColors[selectedMessage._aiResult.lead_qualification]?.label || selectedMessage._aiResult.lead_qualification}
                              </Badge>
                            </div>
                            {/* Sentiment */}
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <p className="text-[10px] text-muted-foreground uppercase">Sentiment</p>
                              {(() => {
                                const s = sentimentConfig[selectedMessage._aiResult.sentiment];
                                const SIcon = s?.icon || Meh;
                                return <div className={`mt-1 flex items-center justify-center gap-1 ${s?.color || ''}`}><SIcon className="w-4 h-4" /><span className="text-xs font-medium capitalize">{selectedMessage._aiResult.sentiment}</span></div>;
                              })()}
                            </div>
                            {/* Priority */}
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <p className="text-[10px] text-muted-foreground uppercase">Priority</p>
                              <Badge className={`mt-1 ${priorityColors[selectedMessage._aiResult.priority] || ''}`}>
                                {selectedMessage._aiResult.priority}
                              </Badge>
                            </div>
                          </div>
                          {selectedMessage._aiResult.suggested_action && (
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
                              <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              <p className="text-xs">{selectedMessage._aiResult.suggested_action}</p>
                            </div>
                          )}
                          {selectedMessage._aiResult.suggested_reply && !selectedMessage.auto_reply_triggered && (
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <p className="text-[10px] text-muted-foreground uppercase mb-1">Suggested Reply</p>
                              <p className="text-sm">{selectedMessage._aiResult.suggested_reply}</p>
                              <Button size="sm" className="mt-2 gap-1" onClick={async () => {
                                const newHistory = [...(selectedMessage.conversation_history || [])];
                                newHistory.push({ role: 'ai', message: selectedMessage._aiResult.suggested_reply, time: new Date().toLocaleTimeString() });
                                await socialMessagesDb.update(selectedMessage.id, { conversation_history: newHistory, status: 'replied', auto_reply_triggered: true });
                                toast({ title: 'Suggested reply sent' });
                                fetchMessages();
                              }}>
                                <Send className="w-3 h-3" />Send This Reply
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Task Category & Add to Task Manager */}
                    <Card className="border-dashed">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <ListTodo className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Message Action</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'done', label: 'Done', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle },
                            { value: 'follow_up', label: 'Follow-up', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: CalendarClock },
                            { value: 'additional_info', label: 'Additional Info Required', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: AlertCircle },
                            { value: 'ignore', label: 'Ignore', color: 'bg-muted text-muted-foreground', icon: Ban },
                          ].map(opt => {
                            const OptIcon = opt.icon;
                            const isActive = selectedMessage.task_category === opt.value;
                            return (
                              <Button
                                key={opt.value}
                                size="sm"
                                variant={isActive ? 'default' : 'outline'}
                                className={`gap-1.5 text-xs ${!isActive ? opt.color : ''}`}
                                onClick={async () => {
                                  await socialMessagesDb.update(selectedMessage.id, { task_category: opt.value });
                                  setSelectedMessage((prev: any) => prev ? { ...prev, task_category: opt.value } : prev);
                                  setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, task_category: opt.value } : m));
                                  toast({ title: `Marked as ${opt.label}` });
                                }}
                              >
                                <OptIcon className="w-3 h-3" />{opt.label}
                              </Button>
                            );
                          })}
                        </div>
                        {!selectedMessage.converted_to_task && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 w-full border-primary/30 text-primary hover:bg-primary/5"
                            onClick={async () => {
                              try {
                                const taskCategory = selectedMessage.task_category || 'follow_up';
                                const priorityMap: Record<string, string> = { done: 'low', follow_up: 'medium', additional_info: 'high', ignore: 'low' };
                                await tasksDb.create({
                                  title: `[Inbox] ${selectedMessage.sender} — ${categoryConfig[selectedMessage.category]?.label || selectedMessage.category}`,
                                  description: `Channel: ${selectedMessage.channel}\nMessage: ${selectedMessage.preview || selectedMessage.subject || ''}\nAction: ${taskCategory}\nPhone: ${selectedMessage.sender_phone || 'N/A'}`,
                                  priority: priorityMap[taskCategory] || 'medium',
                                  status: taskCategory === 'done' ? 'completed' : 'pending',
                                  portal: selectedMessage.channel,
                                });
                                await socialMessagesDb.update(selectedMessage.id, { converted_to_task: true });
                                setSelectedMessage((prev: any) => prev ? { ...prev, converted_to_task: true } : prev);
                                setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, converted_to_task: true } : m));
                                toast({ title: '✅ Added to Task Manager', description: `Task created for ${selectedMessage.sender}` });
                              } catch (err: any) {
                                console.error('Create task error:', err);
                                toast({ title: 'Failed to create task', description: err.message, variant: 'destructive' });
                              }
                            }}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />Add to Task Manager
                          </Button>
                        )}
                        {selectedMessage.converted_to_task && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />Already added to Task Manager
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Conversation History */}
                    <ScrollArea className="h-[250px] border rounded-lg p-4">
                      {(selectedMessage.conversation_history || []).map((entry: any, i: number) => (
                        <div key={i} className={`mb-3 flex ${entry.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                            entry.role === 'customer' ? 'bg-muted' :
                            entry.role === 'ai' ? 'bg-primary/10 text-primary border border-primary/20' :
                            'bg-blue-500/10 text-blue-700 border border-blue-500/20'
                          }`}>
                            <p className="text-[10px] font-semibold mb-1 uppercase flex items-center gap-1">
                              {entry.role === 'ai' && <Bot className="w-2.5 h-2.5" />}
                              {entry.role === 'agent' && <User className="w-2.5 h-2.5" />}
                              {entry.role}
                            </p>
                            <p>{entry.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{entry.time}</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedMessage.conversation_history || selectedMessage.conversation_history.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">No conversation history</p>
                      )}
                    </ScrollArea>

                    {/* Reply + Actions */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type a reply..."
                        value={manualReply}
                        onChange={e => setManualReply(e.target.value)}
                        className="min-h-[60px]"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendManualReply(); } }}
                      />
                      <div className="flex flex-col gap-1.5">
                        <Button size="sm" className="gap-1" onClick={sendManualReply} disabled={sendingReply || !manualReply.trim()}>
                          <Send className="w-3 h-3" />Send
                        </Button>
                        {selectedMessage.status !== 'escalated' && (
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => escalateMessage(selectedMessage.id)}>
                            <Bell className="w-3 h-3" />Escalate
                          </Button>
                        )}
                        {selectedMessage.channel === 'whatsapp' && selectedMessage.sender_phone && !selectedMessage.saved_to_contacts && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={async () => {
                            try {
                              // Check if customer with this phone already exists
                              const existing = await customersDb.getAll({ search: selectedMessage.sender_phone });
                              const alreadyExists = (existing || []).some((c: any) => c.phone === selectedMessage.sender_phone);
                              if (!alreadyExists) {
                                await customersDb.create({
                                  name: selectedMessage.sender || 'WhatsApp Contact',
                                  phone: selectedMessage.sender_phone,
                                  channels: ['whatsapp'],
                                  source: 'whatsapp_inbox',
                                });
                              }
                              await socialMessagesDb.update(selectedMessage.id, { saved_to_contacts: true });
                              setSelectedMessage((prev: any) => prev ? { ...prev, saved_to_contacts: true } : prev);
                              toast({ title: alreadyExists ? 'Contact already exists' : '✅ Saved to Customer List', description: `${selectedMessage.sender_phone} added as WhatsApp contact` });
                              fetchMessages();
                            } catch (err: any) {
                              console.error('Save contact error:', err);
                              toast({ title: 'Failed to save contact', description: err.message, variant: 'destructive' });
                            }
                          }}>
                            <Phone className="w-3 h-3" />Save to Customers
                          </Button>
                        )}
                        {selectedMessage.sender_phone && !selectedMessage.saved_to_contacts && selectedMessage.channel !== 'whatsapp' && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={async () => {
                            await socialMessagesDb.update(selectedMessage.id, { saved_to_contacts: true });
                            toast({ title: 'Contact Saved' });
                            fetchMessages();
                          }}>
                            <Phone className="w-3 h-3" />Save
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">Select a message to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FLOW TRIGGERS TAB */}
        <TabsContent value="flows" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><GitBranch className="w-5 h-5 text-primary" />Message Flow Triggers</CardTitle>
              <CardDescription>Configure automated actions for each message category. When AI classifies an incoming message, the matching flow trigger fires.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Flow Diagram */}
              <Card className="border-dashed border-primary/30">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-primary uppercase mb-3">How It Works</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge variant="outline" className="gap-1"><MessageCircle className="w-3 h-3" />Incoming Message</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className="gap-1 bg-primary/10 text-primary"><Brain className="w-3 h-3" />AI Classification</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className="gap-1"><Tag className="w-3 h-3" />Category + Lead Qual</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600"><GitBranch className="w-3 h-3" />Flow Trigger</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="flex gap-1">
                      <Badge variant="outline" className="gap-1"><Zap className="w-3 h-3" />Auto-Reply</Badge>
                      <span className="text-muted-foreground">or</span>
                      <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-600"><Bell className="w-3 h-3" />Escalate + Alert</Badge>
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {flowTriggers.map((trigger, idx) => {
                const catCfg = categoryConfig[trigger.category];
                const CatIcon = catCfg?.icon || MessageCircle;
                const qualCfg = leadQualColors[trigger.qualification];
                return (
                  <div key={trigger.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                    <Switch
                      checked={trigger.enabled}
                      onCheckedChange={v => {
                        setFlowTriggers(prev => prev.map((t, i) => i === idx ? { ...t, enabled: v } : t));
                      }}
                    />
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <CatIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{catCfg?.label || trigger.category}</span>
                    </div>
                    {trigger.qualification !== 'not_a_lead' && qualCfg && (
                      <Badge variant="outline" className={`${qualCfg.color} text-[10px]`}>
                        {qualCfg.label}
                      </Badge>
                    )}
                    <div className="flex-1 text-sm text-muted-foreground">{trigger.action}</div>
                    <div className="flex items-center gap-2">
                      {trigger.autoReply && (
                        <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] gap-0.5">
                          <Zap className="w-2.5 h-2.5" />Auto-Reply
                        </Badge>
                      )}
                      {trigger.escalate && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 text-[10px] gap-0.5">
                          <Bell className="w-2.5 h-2.5" />Escalate
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI SETTINGS TAB */}
        <TabsContent value="ai-settings" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Bot className="w-5 h-5 text-primary" />AI Auto-Reply Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable AI Auto-Reply</Label>
                    <p className="text-xs text-muted-foreground">AI will automatically reply to qualifying messages</p>
                  </div>
                  <Switch checked={aiAutoReply} onCheckedChange={setAiAutoReply} />
                </div>
                <Separator />
                <div>
                  <Label className="font-medium">Confidence Threshold: {aiConfidenceThreshold}%</Label>
                  <p className="text-xs text-muted-foreground mb-3">Messages below this confidence are escalated to humans</p>
                  <Slider value={[aiConfidenceThreshold]} onValueChange={v => setAiConfidenceThreshold(v[0])} min={10} max={95} step={5} />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>10% (More auto-replies)</span>
                    <span>95% (Stricter, more escalations)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Escalation Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Angry customer sentiment', desc: 'Auto-escalate when AI detects angry tone', enabled: true },
                  { label: 'Refund requests', desc: 'Flag all refund requests for human review', enabled: true },
                  { label: 'Complex complaints', desc: 'Multi-issue complaints go to senior staff', enabled: true },
                  { label: 'High-value leads', desc: 'Hot leads notified to sales team immediately', enabled: true },
                  { label: 'Low AI confidence', desc: `Below ${aiConfidenceThreshold}% triggers escalation`, enabled: true },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      <p className="text-[10px] text-muted-foreground">{rule.desc}</p>
                    </div>
                    <Switch defaultChecked={rule.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />AI Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Auto-Reply Rate', value: stats.total > 0 ? Math.round((stats.autoReplied / stats.total) * 100) : 0, suffix: '%', color: 'text-primary' },
                    { label: 'Escalation Rate', value: stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0, suffix: '%', color: 'text-amber-500' },
                    { label: 'Lead Capture Rate', value: stats.total > 0 ? Math.round((stats.newLeads / stats.total) * 100) : 0, suffix: '%', color: 'text-emerald-500' },
                    { label: 'Avg Response Time', value: '<', suffix: '30s', color: 'text-primary' },
                  ].map((metric, i) => (
                    <div key={i} className="text-center p-4 rounded-lg border">
                      <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}{metric.suffix}</p>
                      <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
