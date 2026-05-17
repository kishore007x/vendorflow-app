import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, Brain, Workflow, Lock, Sparkles, FolderOpen, Zap, BarChart3, Package, RotateCcw, CreditCard, Users, Bell, Star, ThumbsDown, Search, Bot, Send, Loader2, User, Plus, Trash2, History, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { chatConversationsDb, automationSettingsDb } from '@/services/database';

interface AutomationFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  status: 'active' | 'beta' | 'coming';
}

const defaultFeatures: AutomationFeature[] = [
  { id: 'auto-restock', name: 'Auto Restock Alerts', description: 'Automatically trigger alerts when inventory drops below threshold', icon: Package, enabled: true, status: 'active' },
  { id: 'smart-pricing', name: 'Smart Pricing Engine', description: 'AI-driven dynamic pricing recommendations across channels', icon: Zap, enabled: true, status: 'active' },
  { id: 'order-routing', name: 'Intelligent Order Routing', description: 'Route orders to nearest warehouse for faster delivery', icon: Workflow, enabled: false, status: 'beta' },
  { id: 'return-analysis', name: 'Return Pattern Analysis', description: 'Identify return-prone products and suggest preventive actions', icon: RotateCcw, enabled: true, status: 'active' },
  { id: 'settlement-tracker', name: 'Settlement Discrepancy Detector', description: 'Automatically flag settlement mismatches and delayed payments', icon: CreditCard, enabled: true, status: 'active' },
  { id: 'vendor-scoring', name: 'Vendor Performance Scoring', description: 'AI-generated vendor performance scores and recommendations', icon: Users, enabled: false, status: 'beta' },
  { id: 'demand-forecast', name: 'Demand Forecasting', description: 'Predict SKU-level demand using historical data and trends', icon: BarChart3, enabled: true, status: 'active' },
  { id: 'anomaly-detection', name: 'Anomaly Detection', description: 'Detect unusual patterns in orders, returns, and settlements', icon: Bell, enabled: false, status: 'beta' },
];

// Review, feedback, and keyword insights should come from real data sources.
// Review, feedback, and keyword insights should come from real data sources.

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({ messages, onDelta, onDone, onError }: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    onError(errData.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }
  onDone();
}

export default function AIChatbot() {
  const { toast } = useToast();
  const [features, setFeatures] = useState(defaultFeatures);
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  // Review / feedback / keywords state (moved from module scope to avoid invalid hook calls)
  const [reviews, setReviews] = useState<any[]>([]);
  const [negativeFeedback, setNegativeFeedback] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chat history
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // AI Insights state
  const [insightLoading, setInsightLoading] = useState<string | null>(null);
  const [insightResults, setInsightResults] = useState<Record<string, string>>({});

  // Load chat history & automation settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [convs, settings] = await Promise.all([
          chatConversationsDb.getAll(),
          automationSettingsDb.getAll(),
        ]);
        setConversations(convs);
        if (settings.length > 0) {
          setFeatures(prev => prev.map(f => {
            const saved = settings.find((s: any) => s.feature_id === f.id);
            return saved ? { ...f, enabled: saved.enabled } : f;
          }));
        }
        setFeaturesLoaded(true);
      } catch (e) {
        console.error(e);
        setFeaturesLoaded(true);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadData();
  }, []);

  // Load reviews/feedback/keywords from DB if available
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const [r, f, k] = await Promise.all([
          db.reviewsDb.getAll(20).catch(() => []),
          db.feedbackDb.getAll(50).catch(() => []),
          db.keywordsDb.getAll(100).catch(() => []),
        ]);
        if (mounted) {
          setReviews(r || []);
          setNegativeFeedback(f || []);
          setKeywords(k || []);
        }
      } catch (e) {
        console.debug('reviews/feedback/keywords fetch failed:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  // Auto-save conversation after each assistant reply
  useEffect(() => {
    if (isStreaming || chatMessages.length === 0) return;
    const save = async () => {
      try {
        const title = chatMessages[0]?.content?.slice(0, 60) || 'New Chat';
        if (activeConvId) {
          await chatConversationsDb.update(activeConvId, { messages: chatMessages, title });
          setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, messages: chatMessages, title, updated_at: new Date().toISOString() } : c));
        } else {
          const created: any = await chatConversationsDb.create(title, chatMessages);
          setActiveConvId(created.id);
          setConversations(prev => [created, ...prev]);
        }
      } catch (e) { console.error('Failed to save chat:', e); }
    };
    save();
  }, [isStreaming]);

  const startNewChat = () => {
    setChatMessages([]);
    setActiveConvId(null);
  };

  const loadConversation = (conv: any) => {
    setChatMessages(conv.messages || []);
    setActiveConvId(conv.id);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatConversationsDb.delete(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) { setChatMessages([]); setActiveConvId(null); }
      toast({ title: 'Chat deleted' });
    } catch (err) { console.error(err); }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsStreaming(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...chatMessages, userMsg],
        onDelta: upsertAssistant,
        onDone: () => setIsStreaming(false),
        onError: (err) => {
          toast({ title: 'AI Error', description: err, variant: 'destructive' });
          setIsStreaming(false);
        },
      });
    } catch (e) {
      console.error(e);
      setIsStreaming(false);
    }
  };

  const runInsight = async (type: string) => {
    setInsightLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: {
          type,
          data: type === 'smart-pricing'
            ? { products: ['Wireless Earbuds Pro - ₹2499 on Amazon, ₹2299 on Flipkart', 'Cotton T-Shirt - ₹749 on Meesho, ₹899 on Myntra'], portals: ['Amazon', 'Flipkart', 'Meesho', 'Myntra'] }
            : type === 'demand-forecast'
            ? { topSKUs: ['SKU-EAR-001 - 120 units/month', 'SKU-TSH-042 - 85 units/month'], season: 'March 2026', inventoryLevels: 'Low on earbuds, adequate on apparel' }
            : { returns: ['25% return rate on electronics', '8% on apparel', 'Top reason: size mismatch (34%), damaged (22%)'] },
        },
      });
      if (error) throw error;
      setInsightResults(prev => ({ ...prev, [type]: data.insight }));
    } catch (e: any) {
      toast({ title: 'Insight Error', description: e.message || 'Failed to generate insight', variant: 'destructive' });
    } finally {
      setInsightLoading(null);
    }
  };

  const toggleFeature = async (id: string) => {
    const feature = features.find(f => f.id === id);
    if (feature?.status === 'coming') {
      toast({ title: 'Coming Soon', description: `${feature.name} is planned for a future release.` });
      return;
    }
    const newEnabled = !feature?.enabled;
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled: newEnabled } : f));
    toast({ title: newEnabled ? 'Feature Enabled' : 'Feature Disabled', description: `${feature?.name} has been ${newEnabled ? 'enabled' : 'disabled'}.` });

    try {
      await automationSettingsDb.upsert(id, newEnabled);
    } catch (e) { console.error('Failed to persist toggle:', e); }
  };

  const activeCount = features.filter(f => f.enabled).length;

  const quickQuestions = [
    "What are my top-selling products?",
    "How to reduce return rates?",
    "Explain settlement reconciliation",
    "Tips for multi-portal pricing",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI & Automation Hub</h1>
          <p className="text-muted-foreground">Manage intelligent automation features — Admin only</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">{activeCount} Active</Badge>
          <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" />Admin Only</Badge>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">✔ AI Live</Badge>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">💬 Chat</TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">🧠 Insights</TabsTrigger>
          <TabsTrigger value="auto-response" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">⚡ Auto Response</TabsTrigger>
          <TabsTrigger value="knowledge" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">📚 Knowledge Base</TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">Overview</TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">Reviews</TabsTrigger>
          <TabsTrigger value="feedback" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">Feedback</TabsTrigger>
          <TabsTrigger value="keywords" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">Keywords</TabsTrigger>
        </TabsList>

        {/* AI Chat Tab with History */}
        <TabsContent value="chat" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Chat History Sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5"><History className="w-4 h-4" />History</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startNewChat}><Plus className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[520px]">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : conversations.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">No chat history yet</p>
                  ) : (
                    conversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversation(conv)}
                        className={`px-3 py-2.5 border-b cursor-pointer hover:bg-muted/30 transition-colors group ${activeConvId === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{conv.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(conv.updated_at).toLocaleDateString()}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => deleteConversation(conv.id, e)}>
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-3 flex flex-col h-[600px]">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10"><Bot className="w-5 h-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-base">VendorFlow AI Assistant</CardTitle>
                    <CardDescription className="text-xs">Powered by AI • Ask anything about your business</CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-auto bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">Online</Badge>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12 space-y-4">
                      <Sparkles className="w-12 h-12 text-primary/30 mx-auto" />
                      <div>
                        <p className="font-medium text-foreground">Welcome to VendorFlow AI</p>
                        <p className="text-sm text-muted-foreground mt-1">Ask me anything about your orders, inventory, returns, or pricing strategy.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                        {quickQuestions.map((q, i) => (
                          <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => setChatInput(q)}>{q}</Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && <div className="p-1.5 rounded-lg bg-primary/10 h-fit shrink-0"><Bot className="w-4 h-4 text-primary" /></div>}
                      <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 border'}`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : <p className="text-sm">{msg.content}</p>}
                      </div>
                      {msg.role === 'user' && <div className="p-1.5 rounded-lg bg-primary h-fit shrink-0"><User className="w-4 h-4 text-primary-foreground" /></div>}
                    </div>
                  ))}
                  {isStreaming && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
                    <div className="flex gap-3">
                      <div className="p-1.5 rounded-lg bg-primary/10 h-fit"><Bot className="w-4 h-4 text-primary" /></div>
                      <div className="bg-muted/50 border rounded-xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <Input placeholder="Ask about orders, inventory, pricing..." value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isStreaming} className="flex-1" />
                  <Button type="submit" disabled={isStreaming || !chatInput.trim()} size="icon">
                    {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'smart-pricing', title: 'Smart Pricing', desc: 'Get AI-driven pricing recommendations', icon: Zap, color: 'text-amber-600' },
              { type: 'demand-forecast', title: 'Demand Forecast', desc: 'Predict SKU-level demand trends', icon: BarChart3, color: 'text-blue-600' },
              { type: 'return-analysis', title: 'Return Analysis', desc: 'Analyze return patterns & causes', icon: RotateCcw, color: 'text-rose-600' },
            ].map(item => (
              <Card key={item.type}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={() => runInsight(item.type)} disabled={insightLoading === item.type} className="w-full gap-2" variant="outline">
                    {insightLoading === item.type ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4" />Generate Insight</>}
                  </Button>
                  {insightResults[item.type] && (
                    <div className="p-3 rounded-lg bg-muted/50 border max-h-64 overflow-y-auto">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{insightResults[item.type]}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Auto Response Tab */}
        <TabsContent value="auto-response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" />AI Auto-Response Configuration</CardTitle>
              <CardDescription>Configure automatic AI replies for different channels and message types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { channel: 'WhatsApp', enabled: true, responseTime: '< 30 seconds', rules: 12, accuracy: 94 },
                  { channel: 'Instagram DM', enabled: true, responseTime: '< 1 minute', rules: 8, accuracy: 89 },
                  { channel: 'Facebook Messenger', enabled: false, responseTime: 'N/A', rules: 5, accuracy: 0 },
                  { channel: 'Email', enabled: true, responseTime: '< 5 minutes', rules: 15, accuracy: 92 },
                ].map(ch => (
                  <Card key={ch.channel} className={ch.enabled ? 'border-primary/30 bg-primary/5' : 'opacity-60'}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm">{ch.channel}</h4>
                        <Switch defaultChecked={ch.enabled} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-lg font-bold">{ch.rules}</p><p className="text-[10px] text-muted-foreground">Rules</p></div>
                        <div><p className="text-lg font-bold">{ch.responseTime}</p><p className="text-[10px] text-muted-foreground">Response Time</p></div>
                        <div><p className="text-lg font-bold">{ch.accuracy ? `${ch.accuracy}%` : '—'}</p><p className="text-[10px] text-muted-foreground">Accuracy</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Auto-Response Rules</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { trigger: 'Order status inquiry', response: 'Fetch order status from DB and respond with tracking info', priority: 'high', active: true },
                    { trigger: 'Return/refund request', response: 'Provide return policy and initiate return process', priority: 'high', active: true },
                    { trigger: 'Product inquiry', response: 'Share product details, pricing, and availability', priority: 'medium', active: true },
                    { trigger: 'Bulk order request', response: 'Escalate to sales team with customer details', priority: 'high', active: true },
                    { trigger: 'Payment issue', response: 'Verify payment status and provide resolution steps', priority: 'high', active: true },
                    { trigger: 'General greeting', response: 'Friendly welcome message with quick action buttons', priority: 'low', active: true },
                    { trigger: 'Complaint/negative feedback', response: 'Acknowledge, apologize, and escalate to human agent', priority: 'critical', active: true },
                    { trigger: 'Out of stock query', response: 'Suggest alternatives and offer restock notification', priority: 'medium', active: false },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{rule.trigger}</p>
                          <Badge variant="outline" className={`text-[10px] ${rule.priority === 'critical' ? 'text-rose-600 border-rose-500/30' : rule.priority === 'high' ? 'text-orange-600 border-orange-500/30' : rule.priority === 'medium' ? 'text-amber-600 border-amber-500/30' : 'text-blue-600 border-blue-500/30'}`}>{rule.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.response}</p>
                      </div>
                      <Switch defaultChecked={rule.active} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary" />AI Knowledge Base</CardTitle>
              <CardDescription>Manage what your AI knows. Add missing topics so it can handle more queries automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30"><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">24</p><p className="text-xs text-muted-foreground">Topics Covered</p></CardContent></Card>
                <Card className="bg-muted/30"><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold text-rose-600">7</p><p className="text-xs text-muted-foreground">Missing Topics</p></CardContent></Card>
                <Card className="bg-muted/30"><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold text-emerald-600">89%</p><p className="text-xs text-muted-foreground">Coverage Rate</p></CardContent></Card>
                <Card className="bg-muted/30"><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold text-amber-600">156</p><p className="text-xs text-muted-foreground">Unanswered Queries</p></CardContent></Card>
              </div>

              <Card className="border-rose-500/20 bg-rose-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-500" />Missing Knowledge Topics</CardTitle>
                  <CardDescription>These topics were asked by customers but AI couldn't answer. Add knowledge to improve coverage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { topic: 'COD availability per pincode', queries: 34, lastAsked: '2 hours ago', suggested: 'Add pincode-wise COD rules from shipping partner data' },
                    { topic: 'GST invoice download process', queries: 28, lastAsked: '5 hours ago', suggested: 'Document invoice generation workflow with download links' },
                    { topic: 'Bulk discount pricing tiers', queries: 23, lastAsked: '1 day ago', suggested: 'Create tiered pricing rules (10+ units: 5%, 50+: 10%, 100+: 15%)' },
                    { topic: 'International shipping availability', queries: 19, lastAsked: '1 day ago', suggested: 'Define supported countries and shipping costs' },
                    { topic: 'Product customization options', queries: 15, lastAsked: '2 days ago', suggested: 'List customizable products with options and pricing' },
                    { topic: 'Warranty claim process', queries: 12, lastAsked: '3 days ago', suggested: 'Document warranty periods by category and claim procedure' },
                    { topic: 'Franchise/reseller program', queries: 8, lastAsked: '1 week ago', suggested: 'Create FAQ about partnership opportunities' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-background border border-border/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{item.topic}</p>
                          <Badge variant="secondary" className="text-xs">{item.queries} queries</Badge>
                          <span className="text-xs text-muted-foreground">{item.lastAsked}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">💡 Suggestion: {item.suggested}</p>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 ml-2 gap-1"><Plus className="w-3 h-3" />Add</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Existing Knowledge Base</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { topic: 'Order tracking & status', docs: 5, lastUpdated: '1 day ago', confidence: 96 },
                    { topic: 'Return & refund policy', docs: 3, lastUpdated: '3 days ago', confidence: 94 },
                    { topic: 'Product specifications', docs: 12, lastUpdated: '1 week ago', confidence: 91 },
                    { topic: 'Payment methods & issues', docs: 4, lastUpdated: '2 days ago', confidence: 93 },
                    { topic: 'Shipping timelines & partners', docs: 6, lastUpdated: '5 days ago', confidence: 88 },
                    { topic: 'Account management', docs: 3, lastUpdated: '1 week ago', confidence: 85 },
                    { topic: 'Promotional offers & coupons', docs: 4, lastUpdated: '2 days ago', confidence: 90 },
                    { topic: 'Size guide & measurements', docs: 2, lastUpdated: '1 week ago', confidence: 82 },
                  ].map((kb, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{kb.topic}</p>
                          <p className="text-xs text-muted-foreground">{kb.docs} documents · Updated {kb.lastUpdated}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={kb.confidence} className="w-16 h-2" />
                        <span className="text-xs font-medium w-8">{kb.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Automation Feature Controls</CardTitle><CardDescription>Enable or disable automation features. Settings are saved automatically.</CardDescription></div>
                <Badge variant="secondary">{features.length} features</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map(feature => {
                  const Icon = feature.icon;
                  const isDisabled = feature.status === 'coming';
                  return (
                    <Card key={feature.id} className={`transition-all ${isDisabled ? 'opacity-50 grayscale' : feature.enabled ? 'border-primary/30 bg-primary/5' : 'opacity-80'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${feature.enabled && !isDisabled ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Icon className={`w-5 h-5 ${feature.enabled && !isDisabled ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">{feature.name}</h4>
                                <Badge variant="outline" className={`text-[10px] h-4 px-1 ${feature.status === 'active' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : feature.status === 'beta' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-muted text-muted-foreground'}`}>{feature.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                              <Badge variant={feature.enabled && !isDisabled ? 'default' : 'secondary'} className="mt-2 text-xs">{isDisabled ? 'Coming Soon' : feature.enabled ? 'Enabled' : 'Disabled'}</Badge>
                            </div>
                          </div>
                          <Switch checked={feature.enabled} onCheckedChange={() => toggleFeature(feature.id)} disabled={isDisabled} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" />Review Rating Summary</CardTitle>
              <CardDescription>Platform-wise customer review overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reviews.map(r => (
                  <Card key={r.platform} className="bg-muted/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{r.platform}</h4>
                        <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /><span className="font-bold">{r.avg}</span></div>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.total.toLocaleString()} reviews</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs"><span className="w-16">Positive</span><Progress value={r.positive} className="h-2 flex-1" /><span className="w-8 text-right">{r.positive}%</span></div>
                        <div className="flex items-center gap-2 text-xs"><span className="w-16">Neutral</span><Progress value={r.neutral} className="h-2 flex-1" /><span className="w-8 text-right">{r.neutral}%</span></div>
                        <div className="flex items-center gap-2 text-xs"><span className="w-16">Negative</span><Progress value={r.negative} className="h-2 flex-1" /><span className="w-8 text-right">{r.negative}%</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ThumbsDown className="w-5 h-5 text-rose-500" />Negative Feedback Indicators</CardTitle>
              <CardDescription>Top issues flagged by customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {negativeFeedback.map((fb, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${fb.severity === 'high' ? 'bg-rose-500' : fb.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="font-medium text-sm">{fb.product}</p>
                        <p className="text-xs text-muted-foreground">{fb.issue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{fb.count} mentions</Badge>
                      <Badge variant="outline" className={fb.severity === 'high' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : fb.severity === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/30'}>{fb.severity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-primary" />Keyword Insights</CardTitle>
              <CardDescription>Most mentioned keywords in customer reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {keywords.map((kw, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={kw.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}>{kw.sentiment === 'positive' ? '👍' : '👎'}</Badge>
                      <span className="font-medium text-sm">{kw.keyword}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{kw.count} mentions</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
