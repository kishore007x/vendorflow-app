import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { warehousesDb, inventoryDb } from '@/services/database';
import { Warehouse, MapPin, Package, Clock, IndianRupee, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Warehouses() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', capacity: '', storage_cost_per_day: '0.5' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wh, inv] = await Promise.all([warehousesDb.getAll(), inventoryDb.getAll()]);
      setWarehouses(wh);
      setInventory(inv);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity || 0), 0);
  const totalUtilized = warehouses.reduce((s, w) => s + (w.utilized || 0), 0);
  const overallUtil = totalCapacity > 0 ? Math.round((totalUtilized / totalCapacity) * 100) : 0;

  const agingOver90 = inventory.filter(i => (i.aging_days || 0) > 90).length;
  const agingOver60 = inventory.filter(i => (i.aging_days || 0) > 60 && (i.aging_days || 0) <= 90).length;
  const agingUnder60 = inventory.filter(i => (i.aging_days || 0) <= 60).length;

  const handleAdd = async () => {
    if (!form.name) return;
    try {
      await warehousesDb.create({ name: form.name, location: form.location, capacity: parseInt(form.capacity) || 0, storage_cost_per_day: parseFloat(form.storage_cost_per_day) || 0.5 });
      toast({ title: 'Warehouse Added' });
      setShowAdd(false);
      setForm({ name: '', location: '', capacity: '', storage_cost_per_day: '0.5' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouse & Storage</h1>
          <p className="text-muted-foreground">Monitor warehouse capacity, storage costs, and inventory aging</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Warehouse</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Warehouse</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Warehouse name" /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="City, State" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Capacity (units)</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
                <div><Label>Cost/Day (₹)</Label><Input type="number" value={form.storage_cost_per_day} onChange={e => setForm({ ...form, storage_cost_per_day: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={handleAdd}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Warehouse className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{warehouses.length}</p><p className="text-sm text-muted-foreground">Warehouses</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Package className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{overallUtil}%</p><p className="text-sm text-muted-foreground">Utilization</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Package className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{agingUnder60}</p><p className="text-sm text-muted-foreground">&lt;60 days</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{agingOver60}</p><p className="text-sm text-muted-foreground">60-90 days</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><Clock className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{agingOver90}</p><p className="text-sm text-muted-foreground">&gt;90 days</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Warehouse Capacity</CardTitle><CardDescription>Storage capacity and utilization per warehouse</CardDescription></CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No warehouses yet. Add your first warehouse above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Warehouse</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold text-center">Capacity</TableHead>
                  <TableHead className="font-semibold text-center">Utilized</TableHead>
                  <TableHead className="font-semibold">Utilization</TableHead>
                  <TableHead className="font-semibold text-right">Daily Cost</TableHead>
                  <TableHead className="font-semibold text-right">Monthly Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map(w => {
                  const util = w.capacity > 0 ? Math.round(((w.utilized || 0) / w.capacity) * 100) : 0;
                  const dailyCost = (w.utilized || 0) * (w.storage_cost_per_day || 0);
                  return (
                    <TableRow key={w.id}>
                      <TableCell><div className="flex items-center gap-2"><Warehouse className="w-4 h-4 text-primary" /><span className="font-medium">{w.name}</span></div></TableCell>
                      <TableCell><span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="w-3 h-3" />{w.location || '—'}</span></TableCell>
                      <TableCell className="text-center font-medium">{(w.capacity || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center font-medium">{(w.utilized || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={util} className="h-2 flex-1" />
                          <span className={`text-sm font-medium ${util > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{util}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{dailyCost.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">₹{(dailyCost * 30).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}