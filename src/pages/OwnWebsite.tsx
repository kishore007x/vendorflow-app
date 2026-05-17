import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, ShoppingCart, Package, TrendingUp, IndianRupee, Loader2, Search, Plus } from 'lucide-react';
import { productsDb, ordersDb } from '@/services/database';
import { format } from 'date-fns';

export default function OwnWebsite() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [prods, ords] = await Promise.all([
          productsDb.getAll(search || undefined),
          ordersDb.getAll({ portal: 'Own Website', search: search || undefined }),
        ]);
        // Filter products that have 'Own Website' in portals_enabled
        const websiteProducts = prods.filter((p: any) =>
          p.portals_enabled?.includes('Own Website') || p.portals_enabled?.includes('own_website')
        );
        setProducts(websiteProducts);
        setOrders(ords);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [search]);

  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🌐 Own Website Channel</h1>
          <p className="text-muted-foreground">Manage products, orders, and inventory for your direct-to-consumer website</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Globe className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalProducts}</p><p className="text-sm text-muted-foreground">Products Listed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><ShoppingCart className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{totalOrders}</p><p className="text-sm text-muted-foreground">Total Orders</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><IndianRupee className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">₹{(totalRevenue / 1000).toFixed(1)}K</p><p className="text-sm text-muted-foreground">Revenue</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><TrendingUp className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{deliveredOrders}</p><p className="text-sm text-muted-foreground">Delivered</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Products</CardTitle><CardDescription>Products enabled for own website ({totalProducts})</CardDescription></CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead className="font-semibold">SKU</TableHead><TableHead className="font-semibold">Product</TableHead><TableHead className="text-right font-semibold">Base Price</TableHead><TableHead className="text-right font-semibold">MRP</TableHead></TableRow></TableHeader>
                <TableBody>
                  {products.slice(0, 20).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right font-medium">₹{(p.base_price || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">₹{(p.mrp || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No products enabled for Own Website yet</p>
                <p className="text-xs mt-1">Enable "Own Website" portal in Product Management to list products here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle><CardDescription>Orders from own website ({totalOrders})</CardDescription></CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead className="font-semibold">Order</TableHead><TableHead className="font-semibold">Customer</TableHead><TableHead className="text-right font-semibold">Total</TableHead><TableHead className="font-semibold">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {orders.slice(0, 20).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                      <TableCell>
                        <div><p className="font-medium text-sm">{o.customer_name}</p><p className="text-xs text-muted-foreground">{format(new Date(o.order_date), 'dd MMM yyyy')}</p></div>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{(o.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          o.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                          o.status === 'shipped' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' :
                          o.status === 'cancelled' ? 'bg-rose-500/15 text-rose-600 border-rose-500/30' :
                          'bg-amber-500/15 text-amber-600 border-amber-500/30'
                        }>{o.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No orders from Own Website portal yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
