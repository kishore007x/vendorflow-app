import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Video, Calendar, Clock, Users, Brain, FileText, CheckCircle2, Plus,
  Sparkles, AlertTriangle, ExternalLink, Mic, StickyNote, ListChecks
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  participants: string[];
  status: 'completed' | 'scheduled' | 'in_progress' | 'cancelled';
  hasNotes: boolean;
  hasRecording: boolean;
  aiSummary?: string;
  actionItems?: { task: string; assignee: string; due: string; done: boolean }[];
  keyTopics?: string[];
}

const meetings: Meeting[] = [
  {
    id: 'M-001', title: 'Weekly Vendor Sync – Amazon Performance', date: '2026-03-18', time: '10:00 AM', duration: '45 min',
    participants: ['Vikram P.', 'Meena S.', 'Amit K.'], status: 'completed', hasNotes: true, hasRecording: true,
    aiSummary: 'Discussed Amazon sales dip in electronics category. Agreed to increase ad spend by 20% and revise pricing for 5 underperforming SKUs. Meena to share competitor analysis by Friday.',
    actionItems: [
      { task: 'Increase Amazon PPC budget by 20%', assignee: 'Vikram P.', due: '2026-03-20', done: false },
      { task: 'Revise pricing for 5 underperforming SKUs', assignee: 'Amit K.', due: '2026-03-21', done: false },
      { task: 'Share competitor analysis report', assignee: 'Meena S.', due: '2026-03-22', done: true },
      { task: 'Update product images for top 10 listings', assignee: 'Vikram P.', due: '2026-03-25', done: false },
    ],
    keyTopics: ['Amazon sales dip', 'PPC budget increase', 'Competitor analysis', 'SKU pricing'],
  },
  {
    id: 'M-002', title: 'Return Rate Analysis – Q1 Review', date: '2026-03-17', time: '2:00 PM', duration: '30 min',
    participants: ['Sneha R.', 'Ravi J.', 'Priya N.'], status: 'completed', hasNotes: true, hasRecording: false,
    aiSummary: 'Q1 return rate at 8.2%, up from 6.5% in Q4. Main drivers: size issues (42%) and product damage (28%). Decided to add size charts to all clothing listings and upgrade packaging for fragile items.',
    actionItems: [
      { task: 'Add detailed size charts to all clothing SKUs', assignee: 'Sneha R.', due: '2026-03-24', done: false },
      { task: 'Source better packaging for fragile electronics', assignee: 'Ravi J.', due: '2026-03-22', done: true },
      { task: 'Set up automated return reason tracking', assignee: 'Priya N.', due: '2026-03-26', done: false },
    ],
    keyTopics: ['Return rate increase', 'Size issues', 'Packaging upgrade', 'Return tracking'],
  },
  {
    id: 'M-003', title: 'New Product Launch Planning', date: '2026-03-19', time: '11:00 AM', duration: '60 min',
    participants: ['Vikram P.', 'Karan S.', 'Anita D.', 'Sneha R.'], status: 'scheduled', hasNotes: false, hasRecording: false,
  },
  {
    id: 'M-004', title: 'Flipkart Partnership Discussion', date: '2026-03-19', time: '3:00 PM', duration: '30 min',
    participants: ['Amit K.', 'External: Flipkart Team'], status: 'scheduled', hasNotes: false, hasRecording: false,
  },
  {
    id: 'M-005', title: 'Monthly Finance Review', date: '2026-03-15', time: '4:00 PM', duration: '45 min',
    participants: ['Meena S.', 'Priya N.'], status: 'completed', hasNotes: true, hasRecording: true,
    aiSummary: 'Revenue up 12% MoM. Settlement delays from Meesho flagged — pending ₹2.3L. COGS increased by 8% due to raw material price hikes. Recommended renegotiating supplier contracts.',
    actionItems: [
      { task: 'Follow up with Meesho on pending settlements', assignee: 'Meena S.', due: '2026-03-18', done: true },
      { task: 'Renegotiate supplier contracts for raw materials', assignee: 'Priya N.', due: '2026-03-28', done: false },
    ],
    keyTopics: ['Revenue growth', 'Meesho settlement delay', 'COGS increase', 'Supplier contracts'],
  },
  {
    id: 'M-006', title: 'Team Standup – Operations', date: '2026-03-16', time: '9:30 AM', duration: '15 min',
    participants: ['Ravi J.', 'Karan S.'], status: 'cancelled', hasNotes: false, hasRecording: false,
  },
];

const [selectedMeeting, setSelectedMeetingState] = [null as Meeting | null, (_: Meeting | null) => {}];

const statusStyle: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  scheduled: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function GoogleMeetIntegration() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [aiNotesEnabled, setAiNotesEnabled] = useState(true);
  const [autoRecording, setAutoRecording] = useState(true);

  const completedMeetings = meetings.filter(m => m.status === 'completed');
  const totalActionItems = completedMeetings.reduce((s, m) => s + (m.actionItems?.length || 0), 0);
  const pendingActions = completedMeetings.reduce((s, m) => s + (m.actionItems?.filter(a => !a.done).length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Meet & AI Notes</h1>
          <p className="text-muted-foreground">Schedule meetings, auto-capture AI notes, summaries & action items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5"><Calendar className="w-4 h-4" />Schedule</Button>
          <Button className="gap-1.5"><Video className="w-4 h-4" />Start Meeting</Button>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center justify-between">
            <div><p className="font-semibold text-sm">AI Notes</p><p className="text-xs text-muted-foreground">Auto-capture</p></div>
            <Switch checked={aiNotesEnabled} onCheckedChange={v => { setAiNotesEnabled(v); toast({ title: v ? 'AI Notes Enabled' : 'AI Notes Disabled' }); }} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center justify-between">
            <div><p className="font-semibold text-sm">Auto Recording</p><p className="text-xs text-muted-foreground">Cloud record</p></div>
            <Switch checked={autoRecording} onCheckedChange={v => { setAutoRecording(v); toast({ title: v ? 'Auto Recording On' : 'Auto Recording Off' }); }} />
          </CardContent>
        </Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-rose-600">{pendingActions}</p><p className="text-xs text-muted-foreground">Pending Action Items</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">{totalActionItems}</p><p className="text-xs text-muted-foreground">Total Action Items</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Meeting List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Meetings</h3>
          {meetings.map(m => (
            <Card
              key={m.id}
              className={`cursor-pointer transition-all hover:border-primary/30 ${selected?.id === m.id ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => setSelected(m)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-sm leading-tight">{m.title}</h4>
                  <Badge variant="outline" className={`text-[10px] capitalize shrink-0 ml-2 ${statusStyle[m.status]}`}>{m.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{m.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.time}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{m.participants.length}</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {m.hasNotes && <Badge variant="secondary" className="text-[10px] gap-0.5"><StickyNote className="w-2.5 h-2.5" />Notes</Badge>}
                  {m.hasRecording && <Badge variant="secondary" className="text-[10px] gap-0.5"><Mic className="w-2.5 h-2.5" />Recording</Badge>}
                  {m.actionItems && <Badge variant="secondary" className="text-[10px] gap-0.5"><ListChecks className="w-2.5 h-2.5" />{m.actionItems.length} Actions</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Meeting Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selected.title}</CardTitle>
                      <CardDescription>{selected.date} at {selected.time} · {selected.duration} · {selected.participants.join(', ')}</CardDescription>
                    </div>
                    <Badge variant="outline" className={`capitalize ${statusStyle[selected.status]}`}>{selected.status}</Badge>
                  </div>
                </CardHeader>
              </Card>

              {selected.aiSummary && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />AI Meeting Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{selected.aiSummary}</p>
                    {selected.keyTopics && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {selected.keyTopics.map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selected.actionItems && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><ListChecks className="w-5 h-5 text-amber-500" />Action Items ({selected.actionItems.filter(a => !a.done).length} pending)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selected.actionItems.map((a, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-lg border border-border/50 ${a.done ? 'bg-emerald-500/5' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className={`w-5 h-5 ${a.done ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                          <div>
                            <p className={`text-sm font-medium ${a.done ? 'line-through text-muted-foreground' : ''}`}>{a.task}</p>
                            <p className="text-xs text-muted-foreground">Assigned to {a.assignee} · Due: {a.due}</p>
                          </div>
                        </div>
                        <Badge variant={a.done ? 'default' : 'secondary'} className="text-xs">{a.done ? 'Done' : 'Pending'}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {!selected.aiSummary && selected.status === 'scheduled' && (
                <Card className="border-dashed border-2">
                  <CardContent className="py-12 text-center">
                    <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-semibold text-muted-foreground">AI Notes will be generated after the meeting</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Summary, action items, and key topics will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <Video className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">Select a meeting to view details</p>
                <p className="text-sm text-muted-foreground/60 mt-1">AI summaries, notes, and action items will appear here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
