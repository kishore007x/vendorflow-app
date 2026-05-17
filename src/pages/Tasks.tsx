import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { tasksDb } from '@/services/database';
import { ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Loader2, Eye, GripVertical, Filter, History, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type KanbanStatus = 'pending' | 'in_progress' | 'under_review' | 'completed';

const columns: { id: KanbanStatus; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'pending', label: 'To Do', icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { id: 'in_progress', label: 'In Progress', icon: Loader2, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { id: 'under_review', label: 'Under Review', icon: Eye, color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
];

const priorityBadge = (priority: string) => {
  const cls = priority === 'urgent' ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
    : priority === 'high' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    : priority === 'medium' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
    : 'bg-muted text-muted-foreground';
  return <Badge variant="outline" className={`capitalize text-xs ${cls}`}>{priority}</Badge>;
};

const assignees = [
  { id: 'operations', name: 'Operations' },
  { id: 'admin', name: 'Admin' },
  { id: 'vendor', name: 'Vendor' },
];

export default function Tasks() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newAssignee, setNewAssignee] = useState('operations');
  const [newDueDate, setNewDueDate] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksDb.getAll();
      setTasks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  }), [tasks, filterAssignee, filterPriority, filterStatus]);

  const analytics = useMemo(() => ({
    total: tasks.length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }), [tasks]);

  const handleDrop = async (targetStatus: KanbanStatus) => {
    if (!draggedTask) return;
    const task = tasks.find(t => t.id === draggedTask);
    if (!task || task.status === targetStatus) { setDraggedTask(null); return; }
    try {
      await tasksDb.update(draggedTask, { status: targetStatus });
      toast({ title: 'Task Moved', description: `"${task.title}" → ${columns.find(c => c.id === targetStatus)?.label}` });
      fetchTasks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setDraggedTask(null);
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    try {
      await tasksDb.create({
        title: newTitle, description: newDesc, assigned_to: newAssignee, priority: newPriority,
        due_date: newDueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      toast({ title: 'Task Created', description: `"${newTitle}" added to To Do` });
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewAssignee('operations'); setNewDueDate('');
      setShowCreateDialog(false);
      fetchTasks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
          <p className="text-muted-foreground">Drag and drop tasks between columns to update status</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />New Task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..." /></div>
              <div><Label>Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Task description..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Assign To</Label>
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{assignees.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} /></div>
              <Button className="w-full" onClick={createTask}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ListTodo className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{analytics.total}</p><p className="text-sm text-muted-foreground">Total Tasks</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><AlertTriangle className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">{analytics.overdue}</p><p className="text-sm text-muted-foreground">Overdue</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Loader2 className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{analytics.inProgress}</p><p className="text-sm text-muted-foreground">In Progress</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{analytics.completed}</p><p className="text-sm text-muted-foreground">Completed</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Assignees</SelectItem>{assignees.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Priorities</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
            {(filterAssignee !== 'all' || filterPriority !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterAssignee('all'); setFilterPriority('all'); }}>Clear Filters</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(col => {
          const Icon = col.icon;
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col" onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-lg border border-b-0 ${col.color}`}>
                <Icon className="w-4 h-4" /><span className="font-semibold text-sm">{col.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
              </div>
              <div className="flex-1 min-h-[300px] bg-muted/20 border rounded-b-lg p-2 space-y-2">
                {colTasks.map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                  return (
                    <Card key={task.id} draggable onDragStart={() => setDraggedTask(task.id)}
                      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${draggedTask === task.id ? 'opacity-50 scale-95' : ''} ${isOverdue ? 'border-rose-500/30' : ''}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                          <p className="text-sm font-medium leading-tight">{task.title}</p>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{task.description}</p>}
                        <div className="flex items-center gap-1.5 flex-wrap pl-5">{priorityBadge(task.priority)}</div>
                        <div className="flex items-center justify-between pl-5">
                          <Badge variant="secondary" className="text-xs capitalize">{task.assigned_to || '—'}</Badge>
                          {task.due_date && (
                            <span className={`text-xs ${isOverdue ? 'text-rose-600 font-medium' : 'text-muted-foreground'}`}>
                              {format(new Date(task.due_date), 'dd MMM')}{isOverdue && ' ⚠'}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50 border-2 border-dashed rounded-lg">Drop tasks here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}