import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ImageIcon, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  about: string | null;
  status: string;
  created_at: string;
}

export default function Brands() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', about: '', status: 'active', logo_url: '' });
  const [uploading, setUploading] = useState(false);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('brands').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Brand[];
    },
  });

  const saveBrand = useMutation({
    mutationFn: async (brand: typeof form & { id?: string }) => {
      if (brand.id) {
        const { error } = await (supabase as any).from('brands').update({
          name: brand.name, about: brand.about, status: brand.status, logo_url: brand.logo_url || null,
        }).eq('id', brand.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('brands').insert({
          name: brand.name, about: brand.about, status: brand.status, logo_url: brand.logo_url || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: editingBrand ? 'Brand updated' : 'Brand created' });
      resetForm();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setForm({ name: '', about: '', status: 'active', logo_url: '' });
    setEditingBrand(null);
    setDialogOpen(false);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({ name: brand.name, about: brand.about || '', status: brand.status, logo_url: brand.logo_url || '' });
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `brand-logos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm(f => ({ ...f, logo_url: publicUrl }));
      toast({ title: 'Logo uploaded' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: 'Brand name is required', variant: 'destructive' });
      return;
    }
    saveBrand.mutate({ ...form, id: editingBrand?.id });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your product brands, logos, and descriptions.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}
          modal
        >
          <DialogTrigger asChild>
            <Button className="gap-2" style={{ background: 'var(--gradient-deep)', color: 'white' }}>
              <Plus className="w-4 h-4" /> Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md glass-card"
            onOpenAutoFocus={(e) => { /* allow default focus */ }}
            style={{ overflow: 'auto', maxHeight: '90vh' }}
          >
            <DialogHeader>
              <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Brand Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Nike, Adidas" />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-contain border border-border bg-card" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/30">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="text-xs" />
                    {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>About / Description</Label>
                <Textarea value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} placeholder="Brief description of the brand" rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
                  <Switch checked={form.status === 'active'} onCheckedChange={c => setForm(f => ({ ...f, status: c ? 'active' : 'inactive' }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={saveBrand.isPending}
                style={{ background: 'var(--gradient-deep)', color: 'white' }}>
                {saveBrand.isPending ? 'Saving...' : editingBrand ? 'Update Brand' : 'Create Brand'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">All Brands ({brands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading brands...</p>
          ) : brands.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No brands yet. Add your first brand to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>About</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map(brand => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="w-10 h-10 rounded-lg object-contain border border-border bg-card" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm">{brand.about || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={brand.status === 'active' ? 'default' : 'secondary'}
                        className={brand.status === 'active' ? 'bg-success/15 text-success border-0' : ''}>
                        {brand.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
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
