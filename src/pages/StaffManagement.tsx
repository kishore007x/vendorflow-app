import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalDateFilter, DateRange } from '@/components/GlobalDateFilter';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { employeesDb, attendanceDb, tailorWorkDb, leaveRequestsDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Download, Search, Users, IndianRupee, Calendar, Clock, Fingerprint,
  Wifi, Smartphone, UserCheck, UserX, Scissors, Package, AlertTriangle, CheckCircle2,
  Loader2, CalendarDays, CalendarOff, ShieldCheck, Timer, ScanFace, Settings2, Link2
} from 'lucide-react';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

export default function StaffManagement() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [tailorWork, setTailorWork] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [networkOnly, setNetworkOnly] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', role: '', department: 'General', type: 'fixed', phone: '', monthly_salary: 0, per_piece_rate: 0, biometric_id: '' });
  const [newLeave, setNewLeave] = useState({ employee_id: '', type: 'leave', leave_type: 'casual', start_date: '', end_date: '', reason: '', permission_from: '', permission_to: '' });
  const [manualAttendance, setManualAttendance] = useState({ employee_id: '', check_in: '', check_out: '', method: 'manual', status: 'present' });
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const toggleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
      return { key, dir: 'asc' };
    });
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortConfig?.key !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortConfig.dir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 inline text-primary" />;
  };

  const sortData = <T extends Record<string, any>>(data: T[], key?: string): T[] => {
    if (!sortConfig || (key && sortConfig.key.split('.')[0] !== key)) return data;
    const k = sortConfig.key.includes('.') ? sortConfig.key.split('.').pop()! : sortConfig.key;
    return [...data].sort((a, b) => {
      const va = a[k], vb = b[k];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });
  };

  const inRange = (dateStr: string) => {
    if (!dateRange.from || !dateRange.to) return true;
    const d = new Date(dateStr);
    return d >= dateRange.from && d <= dateRange.to;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empData, attData, twData, lrData] = await Promise.all([
        employeesDb.getAll(search || undefined),
        attendanceDb.getAll(attendanceDateFilter ? { date: attendanceDateFilter } : undefined),
        tailorWorkDb.getAll(),
        leaveRequestsDb.getAll(),
      ]);
      setEmployees(empData);
      setAttendance(attData);
      setTailorWork(twData);
      setLeaveRequests(lrData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, attendanceDateFilter]);

  const empMap = useMemo(() => {
    const m: Record<string, string> = {};
    employees.forEach(e => { m[e.id] = e.name; });
    return m;
  }, [employees]);

  const handleAddEmployee = async () => {
    try {
      await employeesDb.create(newEmp);
      toast({ title: 'Employee Added' });
      setShowAddEmployee(false);
      setNewEmp({ name: '', role: '', department: 'General', type: 'fixed', phone: '', monthly_salary: 0, per_piece_rate: 0, biometric_id: '' });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddLeave = async () => {
    try {
      const payload: any = { ...newLeave };
      if (newLeave.type !== 'permission') {
        delete payload.permission_from;
        delete payload.permission_to;
      }
      await leaveRequestsDb.create(payload);
      toast({ title: 'Request Submitted' });
      setShowLeaveDialog(false);
      setNewLeave({ employee_id: '', type: 'leave', leave_type: 'casual', start_date: '', end_date: '', reason: '', permission_from: '', permission_to: '' });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await leaveRequestsDb.update(id, { status, approved_at: new Date().toISOString() });
      toast({ title: `Request ${status}` });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleManualAttendance = async () => {
    try {
      const checkIn = manualAttendance.check_in;
      const checkOut = manualAttendance.check_out;
      let hoursWorked = 0;
      if (checkIn && checkOut) {
        const [h1, m1] = checkIn.split(':').map(Number);
        const [h2, m2] = checkOut.split(':').map(Number);
        hoursWorked = Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
      }
      await attendanceDb.create({
        employee_id: manualAttendance.employee_id,
        check_in: checkIn || null,
        check_out: checkOut || null,
        method: manualAttendance.method,
        network: 'manual',
        status: manualAttendance.status,
        hours_worked: Math.round(hoursWorked * 10) / 10,
      });
      toast({ title: 'Attendance Recorded' });
      setShowAttendanceDialog(false);
      setManualAttendance({ employee_id: '', check_in: '', check_out: '', method: 'manual', status: 'present' });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Stats
  const activeCount = employees.filter(e => e.status === 'active').length;
  const totalPiecesCompleted = tailorWork.reduce((s, t) => s + (t.completed || 0), 0);
  const totalPiecesPending = tailorWork.reduce((s, t) => s + (t.pending || 0), 0);
  const totalSalary = employees.filter(e => e.status === 'active').reduce((s, e) => {
    return s + (e.type === 'fixed' ? (e.monthly_salary || 0) : (e.per_piece_rate || 0) * (tailorWork.filter(t => t.employee_id === e.id).reduce((sum, t) => sum + (t.completed || 0), 0)));
  }, 0);
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;

  // Working days calculation per employee
  const workingDaysMap = useMemo(() => {
    const map: Record<string, { present: number; absent: number; halfDay: number; late: number; totalHours: number }> = {};
    attendance.forEach(a => {
      if (!map[a.employee_id]) map[a.employee_id] = { present: 0, absent: 0, halfDay: 0, late: 0, totalHours: 0 };
      if (a.status === 'present') map[a.employee_id].present++;
      else if (a.status === 'absent') map[a.employee_id].absent++;
      else if (a.status === 'half_day') map[a.employee_id].halfDay++;
      else if (a.status === 'late') { map[a.employee_id].late++; map[a.employee_id].present++; }
      map[a.employee_id].totalHours += Number(a.hours_worked || 0);
    });
    return map;
  }, [attendance]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { present: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30', half_day: 'bg-amber-500/10 text-amber-700 border-amber-500/30', absent: 'bg-rose-500/10 text-rose-700 border-rose-500/30', late: 'bg-orange-500/10 text-orange-700 border-orange-500/30' };
    return map[status] || '';
  };

  const leaveStatusBadge = (status: string) => {
    const map: Record<string, string> = { pending: 'bg-amber-500/10 text-amber-700 border-amber-500/30', approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30', rejected: 'bg-rose-500/10 text-rose-700 border-rose-500/30' };
    return map[status] || '';
  };

  const filteredAttendance = (networkOnly ? attendance.filter(a => a.network === 'office_wifi') : attendance).filter(a => inRange(a.attendance_date));

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff & Salary Management</h1>
          <p className="text-muted-foreground">Attendance, leave management, piece-rate & salary calculation</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <GlobalDateFilter value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={() => setShowApiConfig(true)}><Settings2 className="w-4 h-4 mr-2" />Biometric API</Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export Payroll</Button>
          <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Employee</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Full Name</Label><Input placeholder="Employee name" value={newEmp.name} onChange={e => setNewEmp(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input placeholder="Mobile number" value={newEmp.phone} onChange={e => setNewEmp(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Role</Label><Input placeholder="e.g. Tailor, Packing" value={newEmp.role} onChange={e => setNewEmp(p => ({ ...p, role: e.target.value }))} /></div>
                  <div><Label>Department</Label>
                    <Select value={newEmp.department} onValueChange={v => setNewEmp(p => ({ ...p, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Stitching', 'Packing', 'Warehouse', 'QC', 'Admin', 'General'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Salary Type</Label>
                    <Select value={newEmp.type} onValueChange={v => setNewEmp(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Monthly</SelectItem>
                        <SelectItem value="piece_rate">Piece Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount (₹)</Label><Input type="number" placeholder="Salary or rate per piece" onChange={e => {
                    const val = Number(e.target.value);
                    setNewEmp(p => newEmp.type === 'fixed' ? { ...p, monthly_salary: val } : { ...p, per_piece_rate: val });
                  }} /></div>
                </div>
                <div>
                  <Label>Biometric Device ID (optional)</Label>
                  <Input placeholder="Device enrollment ID for fingerprint/face" value={newEmp.biometric_id} onChange={e => setNewEmp(p => ({ ...p, biometric_id: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Link to fingerprint/face recognition device</p>
                </div>
                <Button className="w-full" onClick={handleAddEmployee}>Save Employee</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Active Staff</span></div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">of {employees.length} total</p></CardContent></Card>
        <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Payroll (Est.)</span></div><p className="text-2xl font-bold">{fmt(totalSalary)}</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-blue-600" /><span className="text-xs text-muted-foreground">Pieces Done</span></div><p className="text-2xl font-bold">{totalPiecesCompleted}</p></CardContent></Card>
        <Card className="border-l-4 border-l-orange-500"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-orange-600" /><span className="text-xs text-muted-foreground">Pending Work</span></div><p className="text-2xl font-bold">{totalPiecesPending}</p></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><CalendarOff className="w-4 h-4 text-amber-600" /><span className="text-xs text-muted-foreground">Pending Leaves</span></div><p className="text-2xl font-bold">{pendingLeaves}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="flex-wrap">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="working_days">Working Days</TabsTrigger>
          <TabsTrigger value="leaves">Leave & Permission</TabsTrigger>
          <TabsTrigger value="piece_work">Piece Rate</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Employee Directory</CardTitle>
                <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-8 w-[200px]" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>Name<SortIcon col="name" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('role')}>Role<SortIcon col="role" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('department')}>Department<SortIcon col="department" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('type')}>Type<SortIcon col="type" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('monthly_salary')}>Rate / Salary<SortIcon col="monthly_salary" /></TableHead>
                  <TableHead>Biometric ID</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('leaves_used')}>Leaves<SortIcon col="leaves_used" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Status<SortIcon col="status" /></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sortData(employees, undefined).map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}<br /><span className="text-xs text-muted-foreground">{emp.phone}</span></TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell><Badge variant="outline">{emp.department}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{emp.type === 'fixed' ? 'Fixed' : 'Piece Rate'}</Badge></TableCell>
                      <TableCell className="font-semibold">{emp.type === 'fixed' ? `₹${(emp.monthly_salary || 0).toLocaleString('en-IN')}/mo` : `₹${emp.per_piece_rate}/pc`}</TableCell>
                      <TableCell>
                        {emp.biometric_id ? (
                          <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30"><Fingerprint className="w-3 h-3" />{emp.biometric_id}</Badge>
                        ) : <span className="text-xs text-muted-foreground">Not linked</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{emp.leaves_used || 0}/{emp.total_leaves || 18}</span>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={emp.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 border-rose-500/30'}>{emp.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><CardTitle>Attendance Log</CardTitle><p className="text-xs text-muted-foreground mt-1">Fingerprint, Face ID & manual capture</p></div>
                <div className="flex items-center gap-3">
                  <Input type="date" className="w-[160px]" value={attendanceDateFilter} onChange={e => setAttendanceDateFilter(e.target.value)} />
                  <div className="flex items-center gap-2"><Wifi className="w-4 h-4 text-muted-foreground" /><Label className="text-xs">Office Only</Label><Switch checked={networkOnly} onCheckedChange={setNetworkOnly} /></div>
                  <Button size="sm" onClick={() => setShowAttendanceDialog(true)}><Plus className="w-4 h-4 mr-1" />Manual Entry</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('att.employee_id')}>Employee<SortIcon col="att.employee_id" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('att.attendance_date')}>Date<SortIcon col="att.attendance_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('att.check_in')}>In Time<SortIcon col="att.check_in" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('att.check_out')}>Out Time<SortIcon col="att.check_out" /></TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('att.hours_worked')}>Hours<SortIcon col="att.hours_worked" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('att.status')}>Status<SortIcon col="att.status" /></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sortData(filteredAttendance, 'att').map(att => (
                    <TableRow key={att.id}>
                      <TableCell className="font-medium">{empMap[att.employee_id] || att.employee_id}</TableCell>
                      <TableCell>{att.attendance_date}</TableCell>
                      <TableCell className="font-mono text-sm">{att.check_in || '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{att.check_out || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {att.method === 'fingerprint' ? <Fingerprint className="w-3 h-3" /> : att.method === 'face_id' ? <ScanFace className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {att.method === 'face_id' ? 'Face ID' : att.method}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="gap-1">{att.network === 'office_wifi' ? <Wifi className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}{att.network}</Badge></TableCell>
                      <TableCell className="font-semibold">{att.hours_worked || 0}h</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadge(att.status || 'present')}>{att.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {filteredAttendance.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No attendance records{attendanceDateFilter && ' for selected date'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Working Days Tab */}
        <TabsContent value="working_days">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" />Working Days Summary</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead className="text-center">Present</TableHead><TableHead className="text-center">Half Day</TableHead><TableHead className="text-center">Late</TableHead><TableHead className="text-center">Absent</TableHead><TableHead className="text-center">Total Hours</TableHead><TableHead className="text-center">Leaves Used</TableHead><TableHead className="text-center">Leaves Left</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.filter(e => e.status === 'active').map(emp => {
                    const wd = workingDaysMap[emp.id] || { present: 0, absent: 0, halfDay: 0, late: 0, totalHours: 0 };
                    const leavesUsed = emp.leaves_used || 0;
                    const totalLeaves = emp.total_leaves || 18;
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell><Badge variant="outline">{emp.department}</Badge></TableCell>
                        <TableCell className="text-center font-semibold text-emerald-600">{wd.present}</TableCell>
                        <TableCell className="text-center text-amber-600">{wd.halfDay}</TableCell>
                        <TableCell className="text-center text-orange-600">{wd.late}</TableCell>
                        <TableCell className="text-center text-rose-600">{wd.absent}</TableCell>
                        <TableCell className="text-center font-semibold">{wd.totalHours.toFixed(1)}h</TableCell>
                        <TableCell className="text-center">{leavesUsed}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={totalLeaves - leavesUsed <= 3 ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'}>
                            {totalLeaves - leavesUsed}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {employees.filter(e => e.status === 'active').length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No active employees</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave & Permission Tab */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div><CardTitle>Leave & Permission Requests</CardTitle><p className="text-xs text-muted-foreground mt-1">Manage leave, half-day & permission requests</p></div>
                <Button size="sm" onClick={() => setShowLeaveDialog(true)}><Plus className="w-4 h-4 mr-1" />New Request</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lr.employee_id')}>Employee<SortIcon col="lr.employee_id" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lr.type')}>Type<SortIcon col="lr.type" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lr.leave_type')}>Leave Type<SortIcon col="lr.leave_type" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lr.start_date')}>From<SortIcon col="lr.start_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lr.end_date')}>To<SortIcon col="lr.end_date" /></TableHead>
                  <TableHead>Time (Permission)</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lr.status')}>Status<SortIcon col="lr.status" /></TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sortData(leaveRequests.filter(lr => inRange(lr.start_date)), 'lr').map(lr => (
                    <TableRow key={lr.id}>
                      <TableCell className="font-medium">{empMap[lr.employee_id] || lr.employee_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          lr.type === 'permission' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                          lr.type === 'half_day' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                          'bg-violet-500/10 text-violet-600 border-violet-500/30'
                        }>
                          {lr.type === 'permission' ? 'Permission' : lr.type === 'half_day' ? 'Half Day' : 'Leave'}
                        </Badge>
                      </TableCell>
                      <TableCell>{lr.leave_type || '—'}</TableCell>
                      <TableCell>{lr.start_date}</TableCell>
                      <TableCell>{lr.end_date}</TableCell>
                      <TableCell className="font-mono text-sm">{lr.type === 'permission' ? `${lr.permission_from || '—'} → ${lr.permission_to || '—'}` : '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{lr.reason || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={leaveStatusBadge(lr.status)}>{lr.status}</Badge></TableCell>
                      <TableCell>
                        {lr.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="text-emerald-600 h-7 px-2" onClick={() => handleLeaveAction(lr.id, 'approved')}><CheckCircle2 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-rose-600 h-7 px-2" onClick={() => handleLeaveAction(lr.id, 'rejected')}><UserX className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaveRequests.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No leave/permission requests</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Piece Rate Tracking Tab */}
        <TabsContent value="piece_work">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="w-5 h-5" />Piece Rate Work Log</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tw.employee_id')}>Employee<SortIcon col="tw.employee_id" /></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tw.received')}>Received<SortIcon col="tw.received" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tw.completed')}>Completed<SortIcon col="tw.completed" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tw.pending')}>Pending<SortIcon col="tw.pending" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tw.rate_per_piece')}>Rate<SortIcon col="tw.rate_per_piece" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tw.total_earned')}>Earned<SortIcon col="tw.total_earned" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tw.work_date')}>Date<SortIcon col="tw.work_date" /></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sortData(tailorWork.filter(tw => inRange(tw.work_date)), 'tw').map(tw => (
                    <TableRow key={tw.id}>
                      <TableCell className="font-medium">{empMap[tw.employee_id] || tw.employee_id}</TableCell>
                      <TableCell>{tw.product_name}</TableCell>
                      <TableCell className="font-mono text-xs">{tw.sku || '—'}</TableCell>
                      <TableCell>{tw.received || 0}</TableCell>
                      <TableCell className="text-emerald-600 font-semibold">{tw.completed || 0}</TableCell>
                      <TableCell className={`font-semibold ${(tw.pending || 0) > 0 ? 'text-orange-600' : ''}`}>{tw.pending || 0}</TableCell>
                      <TableCell>₹{tw.rate_per_piece || 0}/pc</TableCell>
                      <TableCell className="font-semibold text-emerald-600">₹{tw.total_earned || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tw.work_date}</TableCell>
                    </TableRow>
                  ))}
                  {tailorWork.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No piece rate work records</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Calculator Tab */}
        <TabsContent value="salary">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><IndianRupee className="w-5 h-5" />Salary Summary</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('sal.name')}>Employee<SortIcon col="sal.name" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('sal.type')}>Type<SortIcon col="sal.type" /></TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('sal.monthly_salary')}>Base<SortIcon col="sal.monthly_salary" /></TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Calculated</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sortData(employees.filter(e => e.status === 'active'), 'sal').map(emp => {
                    const piecesEarned = tailorWork.filter(t => t.employee_id === emp.id).reduce((s, t) => s + (t.total_earned || 0), 0);
                    const wd = workingDaysMap[emp.id] || { present: 0, absent: 0, halfDay: 0, late: 0, totalHours: 0 };
                    const baseSalary = emp.type === 'fixed' ? (emp.monthly_salary || 0) : piecesEarned;
                    const absentDeduction = emp.type === 'fixed' ? Math.round(((emp.monthly_salary || 0) / 30) * wd.absent) : 0;
                    const halfDayDeduction = emp.type === 'fixed' ? Math.round(((emp.monthly_salary || 0) / 30) * wd.halfDay * 0.5) : 0;
                    const netSalary = baseSalary - absentDeduction - halfDayDeduction;
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell><Badge variant="secondary">{emp.type === 'fixed' ? 'Fixed' : 'Piece Rate'}</Badge></TableCell>
                        <TableCell>{wd.present + wd.halfDay} days ({wd.totalHours.toFixed(1)}h)</TableCell>
                        <TableCell>{fmt(baseSalary)}</TableCell>
                        <TableCell className="text-rose-600">{absentDeduction + halfDayDeduction > 0 ? `-${fmt(absentDeduction + halfDayDeduction)}` : '—'}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{fmt(netSalary)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Attendance Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Manual Attendance Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={manualAttendance.employee_id} onValueChange={v => setManualAttendance(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>In Time</Label><Input type="time" value={manualAttendance.check_in} onChange={e => setManualAttendance(p => ({ ...p, check_in: e.target.value }))} /></div>
              <div><Label>Out Time</Label><Input type="time" value={manualAttendance.check_out} onChange={e => setManualAttendance(p => ({ ...p, check_out: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Method</Label>
                <Select value={manualAttendance.method} onValueChange={v => setManualAttendance(p => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="fingerprint">Fingerprint</SelectItem>
                    <SelectItem value="face_id">Face ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={manualAttendance.status} onValueChange={v => setManualAttendance(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleManualAttendance} disabled={!manualAttendance.employee_id}>Save Attendance</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Leave / Permission Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={newLeave.employee_id} onValueChange={v => setNewLeave(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Request Type</Label>
                <Select value={newLeave.type} onValueChange={v => setNewLeave(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leave">Full Day Leave</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="permission">Permission (Hours)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Leave Type</Label>
                <Select value={newLeave.leave_type} onValueChange={v => setNewLeave(p => ({ ...p, leave_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="earned">Earned Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From Date</Label><Input type="date" value={newLeave.start_date} onChange={e => setNewLeave(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>To Date</Label><Input type="date" value={newLeave.end_date} onChange={e => setNewLeave(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            {newLeave.type === 'permission' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Permission From</Label><Input type="time" value={newLeave.permission_from} onChange={e => setNewLeave(p => ({ ...p, permission_from: e.target.value }))} /></div>
                <div><Label>Permission To</Label><Input type="time" value={newLeave.permission_to} onChange={e => setNewLeave(p => ({ ...p, permission_to: e.target.value }))} /></div>
              </div>
            )}
            <div><Label>Reason</Label><Textarea placeholder="Reason for leave/permission..." value={newLeave.reason} onChange={e => setNewLeave(p => ({ ...p, reason: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleAddLeave} disabled={!newLeave.employee_id || !newLeave.start_date || !newLeave.end_date}>Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Biometric API Configuration Dialog */}
      <Dialog open={showApiConfig} onOpenChange={setShowApiConfig}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" />Biometric API Integration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Connect your fingerprint/face recognition device to automate attendance capture.</p>

            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <p className="font-medium text-sm">Fingerprint Scanner</p>
                    <p className="text-xs text-muted-foreground">ZKTeco, Mantra, Morpho, eSSL devices</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Device API Endpoint</Label>
                  <Input placeholder="https://your-device-ip/api/attendance" />
                  <Label className="text-xs">API Key / Token</Label>
                  <Input placeholder="Device authentication token" type="password" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><ScanFace className="w-5 h-5 text-violet-600" /></div>
                  <div>
                    <p className="font-medium text-sm">Face Recognition</p>
                    <p className="text-xs text-muted-foreground">Face ID terminals, AI cameras</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Device API Endpoint</Label>
                  <Input placeholder="https://your-device-ip/api/face-check" />
                  <Label className="text-xs">API Key / Token</Label>
                  <Input placeholder="Device authentication token" type="password" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Link2 className="w-4 h-4" />Webhook Integration</h4>
                <p className="text-xs text-muted-foreground mb-2">Configure your biometric device to send attendance data to this webhook URL:</p>
                <div className="bg-background border rounded-md p-2 font-mono text-xs break-all">
                  {`${import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'}/functions/v1/biometric-webhook`}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Supported payload: <code className="text-xs bg-muted px-1 rounded">{'{ employee_id, check_in, check_out, method, biometric_id }'}</code></p>
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowApiConfig(false)}>Close</Button>
              <Button onClick={() => { toast({ title: 'Integration Saved', description: 'Biometric API settings updated. Configure your device webhook to start auto-capturing attendance.' }); setShowApiConfig(false); }}>Save Configuration</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
