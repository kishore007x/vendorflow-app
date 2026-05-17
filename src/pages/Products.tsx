import { useState, useEffect, useMemo } from 'react';
import { productsDb, dropdownOptionsDb } from '@/services/database';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';
import { Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExcelProductUpload } from '@/components/ExcelProductUpload';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, Plus, Package, Edit, Eye, Video, Image, CheckCircle, XCircle, Upload, FileSpreadsheet, 
  ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ToggleLeft, Filter, Link2, Copy, FileText, DollarSign,
} from 'lucide-react';

type SortField = 'name' | 'basePrice' | 'masterSkuId' | 'status' | 'margin';
type SortDir = 'asc' | 'desc';
type Portal = 'amazon' | 'flipkart' | 'meesho' | 'firstcry' | 'blinkit' | 'own_website';
const PORTALS: Portal[] = ['amazon', 'flipkart', 'meesho', 'firstcry', 'blinkit', 'own_website'];

export default function Products() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Image/video upload simulation state
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productVideo, setProductVideo] = useState<string | null>(null);

  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ name: '', masterSku: '', brand: '', category: '', hsn: '', mrp: '', basePrice: '', gst: '' });

  const { options: brandOptions } = useDropdownOptions('brand');
  const { options: categoryOptions } = useDropdownOptions('category');
  const { options: sizeOptions } = useDropdownOptions('size');
  const [newBrandName, setNewBrandName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingSize, setAddingSize] = useState(false);
  const [localBrands, setLocalBrands] = useState<{ label: string; value: string }[]>([]);
  const [localCategories, setLocalCategories] = useState<{ label: string; value: string }[]>([]);
  const [localSizes, setLocalSizes] = useState<{ label: string; value: string }[]>([]);

  // Bulk actions state (from Catalog Manager)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [isBulkPortalOpen, setIsBulkPortalOpen] = useState(false);
  const [bulkPriceAction, setBulkPriceAction] = useState<'fixed' | 'percent'>('percent');
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'active' | 'inactive'>('active');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => { setLocalBrands(brandOptions); }, [brandOptions]);
  useEffect(() => { setLocalCategories(categoryOptions); }, [categoryOptions]);
  useEffect(() => { setLocalSizes(sizeOptions); }, [sizeOptions]);

  const handleAddDropdownItem = async (fieldType: string, name: string, setLocal: React.Dispatch<React.SetStateAction<{label:string;value:string}[]>>, setNew: React.Dispatch<React.SetStateAction<string>>, setAdding: React.Dispatch<React.SetStateAction<boolean>>, formKey?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await dropdownOptionsDb.create({ field_type: fieldType, label: trimmed, value: trimmed });
      setLocal(prev => [...prev, { label: trimmed, value: trimmed }]);
      if (formKey) setFormData(f => ({ ...f, [formKey]: trimmed }));
      setNew('');
      toast({ title: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Added`, description: `"${trimmed}" has been added.` });
    } catch { toast({ title: 'Error', description: `Failed to add ${fieldType}`, variant: 'destructive' }); }
    setAdding(false);
  };

  const [allProducts, setAllProducts] = useState<any[]>([]);

  const fetchProducts = async () => {
    try {
      const data = await productsDb.getAll();
      setAllProducts(data.map((p: any) => ({
        ...p, productId: p.id, masterSkuId: p.sku, name: p.name,
        brand: p.brand || '', category: p.category || '', hsnCode: p.hsn_code || '',
        mrp: p.mrp ?? 0, basePrice: p.base_price ?? 0, gstPercent: p.gst_percent ?? 0,
        status: p.status || 'active', createdAt: p.created_at,
        portalsEnabled: p.portals_enabled || [],
        imageUrl: p.image_url,
      })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const categories = useMemo(() => {
    const unique = new Set(allProducts.map((p: any) => p.category as string).filter(Boolean));
    return Array.from(unique);
  }, [allProducts]);

  // Duplicate detection
  const duplicateSkus = useMemo(() => {
    const skuCount: Record<string, number> = {};
    allProducts.forEach((p: any) => {
      skuCount[p.masterSkuId] = (skuCount[p.masterSkuId] || 0) + 1;
    });
    return Object.entries(skuCount).filter(([, c]) => c > 1).map(([sku]) => sku);
  }, [allProducts]);

  const getMargin = (p: any) => p.mrp > 0 ? ((p.mrp - p.basePrice) / p.mrp) * 100 : 0;

  const filteredProducts = useMemo(() => {
    let results = allProducts.filter((product: any) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.masterSkuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    results.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'basePrice': cmp = a.basePrice - b.basePrice; break;
        case 'masterSkuId': cmp = a.masterSkuId.localeCompare(b.masterSkuId); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'margin': cmp = getMargin(a) - getMargin(b); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return results;
  }, [searchQuery, categoryFilter, statusFilter, sortField, sortDir, allProducts]);

  const allSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(filteredProducts.map(p => p.productId));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const stats = useMemo(() => ({
    total: allProducts.length,
    active: allProducts.filter((p: any) => p.status === 'active').length,
    inactive: allProducts.filter((p: any) => p.status === 'inactive').length,
    duplicates: duplicateSkus.length,
  }), [allProducts, duplicateSkus]);

  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleImageUpload = () => {
    setProductImage('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200');
    toast({ title: 'Image uploaded', description: 'Product image preview ready.' });
  };

  const handleVideoUpload = () => {
    setProductVideo('product-demo.mp4');
    toast({ title: 'Video uploaded', description: 'Product video preview ready.' });
  };

  const validateProductForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.masterSku.trim()) errors.masterSku = 'Master SKU is required';
    if (!formData.brand) errors.brand = 'Brand is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.hsn.trim()) errors.hsn = 'HSN Code is required';
    if (!formData.mrp || parseFloat(formData.mrp) <= 0) errors.mrp = 'MRP must be greater than 0';
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) errors.basePrice = 'Base price must be greater than 0';
    if (formData.mrp && formData.basePrice && parseFloat(formData.mrp) < parseFloat(formData.basePrice)) {
      errors.basePrice = 'Base price cannot exceed MRP';
    }
    if (!formData.gst) errors.gst = 'GST % is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) {
      toast({ title: 'Validation Error', description: 'Please fix the highlighted errors before submitting.', variant: 'destructive' });
      return;
    }
    try {
      await productsDb.create({
        name: formData.name,
        sku: formData.masterSku,
        brand: formData.brand,
        category: formData.category,
        hsn_code: formData.hsn,
        mrp: parseFloat(formData.mrp),
        base_price: parseFloat(formData.basePrice),
        gst_percent: parseFloat(formData.gst),
        status: 'active',
        image_url: productImage || null,
      });
      toast({ title: 'Product Created', description: 'New product added to catalog.' });
      setIsAddDialogOpen(false);
      setFormData({ name: '', masterSku: '', brand: '', category: '', hsn: '', mrp: '', basePrice: '', gst: '' });
      setFormErrors({});
      setProductImage(null);
      setProductVideo(null);
      await fetchProducts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create product', variant: 'destructive' });
    }
  };

  // Bulk actions (from Catalog Manager)
  const handleBulkPriceUpdate = async () => {
    try {
      const value = parseFloat(bulkPriceValue);
      if (isNaN(value)) return;
      for (const id of selectedIds) {
        const product = allProducts.find(p => p.productId === id);
        if (!product) continue;
        const newPrice = bulkPriceAction === 'fixed' ? value : product.basePrice * (1 + value / 100);
        await productsDb.update(id, { base_price: Math.round(newPrice * 100) / 100 });
      }
      await fetchProducts();
      toast({ title: 'Prices Updated', description: `${selectedIds.length} products updated.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsBulkPriceOpen(false);
    setBulkPriceValue('');
  };

  const handleBulkStatusUpdate = async () => {
    try {
      for (const id of selectedIds) {
        await productsDb.update(id, { status: bulkStatus });
      }
      await fetchProducts();
      toast({ title: 'Status Updated', description: `${selectedIds.length} products set to ${bulkStatus}.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsBulkStatusOpen(false);
  };

  const handleBulkPortalToggle = (portal: Portal, action: 'enable' | 'disable') => {
    toast({ title: `Portal ${action === 'enable' ? 'Enabled' : 'Disabled'}`, description: `${portal} ${action}d for ${selectedIds.length} products.` });
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? filteredProducts.filter(p => selectedIds.includes(p.productId))
      : filteredProducts;

    if (dataToExport.length === 0) {
      toast({ title: 'No Data', description: 'No products to export.', variant: 'destructive' });
      return;
    }

    const headers = ['Product Name', 'SKU', 'Brand', 'Category', 'HSN Code', 'MRP', 'Base Price', 'GST %', 'Status', 'Portals Enabled'];
    const rows = dataToExport.map(p => [
      p.name || '', p.masterSkuId || '', p.brand || '', p.category || '', p.hsnCode || '',
      p.mrp || 0, p.basePrice || 0, p.gstPercent || 0, p.status || '',
      (p.portalsEnabled || []).join(', '),
    ]);

    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${dataToExport.length} products exported as CSV.` });
  };

  const handleGenerateShareLink = () => {
    const link = `${window.location.origin}/catalog/public/${Date.now().toString(36)}`;
    setShareLink(link);
    toast({ title: 'Public Catalog Link Generated', description: 'Read-only catalog link created.' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: 'Link Copied', description: 'Catalog share link copied to clipboard.' });
  };

  const isFormValid = formData.name && formData.masterSku && formData.brand && formData.category && formData.hsn && formData.mrp && formData.basePrice && formData.gst;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Catalog</h1>
          <p className="text-muted-foreground">Manage products, pricing, bulk actions & portal visibility</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" size="sm" onClick={handleGenerateShareLink}>
            <Link2 className="w-4 h-4" />Share
          </Button>
          <Button variant="outline" className="gap-2" size="sm" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4" />Export
          </Button>
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" size="sm">
                <Upload className="w-4 h-4" />Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Bulk Product Upload</DialogTitle>
              </DialogHeader>
              <ExcelProductUpload onClose={() => setIsBulkUploadOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="sm">
                <Plus className="w-4 h-4" />Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="excel">Excel Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="manual">
                  <form className="space-y-5" onSubmit={handleProductSubmit}>
                    {/* Basic Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name *</Label>
                          <Input id="name" placeholder="Enter product name" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className={formErrors.name ? 'border-destructive' : ''} />
                          {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="masterSku">Master SKU ID *</Label>
                          <Input id="masterSku" placeholder="e.g. MSKU-009" value={formData.masterSku} onChange={e => setFormData(f => ({ ...f, masterSku: e.target.value }))} className={formErrors.masterSku ? 'border-destructive' : ''} />
                          {formErrors.masterSku && <p className="text-xs text-destructive">{formErrors.masterSku}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="brand">Brand *</Label>
                          <Select value={formData.brand} onValueChange={v => { if (v !== '__add_new__') setFormData(f => ({ ...f, brand: v })); }}>
                            <SelectTrigger className={formErrors.brand ? 'border-destructive' : ''}><SelectValue placeholder="Select brand" /></SelectTrigger>
                            <SelectContent>
                              {localBrands.map(b => (
                                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                              ))}
                              <div className="border-t border-border mt-1 pt-1 px-2 pb-1">
                                <div className="flex items-center gap-2">
                                  <Input placeholder="New brand name" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} className="h-8 text-sm"
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddDropdownItem('brand', newBrandName, setLocalBrands, setNewBrandName, setAddingBrand, 'brand'); } }}
                                  />
                                  <Button size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={() => handleAddDropdownItem('brand', newBrandName, setLocalBrands, setNewBrandName, setAddingBrand, 'brand')} disabled={addingBrand || !newBrandName.trim()}>
                                    <Plus className="w-3 h-3" /> Add
                                  </Button>
                                </div>
                              </div>
                            </SelectContent>
                          </Select>
                          {formErrors.brand && <p className="text-xs text-destructive">{formErrors.brand}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category *</Label>
                          <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                            <SelectTrigger className={formErrors.category ? 'border-destructive' : ''}><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {localCategories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                              <div className="border-t border-border mt-1 pt-1 px-2 pb-1">
                                <div className="flex items-center gap-2">
                                  <Input placeholder="New category" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="h-8 text-sm"
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddDropdownItem('category', newCategoryName, setLocalCategories, setNewCategoryName, setAddingCategory, 'category'); } }}
                                  />
                                  <Button size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={() => handleAddDropdownItem('category', newCategoryName, setLocalCategories, setNewCategoryName, setAddingCategory, 'category')} disabled={addingCategory || !newCategoryName.trim()}>
                                    <Plus className="w-3 h-3" /> Add
                                  </Button>
                                </div>
                              </div>
                            </SelectContent>
                          </Select>
                          {formErrors.category && <p className="text-xs text-destructive">{formErrors.category}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hsn">HSN Code *</Label>
                          <Input id="hsn" placeholder="e.g. 8518" value={formData.hsn} onChange={e => setFormData(f => ({ ...f, hsn: e.target.value }))} className={formErrors.hsn ? 'border-destructive' : ''} />
                          {formErrors.hsn && <p className="text-xs text-destructive">{formErrors.hsn}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Size */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing, Size & Tax</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>MRP (₹) *</Label>
                          <Input type="number" placeholder="0.00" value={formData.mrp} onChange={e => setFormData(f => ({ ...f, mrp: e.target.value }))} className={formErrors.mrp ? 'border-destructive' : ''} />
                          {formErrors.mrp && <p className="text-xs text-destructive">{formErrors.mrp}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Base Price (₹) *</Label>
                          <Input type="number" placeholder="0.00" value={formData.basePrice} onChange={e => setFormData(f => ({ ...f, basePrice: e.target.value }))} className={formErrors.basePrice ? 'border-destructive' : ''} />
                          {formErrors.basePrice && <p className="text-xs text-destructive">{formErrors.basePrice}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>GST % *</Label>
                          <Select value={formData.gst} onValueChange={v => setFormData(f => ({ ...f, gst: v }))}>
                            <SelectTrigger className={formErrors.gst ? 'border-destructive' : ''}><SelectValue placeholder="Select GST" /></SelectTrigger>
                            <SelectContent>
                              {[0, 5, 12, 18, 28].map(g => (
                                <SelectItem key={g} value={String(g)}>{g}%</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formErrors.gst && <p className="text-xs text-destructive">{formErrors.gst}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Size</Label>
                          <Select defaultValue="free_size">
                            <SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger>
                            <SelectContent>
                              {localSizes.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                              <div className="border-t border-border mt-1 pt-1 px-2 pb-1">
                                <div className="flex items-center gap-2">
                                  <Input placeholder="New size" value={newSizeName} onChange={e => setNewSizeName(e.target.value)} className="h-8 text-sm"
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddDropdownItem('size', newSizeName, setLocalSizes, setNewSizeName, setAddingSize); } }}
                                  />
                                  <Button size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={() => handleAddDropdownItem('size', newSizeName, setLocalSizes, setNewSizeName, setAddingSize)} disabled={addingSize || !newSizeName.trim()}>
                                    <Plus className="w-3 h-3" /> Add
                                  </Button>
                                </div>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* GST Split Preview */}
                      {formData.basePrice && formData.gst && (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">GST Split Preview (Same State)</h4>
                          <div className="grid grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Taxable Value</p>
                              <p className="font-medium">₹{(parseFloat(formData.basePrice) / (1 + parseFloat(formData.gst) / 100)).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">CGST ({parseFloat(formData.gst) / 2}%)</p>
                              <p className="font-medium">₹{((parseFloat(formData.basePrice) / (1 + parseFloat(formData.gst) / 100)) * (parseFloat(formData.gst) / 200)).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">SGST ({parseFloat(formData.gst) / 2}%)</p>
                              <p className="font-medium">₹{((parseFloat(formData.basePrice) / (1 + parseFloat(formData.gst) / 100)) * (parseFloat(formData.gst) / 200)).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="font-medium">₹{parseFloat(formData.basePrice).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portal Prices */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Portal-wise Selling Price</h3>
                      <div className="grid grid-cols-5 gap-3">
                        {['Amazon', 'Flipkart', 'Meesho', 'Website', 'Blinkit'].map(portal => (
                          <div key={portal} className="space-y-1">
                            <Label className="text-xs">{portal} (₹)</Label>
                            <Input type="number" placeholder="0.00" className="h-9 text-sm" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Description & Features */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea placeholder="Product description" rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Product Features (multi-line)</Label>
                        <Textarea placeholder="Feature 1&#10;Feature 2&#10;Feature 3" rows={3} />
                      </div>
                    </div>

                    {/* Media Upload */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Media</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Product Image</Label>
                          {productImage ? (
                            <div className="relative border rounded-lg p-2">
                              <img src={productImage} alt="Preview" className="w-full h-32 object-cover rounded" />
                              <div className="flex gap-2 mt-2">
                                <Button type="button" size="sm" variant="outline" onClick={handleImageUpload}>Replace</Button>
                                <Button type="button" size="sm" variant="destructive" onClick={() => setProductImage(null)}>Remove</Button>
                              </div>
                            </div>
                          ) : (
                            <div onClick={handleImageUpload} className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                              <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">Click to upload image</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Product Video (Optional)</Label>
                          {productVideo ? (
                            <div className="border rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Video className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium">{productVideo}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={handleVideoUpload}>Replace</Button>
                                <Button type="button" size="sm" variant="destructive" onClick={() => setProductVideo(null)}>Remove</Button>
                              </div>
                            </div>
                          ) : (
                            <div onClick={handleVideoUpload} className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                              <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">Click to upload video</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setFormErrors({}); }}>Cancel</Button>
                      <Button type="submit" disabled={!isFormValid}>Create Product</Button>
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="excel">
                  <ExcelProductUpload onClose={() => setIsAddDialogOpen(false)} />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Share Link Banner */}
      {shareLink && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center gap-3">
            <Link2 className="w-4 h-4 text-primary shrink-0" />
            <code className="text-xs flex-1 truncate text-primary">{shareLink}</code>
            <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={handleCopyLink}>
              <Copy className="w-3 h-3" />Copy
            </Button>
            <Badge variant="outline" className="text-xs">Read-Only</Badge>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Package className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Products</p></div></div></CardContent></Card>
        <Card className="bg-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-sm text-muted-foreground">Active</p></div></div></CardContent></Card>
        <Card className="bg-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><XCircle className="w-5 h-5 text-muted-foreground" /></div><div><p className="text-2xl font-bold">{stats.inactive}</p><p className="text-sm text-muted-foreground">Inactive</p></div></div></CardContent></Card>
        <Card className="bg-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.duplicates}</p><p className="text-sm text-muted-foreground">Duplicate SKUs</p></div></div></CardContent></Card>
        <Card className="bg-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><DollarSign className="w-5 h-5 text-info" /></div><div><p className="text-2xl font-bold">{selectedIds.length}</p><p className="text-sm text-muted-foreground">Selected</p></div></div></CardContent></Card>
      </div>

      {/* Filters & Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, SKU, or brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat: string) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.length > 0 && (
              <>
                <div className="h-6 w-px bg-border" />
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsBulkPriceOpen(true)}>
                  <Edit className="w-3.5 h-3.5" />Bulk Price
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsBulkStatusOpen(true)}>
                  <ToggleLeft className="w-3.5 h-3.5" />Bulk Status
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsBulkPortalOpen(true)}>
                  <Filter className="w-3.5 h-3.5" />Portal Toggle
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    <span className="flex items-center">Product <SortIcon field="name" /></span>
                  </TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('masterSkuId')}>
                    <span className="flex items-center">Master SKU <SortIcon field="masterSkuId" /></span>
                  </TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">HSN</TableHead>
                  <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort('basePrice')}>
                    <span className="flex items-center justify-end">MRP / Base <SortIcon field="basePrice" /></span>
                  </TableHead>
                  <TableHead className="font-semibold text-right">GST</TableHead>
                  <TableHead className="font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort('margin')}>
                    <span className="flex items-center justify-end">Margin <SortIcon field="margin" /></span>
                  </TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="flex items-center">Status <SortIcon field="status" /></span>
                  </TableHead>
                  <TableHead className="font-semibold">Portals</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const margin = getMargin(product);
                  const isDuplicate = duplicateSkus.includes(product.masterSkuId);
                  return (
                    <TableRow key={product.productId} className={`hover:bg-muted/30 ${selectedIds.includes(product.productId) ? 'bg-primary/5' : ''}`}>
                      <TableCell>
                        <Checkbox checked={selectedIds.includes(product.productId)} onCheckedChange={() => toggleOne(product.productId)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium">{product.name}</p>
                              {isDuplicate && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">DUPLICATE</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.masterSkuId}</TableCell>
                      <TableCell><Badge variant="secondary">{product.category || 'Uncategorized'}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{product.hsnCode}</TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.mrp)}</p>
                          <p className="font-medium">{formatCurrency(product.basePrice)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{product.gstPercent}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className={margin > 30 ? 'bg-emerald-500/10 text-emerald-600' : margin > 15 ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'}>
                          {margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={product.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}>
                          {product.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {product.portalsEnabled.slice(0, 3).map((p: string) => (
                            <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{p}</Badge>
                          ))}
                          {product.portalsEnabled.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{product.portalsEnabled.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedProduct(product)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-20 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProduct.brand || 'No brand'}</p>
                  <Badge variant="secondary" className={selectedProduct.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 mt-1' : 'bg-muted text-muted-foreground mt-1'}>
                    {selectedProduct.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">SKU</p>
                  <p className="font-mono font-medium">{selectedProduct.masterSkuId}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">Category</p>
                  <p className="font-medium">{selectedProduct.category || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">MRP</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedProduct.mrp)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">Base Price</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedProduct.basePrice)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">HSN Code</p>
                  <p className="font-medium">{selectedProduct.hsnCode || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">GST %</p>
                  <p className="font-medium">{selectedProduct.gstPercent || 18}%</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Enabled Portals</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(selectedProduct.portalsEnabled || []).map((p: string) => (
                    <Badge key={p} variant="outline" className="capitalize">{p}</Badge>
                  ))}
                  {(!selectedProduct.portalsEnabled || selectedProduct.portalsEnabled.length === 0) && (
                    <span className="text-sm text-muted-foreground">No portals enabled</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Price Dialog */}
      <Dialog open={isBulkPriceOpen} onOpenChange={setIsBulkPriceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Edit Price ({selectedIds.length} products)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Update Type</Label>
              <Select value={bulkPriceAction} onValueChange={(v: 'fixed' | 'percent') => setBulkPriceAction(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage Change</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{bulkPriceAction === 'percent' ? 'Change %' : 'New Price (₹)'}</Label>
              <Input type="number" value={bulkPriceValue} onChange={e => setBulkPriceValue(e.target.value)} placeholder={bulkPriceAction === 'percent' ? 'e.g. -10' : '0.00'} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBulkPriceOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkPriceUpdate}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={isBulkStatusOpen} onOpenChange={setIsBulkStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Status Update ({selectedIds.length} products)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={bulkStatus} onValueChange={(v: 'active' | 'inactive') => setBulkStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBulkStatusOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkStatusUpdate}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Portal Toggle Dialog */}
      <Dialog open={isBulkPortalOpen} onOpenChange={setIsBulkPortalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Portal Visibility ({selectedIds.length} products)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {PORTALS.map(portal => (
              <div key={portal} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="capitalize font-medium">{portal.replace('_', ' ')}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkPortalToggle(portal, 'enable')}>Enable</Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkPortalToggle(portal, 'disable')}>Disable</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
