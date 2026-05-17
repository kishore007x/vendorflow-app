import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { expensesDb } from '@/services/database';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';
import {
  Plus, Download, Search, IndianRupee, TrendingUp, TrendingDown,
  Building2, Warehouse, Coffee, Bus, Pencil, Receipt, Calendar, Trash2, Loader2, AlertCircle, FileSpreadsheet, FileDown, FileText
} from 'lucide-react';

const iconMap: Record<string, any> = {
  office_misc: Building2, warehouse_misc: Warehouse, daily: Receipt,
  food: Coffee, stationery: Pencil, transport: Bus, tips_wages: IndianRupee,
};

const colorMap: Record<string, string> = {
  office_misc: 'bg-blue-100 text-blue-700', warehouse_misc: 'bg-orange-100 text-orange-700',
  daily: 'bg-green-100 text-green-700', food: 'bg-amber-100 text-amber-700',
  stationery: 'bg-purple-100 text-purple-700', transport: 'bg-cyan-100 text-cyan-700',
  tips_wages: 'bg-pink-100 text-pink-700',
};

export default function ExpenseTracking() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('this_month');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: '', description: '', amount: '', paid_by: '', payment_mode: '', receipt: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { options: categoryOptions } = useDropdownOptions('expense_category');
  const { options: paymentModeOptions } = useDropdownOptions('payment_mode');
  const { options: paidByOptions } = useDropdownOptions('paid_by');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await expensesDb.getAll(filterCategory !== 'all' ? { category: filterCategory, search } : { search });
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [filterCategory, search]);

  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const categoryTotals = categoryOptions.map(cat => ({
    ...cat,
    icon: iconMap[cat.value] || Receipt,
    color: colorMap[cat.value] || 'bg-gray-100 text-gray-700',
    total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
    count: expenses.filter(e => e.category === cat.value).length,
  }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!newExpense.category) e.category = 'Category is required';
    if (!newExpense.description.trim()) e.description = 'Description is required';
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) e.amount = 'Valid amount is required';
    if (!newExpense.payment_mode) e.payment_mode = 'Payment mode is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddExpense = async () => {
    if (!validate()) return;
    try {
      await expensesDb.create({
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        paid_by: newExpense.paid_by || 'Self',
        payment_mode: newExpense.payment_mode,
        receipt: newExpense.receipt,
        expense_date: new Date().toISOString().split('T')[0],
      });
      setShowAddDialog(false);
      setNewExpense({ category: '', description: '', amount: '', paid_by: '', payment_mode: '', receipt: false });
      setErrors({});
      toast({ title: 'Expense Added', description: `₹${newExpense.amount} recorded successfully` });
      fetchExpenses();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await expensesDb.delete(id);
      toast({ title: 'Removed' });
      fetchExpenses();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getCategoryLabel = (val: string) => categoryOptions.find(c => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Tracking</h1>
          <p className="text-muted-foreground">Track office, warehouse & daily business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-2" />PDF</Button>
          <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-2" />TXT</Button>
          <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) setErrors({}); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Record New Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select value={newExpense.category} onValueChange={v => { setNewExpense({ ...newExpense, category: v }); setErrors(prev => ({ ...prev, category: '' })); }}>
                    <SelectTrigger className={errors.category ? 'border-destructive' : ''}><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.category}</p>}
                </div>
                <div>
                  <Label>Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={newExpense.description}
                    onChange={e => { setNewExpense({ ...newExpense, description: e.target.value }); setErrors(prev => ({ ...prev, description: '' })); }}
                    placeholder="What was this expense for?"
                    className={errors.description ? 'border-destructive' : ''}
                  />
                  {errors.description && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      value={newExpense.amount}
                      onChange={e => { setNewExpense({ ...newExpense, amount: e.target.value }); setErrors(prev => ({ ...prev, amount: '' })); }}
                      placeholder="0"
                      className={errors.amount ? 'border-destructive' : ''}
                    />
                    {errors.amount && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
                  </div>
                  <div>
                    <Label>Paid By</Label>
                    <Select value={newExpense.paid_by} onValueChange={v => setNewExpense({ ...newExpense, paid_by: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {paidByOptions.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Mode <span className="text-destructive">*</span></Label>
                    <Select value={newExpense.payment_mode} onValueChange={v => { setNewExpense({ ...newExpense, payment_mode: v }); setErrors(prev => ({ ...prev, payment_mode: '' })); }}>
                      <SelectTrigger className={errors.payment_mode ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {paymentModeOptions.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.payment_mode && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.payment_mode}</p>}
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newExpense.receipt} onChange={e => setNewExpense({ ...newExpense, receipt: e.target.checked })} className="rounded" />
                      <span className="text-sm">Receipt attached</span>
                    </label>
                  </div>
                </div>
                <Button className="w-full" onClick={handleAddExpense}>Save Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Total Expenses</span></div>
            <p className="text-2xl font-bold">₹{totalExpense.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-green-600" /><span className="text-xs text-muted-foreground">Avg Daily</span></div>
            <p className="text-2xl font-bold">₹{Math.round(totalExpense / 30).toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-orange-600" /><span className="text-xs text-muted-foreground">Entries</span></div>
            <p className="text-2xl font-bold">{expenses.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-red-600" /><span className="text-xs text-muted-foreground">Top Category</span></div>
            <p className="text-lg font-bold">{categoryTotals.sort((a, b) => b.total - a.total)[0]?.label.split(' ')[0] || '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {categoryTotals.map(cat => (
          <Card key={cat.value} className={`cursor-pointer transition-all hover:shadow-md ${filterCategory === cat.value ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilterCategory(filterCategory === cat.value ? 'all' : cat.value)}>
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center mx-auto mb-2`}><cat.icon className="w-4 h-4" /></div>
              <p className="text-xs font-medium truncate">{cat.label.split(' ')[0]}</p>
              <p className="text-sm font-bold mt-1">₹{cat.total.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground">{cat.count} entries</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expense Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Expense Records</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input className="pl-8 w-[200px]" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-[140px]"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-sm">{expense.expense_date}</TableCell>
                    <TableCell><Badge variant="outline" className={colorMap[expense.category] || ''}>{getCategoryLabel(expense.category).split(' ')[0]}</Badge></TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="text-sm">{expense.paid_by}</TableCell>
                    <TableCell><Badge variant="secondary">{expense.payment_mode}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">₹{Number(expense.amount).toLocaleString('en-IN')}</TableCell>
                    <TableCell>{expense.receipt ? <Badge variant="outline" className="text-green-600 border-green-300">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && expenses.length === 0 && <p className="text-center text-muted-foreground py-8">No expenses found. Add your first expense above.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
