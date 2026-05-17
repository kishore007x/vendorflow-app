import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { vendorsDb } from '@/services/database';
import { Users, Plus, MapPin, Package, ShoppingCart, ShieldCheck, ShieldX, Loader2, Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Vendors() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', gst_number: '' });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorsDb.getAll();
      setVendors(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, []);

  const activeCount = vendors.filter(v => v.status === 'active').length;
  const verifiedCount = vendors.filter(v => v.gst_verified).length;

  const handleAdd = async () => {
    if (!form.name) return;
    try {
      await vendorsDb.create(form);
      toast({ title: 'Vendor Added' });
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', address: '', gst_number: '' });
      fetchVendors();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleVerifyGST = async (id: string, gstNumber: string) => {
    if (!gstNumber) { toast({ title: 'Enter GST number first', variant: 'destructive' }); return; }
    try {
      await vendorsDb.update(id, { gst_number: gstNumber, gst_verified: true, gst_status: 'Active' });
      toast({ title: 'GST Verified' });
      fetchVendors();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Management</h1>
          <p className="text-muted-foreground">Manage all vendor partners and their performance</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Business Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>GST Number</Label><Input value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} /></div>
              <Button className="w-full" onClick={handleAdd}>Save Vendor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{vendors.length}</p><p className="text-sm text-muted-foreground">Total Vendors</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Users className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-sm text-muted-foreground">Active</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{verifiedCount}/{vendors.length}</p><p className="text-sm text-muted-foreground">GST Verified</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Vendor List</CardTitle></CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No vendors yet. Add your first vendor above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">GST</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Plan</TableHead>
                  <TableHead className="font-semibold">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div><p className="font-medium">{v.name}</p>{v.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{v.address}</p>}</div>
                    </TableCell>
                    <TableCell><div className="text-sm"><p>{v.email || '—'}</p><p className="text-muted-foreground">{v.phone || '—'}</p></div></TableCell>
                    <TableCell>
                      {v.gst_verified ? (
                        <Badge variant="outline" className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30"><ShieldCheck className="w-3 h-3" />Verified</Badge>
                      ) : v.gst_number ? (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => handleVerifyGST(v.id, v.gst_number)}>
                          <Search className="w-3 h-3 mr-1" />Verify
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={v.status === 'active' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}>{v.status}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs capitalize">{v.subscription_plan || 'trial'}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.join_date ? format(new Date(v.join_date), 'dd MMM yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}