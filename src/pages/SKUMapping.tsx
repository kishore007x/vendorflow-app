import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { skuMappingsDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Link, Unlink, Search, AlertCircle, Loader2, Globe, Activity, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type MappingStatus = 'mapped' | 'partially_mapped' | 'unmapped';

function getMappingStatus(m: any): MappingStatus {
  const fields = [m.amazon_sku, m.flipkart_sku, m.meesho_sku, m.firstcry_sku, m.blinkit_sku, m.own_website_sku];
  const filled = fields.filter(Boolean).length;
  if (filled === 0) return 'unmapped';
  if (filled >= 4) return 'mapped';
  return 'partially_mapped';
}

function getMappedCount(m: any): number {
  return [m.amazon_sku, m.flipkart_sku, m.meesho_sku, m.firstcry_sku, m.blinkit_sku, m.own_website_sku].filter(Boolean).length;
}

function getUrlCount(m: any): number {
  return [m.amazon_url, m.flipkart_url, m.meesho_url, m.firstcry_url, m.blinkit_url, m.own_website_url].filter(Boolean).length;
}

const statusBadge = (status: MappingStatus) => {
  switch (status) {
    case 'mapped':
      return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><Link className="w-3 h-3" />Mapped</Badge>;
    case 'partially_mapped':
      return <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1"><AlertCircle className="w-3 h-3" />Partial</Badge>;
    case 'unmapped':
      return <Badge variant="outline" className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1"><Unlink className="w-3 h-3" />Unmapped</Badge>;
  }
};

const PORTAL_URL_FIELDS = [
  { key: 'amazon_url', label: 'Amazon URL', icon: '🛒', placeholder: 'https://www.amazon.in/dp/...' },
  { key: 'flipkart_url', label: 'Flipkart URL', icon: '🛍️', placeholder: 'https://www.flipkart.com/...' },
  { key: 'meesho_url', label: 'Meesho URL', icon: '📦', placeholder: 'https://www.meesho.com/...' },
  { key: 'firstcry_url', label: 'FirstCry URL', icon: '👶', placeholder: 'https://www.firstcry.com/...' },
  { key: 'blinkit_url', label: 'Blinkit URL', icon: '⚡', placeholder: 'https://blinkit.com/...' },
  { key: 'own_website_url', label: 'Own Website URL', icon: '🌐', placeholder: 'https://yoursite.com/product/...' },
];

export default function SKUMapping() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<MappingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    master_sku_id: '', product_name: '', brand: '',
    amazon_sku: '', flipkart_sku: '', meesho_sku: '', firstcry_sku: '', blinkit_sku: '', own_website_sku: '',
    amazon_url: '', flipkart_url: '', meesho_url: '', firstcry_url: '', blinkit_url: '', own_website_url: '',
  });
  const [checkingHealth, setCheckingHealth] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const data = await skuMappingsDb.getAll(searchQuery || undefined);
      setMappings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMappings(); }, [searchQuery]);

  const filteredMappings = useMemo(() => mappings.filter(m => {
    const status = getMappingStatus(m);
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    return true;
  }), [mappings, filterStatus]);

  const resetForm = () => setFormData({
    master_sku_id: '', product_name: '', brand: '',
    amazon_sku: '', flipkart_sku: '', meesho_sku: '', firstcry_sku: '', blinkit_sku: '', own_website_sku: '',
    amazon_url: '', flipkart_url: '', meesho_url: '', firstcry_url: '', blinkit_url: '', own_website_url: '',
  });

  const handleAddMapping = async () => {
    try {
      await skuMappingsDb.create(formData);
      toast({ title: 'Mapping Added', description: 'New SKU mapping has been created successfully.' });
      setIsAddDialogOpen(false);
      resetForm();
      fetchMappings();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleEditMapping = async () => {
    if (!editingMapping) return;
    try {
      await skuMappingsDb.update(editingMapping.id, formData);
      toast({ title: 'Mapping Updated', description: 'SKU mapping has been updated successfully.' });
      setEditingMapping(null);
      fetchMappings();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const triggerHealthCheck = async (mappingId?: string) => {
    setCheckingHealth(mappingId || 'all');
    try {
      const { data, error } = await supabase.functions.invoke('product-health-check', {
        body: mappingId ? { mapping_id: mappingId } : {},
      });
      if (error) throw error;
      toast({
        title: '✅ Health Check Complete',
        description: `Checked ${data.checked} products. ${data.statusChanges} status changes detected.`,
      });
    } catch (err: any) {
      toast({ title: 'Health Check Failed', description: err.message, variant: 'destructive' });
    } finally {
      setCheckingHealth(null);
    }
  };

  const mappedCount = mappings.filter(m => getMappingStatus(m) === 'mapped').length;
  const partialCount = mappings.filter(m => getMappingStatus(m) === 'partially_mapped').length;
  const unmappedCount = mappings.filter(m => getMappingStatus(m) === 'unmapped').length;
  const urlConfiguredCount = mappings.filter(m => getUrlCount(m) > 0).length;
  const coveragePercent = mappings.length > 0 ? Math.round(((mappedCount * 6 + partialCount * 3) / (mappings.length * 6)) * 100) : 0;

  const skuField = (label: string, icon: string, placeholder: string, field: string, disabled?: boolean) => (
    <div className="space-y-2">
      <Label>{icon} {label}</Label>
      <Input value={(formData as any)[field] || ''} onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))} placeholder={placeholder} disabled={disabled} />
    </div>
  );

  const urlField = (label: string, icon: string, placeholder: string, field: string) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-muted-foreground" />{icon} {label}</Label>
      <Input value={(formData as any)[field] || ''} onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))} placeholder={placeholder} type="url" />
    </div>
  );

  const MappingFormContent = ({ isEdit }: { isEdit: boolean }) => (
    <Tabs defaultValue="skus">
      <TabsList className="mb-4">
        <TabsTrigger value="skus" className="gap-1.5"><Link className="w-3.5 h-3.5" />SKU Mapping</TabsTrigger>
        <TabsTrigger value="urls" className="gap-1.5"><Globe className="w-3.5 h-3.5" />Health Check URLs</TabsTrigger>
      </TabsList>
      <TabsContent value="skus">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            {skuField('Master SKU ID', '🔑', 'MSK-XXX', 'master_sku_id', isEdit)}
            {skuField('Product Name', '📋', 'Product name', 'product_name')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {skuField('Brand', '🏷️', 'Brand name', 'brand')}
            <div />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {skuField('Amazon SKU', '🛒', 'SKU-AMZ-XXX', 'amazon_sku')}
            {skuField('Flipkart SKU', '🛍️', 'SKU-FLK-XXX', 'flipkart_sku')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {skuField('Meesho SKU', '📦', 'SKU-MSH-XXX', 'meesho_sku')}
            {skuField('FirstCry SKU', '👶', 'SKU-FCY-XXX', 'firstcry_sku')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {skuField('Blinkit SKU', '⚡', 'SKU-BLK-XXX', 'blinkit_sku')}
            {skuField('Own Website SKU', '🌐', 'SKU-OWN-XXX', 'own_website_sku')}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="urls">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Enter product page URLs for automated health checking. The system will check these URLs every 8 hours to determine if products are active on each portal.</p>
          <div className="grid gap-4">
            {PORTAL_URL_FIELDS.map(f => (
              <div key={f.key}>
                {urlField(f.label, f.icon, f.placeholder, f.key)}
              </div>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SKU Mapping Center</h1>
          <p className="text-muted-foreground">Map marketplace SKUs to a single internal master SKU</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search SKUs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-[180px] pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as MappingStatus | 'all')}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="partially_mapped">Partially Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-1.5" onClick={() => triggerHealthCheck()} disabled={!!checkingHealth}>
            {checkingHealth === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Run Health Check
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Mapping</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add SKU Mapping</DialogTitle>
                <DialogDescription>Map portal-specific SKUs and configure health check URLs</DialogDescription>
              </DialogHeader>
              <MappingFormContent isEdit={false} />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleAddMapping}>Create Mapping</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Link className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{mappings.length}</p><p className="text-sm text-muted-foreground">Total SKUs</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Link className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{mappedCount}</p><p className="text-sm text-muted-foreground">Fully Mapped</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertCircle className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{partialCount}</p><p className="text-sm text-muted-foreground">Partial</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><Unlink className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{unmappedCount}</p><p className="text-sm text-muted-foreground">Unmapped</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Globe className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{urlConfiguredCount}</p><p className="text-sm text-muted-foreground">URLs Set</p></div></div></CardContent></Card>
        <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-6"><div className="text-center"><p className="text-3xl font-bold text-primary">{coveragePercent}%</p><p className="text-sm text-muted-foreground">Coverage</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SKU Mapping List</CardTitle>
          <CardDescription>View and manage portal SKU mappings • {filteredMappings.length} items</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Master SKU</TableHead>
                    <TableHead className="font-semibold">Product Name</TableHead>
                    <TableHead className="font-semibold">Brand</TableHead>
                    <TableHead className="text-center font-semibold">🛒 Amazon</TableHead>
                    <TableHead className="text-center font-semibold">🛍️ Flipkart</TableHead>
                    <TableHead className="text-center font-semibold">📦 Meesho</TableHead>
                    <TableHead className="text-center font-semibold">👶 FirstCry</TableHead>
                    <TableHead className="text-center font-semibold">⚡ Blinkit</TableHead>
                    <TableHead className="text-center font-semibold">🌐 Own Web</TableHead>
                    <TableHead className="font-semibold">Coverage</TableHead>
                    <TableHead className="font-semibold">URLs</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.map((mapping) => {
                    const count = getMappedCount(mapping);
                    const urls = getUrlCount(mapping);
                    const status = getMappingStatus(mapping);
                    const skuCell = (sku?: string) => (
                      <TableCell className="text-center">
                        {sku ? <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{sku}</span> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    );
                    return (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-mono text-sm font-medium">{mapping.master_sku_id}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">{mapping.product_name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{mapping.brand || '—'}</Badge></TableCell>
                        {skuCell(mapping.amazon_sku)}
                        {skuCell(mapping.flipkart_sku)}
                        {skuCell(mapping.meesho_sku)}
                        {skuCell(mapping.firstcry_sku)}
                        {skuCell(mapping.blinkit_sku)}
                        {skuCell(mapping.own_website_sku)}
                        <TableCell><span className="text-sm font-medium">{count}/6</span></TableCell>
                        <TableCell>
                          {urls > 0 ? (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 text-xs">
                              <Globe className="w-3 h-3" />{urls}
                            </Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>{statusBadge(status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingMapping(mapping);
                              setFormData({
                                master_sku_id: mapping.master_sku_id,
                                product_name: mapping.product_name,
                                brand: mapping.brand || '',
                                amazon_sku: mapping.amazon_sku || '',
                                flipkart_sku: mapping.flipkart_sku || '',
                                meesho_sku: mapping.meesho_sku || '',
                                firstcry_sku: mapping.firstcry_sku || '',
                                blinkit_sku: mapping.blinkit_sku || '',
                                own_website_sku: mapping.own_website_sku || '',
                                amazon_url: mapping.amazon_url || '',
                                flipkart_url: mapping.flipkart_url || '',
                                meesho_url: mapping.meesho_url || '',
                                firstcry_url: mapping.firstcry_url || '',
                                blinkit_url: mapping.blinkit_url || '',
                                own_website_url: mapping.own_website_url || '',
                              });
                            }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {urls > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => triggerHealthCheck(mapping.id)}
                                disabled={!!checkingHealth}
                                title="Check health now"
                              >
                                {checkingHealth === mapping.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-primary" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredMappings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                        <Unlink className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No mappings found</p>
                        <p className="text-sm">Try adjusting your filters or add a new mapping</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingMapping} onOpenChange={(open) => { if (!open) { setEditingMapping(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SKU Mapping</DialogTitle>
            <DialogDescription>Update portal SKUs and health check URLs for {editingMapping?.product_name}</DialogDescription>
          </DialogHeader>
          <MappingFormContent isEdit={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMapping(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleEditMapping}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
