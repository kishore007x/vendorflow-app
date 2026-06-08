import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productHealthDb } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { ProductHealthStatus, Portal } from '@/types';
import { Activity, CheckCircle2, XCircle, Package, Search, AlertCircle, Loader2, RefreshCw, Clock, Star, MessageSquare, ExternalLink, Link2, Globe, IndianRupee, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { DateFilter, ExportButton, useRowSelection, SelectAllCheckbox, RowCheckbox } from '@/components/TableEnhancements';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const statusConfig: Record<ProductHealthStatus, { label: string; icon: React.ElementType; className: string }> = {
  live: { label: 'Live', icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  not_active: { label: 'Not Active', icon: XCircle, className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  out_of_stock: { label: 'Out of Stock', icon: Package, className: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
};

const channelIcons: Record<string, { emoji: string; color: string; bg: string }> = {
  amazon: { emoji: '📦', color: 'text-orange-600', bg: 'bg-orange-500/10' },
  flipkart: { emoji: '🛒', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  meesho: { emoji: '🛍️', color: 'text-pink-600', bg: 'bg-pink-500/10' },
  firstcry: { emoji: '👶', color: 'text-teal-600', bg: 'bg-teal-500/10' },
  blinkit: { emoji: '⚡', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
};

function getOverallStatus(portalStatus: Record<string, string>): ProductHealthStatus {
  const values = Object.values(portalStatus);
  if (values.length === 0) return 'not_active';
  if (values.every(s => s === 'live')) return 'live';
  if (values.some(s => s === 'out_of_stock')) return 'out_of_stock';
  return 'not_active';
}

export default function ProductHealth() {
  const [products, setProducts] = useState<any[]>([]);
  const [skuMappings, setSkuMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortal, setSelectedPortal] = useState<Portal | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ProductHealthStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('30days');
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthData, mappingsData] = await Promise.all([
        productHealthDb.getAll(searchQuery ? { search: searchQuery } : undefined),
        supabase.from('sku_mappings').select('*').then(r => r.data || []),
      ]);
      setProducts(healthData);
      setSkuMappings(mappingsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [searchQuery]);

  const triggerHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('product-health-check', { body: {} });
      if (error) throw error;
      toast({ title: 'Health Check Complete', description: data?.message || 'All products checked.' });
      await fetchData();
    } catch (e: any) {
      toast({ title: 'Health Check Failed', description: e.message, variant: 'destructive' });
    } finally {
      setCheckingHealth(false);
    }
  };

  const filteredProducts = useMemo(() => products.filter(product => {
    const ps = (product.portal_status || {}) as Record<string, string>;
    if (selectedPortal !== 'all' && selectedStatus !== 'all') return ps[selectedPortal] === selectedStatus;
    if (selectedPortal !== 'all') return selectedPortal in ps;
    if (selectedStatus !== 'all') return getOverallStatus(ps) === selectedStatus;
    return true;
  }), [products, selectedPortal, selectedStatus]);

  const rowSelection = useRowSelection(filteredProducts.map(p => p.id));

  const getStatusBadge = (status: ProductHealthStatus) => {
    const config = statusConfig[status];
    if (!config) return null;
    const Icon = config.icon;
    return <Badge variant="outline" className={`${config.className} gap-1 font-medium`}><Icon className="w-3 h-3" />{config.label}</Badge>;
  };

  const liveCount = products.filter(p => getOverallStatus((p.portal_status || {}) as Record<string, string>) === 'live').length;
  const partialCount = products.filter(p => {
    const values = Object.values(p.portal_status || {}) as string[];
    return values.some(s => s === 'live') && values.some(s => s !== 'live');
  }).length;
  const outOfStockCount = products.filter(p => Object.values(p.portal_status || {}).some((s: any) => s === 'out_of_stock')).length;
  const healthScore = products.length > 0 ? Math.round((products.reduce((sum, p) => {
    const vals = Object.values(p.portal_status || {}) as string[];
    const live = vals.filter(s => s === 'live').length;
    return sum + (vals.length > 0 ? live / vals.length : 0);
  }, 0) / products.length) * 100) : 100;

  // Channel summary for the channel details tab
  const channelSummary = useMemo(() => {
    return getChannels().map(portal => {
      const productsOnChannel = products.filter(p => {
        const ps = (p.portal_status || {}) as Record<string, string>;
        return portal.id in ps;
      });
      const liveOnChannel = productsOnChannel.filter(p => {
        const ps = (p.portal_status || {}) as Record<string, string>;
        return ps[portal.id] === 'live';
      }).length;
      const oosOnChannel = productsOnChannel.filter(p => {
        const ps = (p.portal_status || {}) as Record<string, string>;
        return ps[portal.id] === 'out_of_stock';
      }).length;
      const mappingsForChannel = skuMappings.filter(m => m[`${portal.id}_sku`]);
      return {
        ...portal,
        totalProducts: productsOnChannel.length,
        liveProducts: liveOnChannel,
        oosProducts: oosOnChannel,
        notActiveProducts: productsOnChannel.length - liveOnChannel - oosOnChannel,
        mappedSkus: mappingsForChannel.length,
        healthPct: productsOnChannel.length > 0 ? Math.round((liveOnChannel / productsOnChannel.length) * 100) : 0,
      };
    });
  }, [products, skuMappings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Health Check</h1>
          <p className="text-muted-foreground">Monitor product visibility, URLs & ratings across all channels</p>
          {products.some(p => p.last_checked_at) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Last checked: {format(new Date(products.find(p => p.last_checked_at)?.last_checked_at), 'dd MMM yyyy, hh:mm a')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" className="gap-1.5" onClick={triggerHealthCheck} disabled={checkingHealth}>
            {checkingHealth ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Check Now
          </Button>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-[200px] pl-9" />
          </div>
          <Select value={selectedPortal} onValueChange={v => setSelectedPortal(v as Portal | 'all')}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Select Portal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portals</SelectItem>
              {getChannels().map(p => <SelectItem key={p.id} value={p.id}><ChannelIcon channelId={p.id} fallbackIcon={p.icon} size={16} /> {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <ExportButton label={rowSelection.count > 0 ? undefined : 'Export'} selectedCount={rowSelection.count} data={filteredProducts} filename="product-health" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Activity className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{products.length}</p><p className="text-sm text-muted-foreground">Total Products</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{liveCount}</p><p className="text-sm text-muted-foreground">Fully Live</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><AlertCircle className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{partialCount}</p><p className="text-sm text-muted-foreground">Partially Live</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><Package className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{outOfStockCount}</p><p className="text-sm text-muted-foreground">Has OOS</p></div></div></CardContent></Card>
        <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-6"><div className="text-center"><p className="text-3xl font-bold text-primary">{healthScore}%</p><p className="text-sm text-muted-foreground">Health Score</p></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="health" className="gap-1.5"><Activity className="w-4 h-4" />Health Status</TabsTrigger>
          <TabsTrigger value="prices" className="gap-1.5"><IndianRupee className="w-4 h-4" />Price Comparison</TabsTrigger>
          <TabsTrigger value="urls" className="gap-1.5"><Link2 className="w-4 h-4" />Product URLs</TabsTrigger>
          <TabsTrigger value="channels" className="gap-1.5"><Globe className="w-4 h-4" />Channel Details</TabsTrigger>
        </TabsList>

        {/* Tab 1: Health Status (existing) */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Product Portal Status</CardTitle>
              <CardDescription>View product visibility across all marketplaces • {filteredProducts.length} products</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10"><SelectAllCheckbox checked={rowSelection.isAllSelected} onCheckedChange={rowSelection.toggleAll} /></TableHead>
                        <TableHead className="font-semibold">Product Name</TableHead>
                        <TableHead className="text-center font-semibold"><span className="flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" />Rating</span></TableHead>
                        <TableHead className="text-center font-semibold"><span className="flex items-center justify-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-primary" />Reviews</span></TableHead>
                        {getChannels().map(p => (
                          <TableHead key={p.id} className="text-center font-semibold">
                            <span className="flex items-center justify-center gap-1"><ChannelIcon channelId={p.id} fallbackIcon={p.icon} size={16} /> {p.name}</span>
                          </TableHead>
                        ))}
                        <TableHead className="text-center font-semibold bg-primary/5">Overall</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map(product => {
                        const ps = (product.portal_status || {}) as Record<string, string>;
                        const overall = getOverallStatus(ps);
                        const rating = product.rating != null ? Number(product.rating) : null;
                        const reviewCount = product.review_count ?? 0;
                        return (
                          <TableRow key={product.id} className={rowSelection.isSelected(product.id) ? 'bg-primary/5' : ''}>
                            <TableCell><RowCheckbox checked={rowSelection.isSelected(product.id)} onCheckedChange={() => rowSelection.toggle(product.id)} /></TableCell>
                            <TableCell className="font-medium">{product.product_name}</TableCell>
                            <TableCell className="text-center">
                              {rating !== null ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className={`inline-flex items-center gap-1 font-semibold text-sm ${rating >= 4 ? 'text-emerald-600' : rating >= 3 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        <Star className="w-3.5 h-3.5 fill-current" />{rating.toFixed(1)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{rating >= 4 ? 'Excellent' : rating >= 3 ? 'Average' : 'Needs Attention'}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-medium">{reviewCount > 0 ? reviewCount.toLocaleString('en-IN') : '—'}</span>
                            </TableCell>
                            {getChannels().map(p => (
                              <TableCell key={p.id} className="text-center">{getStatusBadge((ps[p.id] || 'not_active') as ProductHealthStatus)}</TableCell>
                            ))}
                            <TableCell className="text-center bg-primary/5">{getStatusBadge(overall)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No products found</p>
                            <p className="text-sm">Try adjusting your filters or add product health data</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Price Comparison */}
        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><IndianRupee className="w-5 h-5 text-primary" />Channel Price Comparison</CardTitle>
              <CardDescription>Compare selling prices across marketplaces • Identify pricing inconsistencies and margin opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : skuMappings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No Price Data Available</p>
                  <p className="text-sm mt-1">Add products via <strong>SKU Mapping</strong> to track channel-wise pricing.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Product Name</TableHead>
                        <TableHead className="font-semibold">Master SKU</TableHead>
                        <TableHead className="text-right font-semibold">MRP</TableHead>
                        {getChannels().map(p => {
                          const ch = channelIcons[p.id];
                          return (
                            <TableHead key={p.id} className="text-right font-semibold">
                              <span className="flex items-center justify-end gap-1">{ch?.emoji} {p.name}</span>
                            </TableHead>
                          );
                        })}
                        <TableHead className="text-center font-semibold bg-primary/5">
                          <span className="flex items-center justify-center gap-1"><ArrowUpDown className="w-3.5 h-3.5" />Spread</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skuMappings.map(mapping => {
                        const mrp = Number(mapping.mrp) || 0;
                        const channelPrices: { portal: string; price: number }[] = [];
                        getChannels().forEach(p => {
                          const price = Number(mapping[`${p.id}_price`]) || 0;
                          if (price > 0) channelPrices.push({ portal: p.id, price });
                        });
                        const minPrice = channelPrices.length > 0 ? Math.min(...channelPrices.map(cp => cp.price)) : 0;
                        const maxPrice = channelPrices.length > 0 ? Math.max(...channelPrices.map(cp => cp.price)) : 0;
                        const spread = maxPrice - minPrice;
                        const spreadPct = minPrice > 0 ? Math.round((spread / minPrice) * 100) : 0;

                        return (
                          <TableRow key={mapping.id}>
                            <TableCell className="font-medium max-w-[250px] truncate">{mapping.product_name}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{mapping.master_sku_id}</TableCell>
                            <TableCell className="text-right font-semibold text-sm">
                              {mrp > 0 ? `₹${mrp.toLocaleString('en-IN')}` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            {getChannels().map(p => {
                              const price = Number(mapping[`${p.id}_price`]) || 0;
                              const hasSku = !!mapping[`${p.id}_sku`];
                              const isLowest = price > 0 && price === minPrice && channelPrices.length > 1;
                              const isHighest = price > 0 && price === maxPrice && channelPrices.length > 1 && maxPrice !== minPrice;
                              const discountFromMrp = mrp > 0 && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

                              return (
                                <TableCell key={p.id} className="text-right">
                                  {price > 0 ? (
                                    <div className="space-y-0.5">
                                      <div className={`font-semibold text-sm flex items-center justify-end gap-1 ${isLowest ? 'text-emerald-600' : isHighest ? 'text-rose-600' : 'text-foreground'}`}>
                                        {isLowest && <TrendingDown className="w-3 h-3" />}
                                        {isHighest && <TrendingUp className="w-3 h-3" />}
                                        ₹{price.toLocaleString('en-IN')}
                                      </div>
                                      {discountFromMrp > 0 && (
                                        <span className="text-[10px] text-muted-foreground">{discountFromMrp}% off MRP</span>
                                      )}
                                    </div>
                                  ) : hasSku ? (
                                    <span className="text-xs text-amber-600">No price set</span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center bg-primary/5">
                              {channelPrices.length >= 2 ? (
                                <div className="space-y-0.5">
                                  <span className={`font-bold text-sm ${spreadPct > 10 ? 'text-rose-600' : spreadPct > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    ₹{spread.toLocaleString('en-IN')}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground">{spreadPct}% variance</p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Product URLs per Channel */}
        <TabsContent value="urls">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" />Product URLs by Channel</CardTitle>
              <CardDescription>View and manage product listing URLs across all ecommerce channels for health monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : skuMappings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No Product URLs Configured</p>
                  <p className="text-sm mt-1">Go to <strong>SKU Mapping</strong> to add product URLs for each channel.</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => window.location.href = '/sku-mapping'}>
                    <ExternalLink className="w-4 h-4" />Go to SKU Mapping
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Product Name</TableHead>
                        <TableHead className="font-semibold">Master SKU</TableHead>
                        {getChannels().map(p => {
                          const ch = channelIcons[p.id];
                          return (
                            <TableHead key={p.id} className="text-center font-semibold">
                              <span className="flex items-center justify-center gap-1">
                                {ch?.emoji} {p.name}
                              </span>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skuMappings.map(mapping => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium max-w-[250px] truncate">{mapping.product_name}</TableCell>
                          <TableCell className="font-mono text-sm">{mapping.master_sku_id}</TableCell>
                          {getChannels().map(p => {
                            const url = mapping[`${p.id}_url`];
                            const sku = mapping[`${p.id}_sku`];
                            return (
                              <TableCell key={p.id} className="text-center">
                                {url ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                                          <ExternalLink className="w-3.5 h-3.5" />
                                          {sku || 'View'}
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[300px] break-all">{url}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : sku ? (
                                  <Badge variant="outline" className="text-xs">{sku}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Channel Details with Icons */}
        <TabsContent value="channels">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelSummary.map(channel => {
              const ch = channelIcons[channel.id] || { emoji: '🏪', color: 'text-foreground', bg: 'bg-muted' };
              return (
                <Card key={channel.id} className="overflow-hidden">
                  <CardHeader className={`${ch.bg} border-b`}>
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl`}>{ch.emoji}</div>
                      <div>
                        <CardTitle className={`text-lg ${ch.color}`}>{channel.name}</CardTitle>
                        <CardDescription>Marketplace Overview</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total Products</p>
                        <p className="text-xl font-bold">{channel.totalProducts}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/10">
                        <p className="text-xs text-muted-foreground">Live</p>
                        <p className="text-xl font-bold text-emerald-600">{channel.liveProducts}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-rose-500/10">
                        <p className="text-xs text-muted-foreground">Out of Stock</p>
                        <p className="text-xl font-bold text-rose-600">{channel.oosProducts}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10">
                        <p className="text-xs text-muted-foreground">Not Active</p>
                        <p className="text-xl font-bold text-amber-600">{channel.notActiveProducts}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">SKUs Mapped</span>
                      <Badge variant="outline">{channel.mappedSkus}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Health Score</span>
                      <span className={`text-lg font-bold ${channel.healthPct >= 80 ? 'text-emerald-600' : channel.healthPct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {channel.healthPct}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
