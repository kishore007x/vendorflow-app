import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Zap, TrendingUp, BookOpen, Settings, Sparkles, ArrowUpRight,
  MessageSquare, BarChart3, Shield, Cpu, Clock, Star
} from "lucide-react";

const models = [
  { name: "Gemini 3 Flash", provider: "Google", speed: "Fast", quality: "High", cost: "Low", default: true, desc: "Default model for quick, efficient AI tasks" },
  { name: "Gemini 2.5 Pro", provider: "Google", speed: "Medium", quality: "Very High", cost: "Medium", default: false, desc: "Best for complex reasoning and large inputs" },
  { name: "GPT-5", provider: "OpenAI", speed: "Medium", quality: "Very High", cost: "High", default: false, desc: "Powerful all-rounder for accuracy-critical tasks" },
  { name: "GPT-5 Mini", provider: "OpenAI", speed: "Fast", quality: "High", cost: "Low", default: false, desc: "Balanced performance for everyday use" },
  { name: "Gemini 2.5 Flash Lite", provider: "Google", speed: "Fastest", quality: "Good", cost: "Lowest", default: false, desc: "Best for simple, high-volume tasks" },
];

const useCases = [
  { title: "AI Chatbot & Support", icon: MessageSquare, desc: "Conversational AI for customer queries, order tracking, and FAQs", status: "active" },
  { title: "Smart Insights", icon: BarChart3, desc: "Auto-generated business insights from sales, inventory, and returns data", status: "active" },
  { title: "Auto-Categorization", icon: Brain, desc: "AI-powered product categorization, SKU suggestions, and data cleanup", status: "active" },
  { title: "Demand Forecasting", icon: TrendingUp, desc: "Predict stock requirements and seasonal demand patterns", status: "coming_soon" },
  { title: "Fraud Detection", icon: Shield, desc: "Identify suspicious orders, return abuse, and anomalous patterns", status: "coming_soon" },
  { title: "Smart Pricing", icon: Sparkles, desc: "AI-driven competitive pricing recommendations across portals", status: "coming_soon" },
];

const learningResources = [
  { title: "Getting Started with AI Hub", type: "Guide", duration: "5 min", icon: BookOpen },
  { title: "Understanding AI Insights", type: "Tutorial", duration: "8 min", icon: Brain },
  { title: "AI Automation Best Practices", type: "Article", duration: "12 min", icon: Zap },
  { title: "Customizing AI Responses", type: "Guide", duration: "6 min", icon: Settings },
  { title: "Data Quality for Better AI", type: "Tutorial", duration: "10 min", icon: Star },
];

const tabActiveClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

export default function AILearningUpgrade() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Learning & Upgrade</h1>
          <p className="text-muted-foreground text-sm">Explore AI capabilities, track usage, and upgrade your AI features</p>
        </div>
        <Button className="gap-2"><Sparkles className="w-4 h-4" /> Upgrade AI Plan</Button>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10"><Cpu className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">AI Requests</p>
                <p className="text-xl font-bold">1,247</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10"><Zap className="w-5 h-5 text-emerald-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Features</p>
                <p className="text-xl font-bold">{useCases.filter(u => u.status === "active").length}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{useCases.filter(u => u.status === "coming_soon").length} coming soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10"><Clock className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-xl font-bold">1.2s</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Across all AI features</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10"><TrendingUp className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Credits Used</p>
                <p className="text-xl font-bold">68%</p>
              </div>
            </div>
            <Progress value={68} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="capabilities">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="capabilities" className={tabActiveClass}>AI Capabilities</TabsTrigger>
          <TabsTrigger value="models" className={tabActiveClass}>Models & Config</TabsTrigger>
          <TabsTrigger value="learning" className={tabActiveClass}>Learning Center</TabsTrigger>
        </TabsList>

        {/* Capabilities Tab */}
        <TabsContent value="capabilities" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((uc, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-accent"><uc.icon className="w-5 h-5 text-primary" /></div>
                      <div>
                        <h4 className="font-medium text-sm">{uc.title}</h4>
                        <Badge variant={uc.status === "active" ? "default" : "secondary"} className="text-[10px] mt-1">
                          {uc.status === "active" ? "Active" : "Coming Soon"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">{uc.desc}</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full gap-2" disabled={uc.status !== "active"}>
                    {uc.status === "active" ? <><ArrowUpRight className="w-3.5 h-3.5" /> Open</> : "Notify Me"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <div className="space-y-3">
            {models.map((m, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-accent"><Brain className="w-5 h-5 text-primary" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{m.name}</h4>
                          {m.default && <Badge className="text-[10px]">Default</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-0.5">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[10px]">Speed: {m.speed}</Badge>
                          <Badge variant="outline" className="text-[10px]">Quality: {m.quality}</Badge>
                          <Badge variant="outline" className="text-[10px]">Cost: {m.cost}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{m.provider}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningResources.map((res, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent"><res.icon className="w-5 h-5 text-primary" /></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{res.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{res.type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{res.duration} read</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Want to learn more?</CardTitle>
              <CardDescription>Explore advanced AI features and best practices for your VMS platform</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="gap-2"><BookOpen className="w-4 h-4" /> View All Resources</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
