import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { ordersDb } from '@/services/database';
import { Portal, Order, OrderStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PortalFilter } from '@/components/dashboard/PortalFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { 
  Search, Download, ShoppingCart, Package, Truck, CheckCircle, Clock,
  X, Eye, Users, UserPlus, UserCheck, Star, Layers, RotateCcw, AlertTriangle,
  MapPin, Timer, ArrowDownToLine, Ban, Video, Trash2, Shield, Printer,
} from 'lucide-react';
import { DateFilter, ExportButton, useRowSelection, SelectAllCheckbox, RowCheckbox } from '@/components/TableEnhancements';
import { GlobalDateFilter, type DateRange } from '@/components/GlobalDateFilter';
import { useToast } from '@/hooks/use-toast';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Status config for orders
const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-info/10 text-info', icon: CheckCircle },
  packed: { label: 'Packed', color: 'bg-accent/10 text-accent', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-primary/10 text-primary', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-success/10 text-success', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive', icon: X },
  returned: { label: 'Returned', color: 'bg-muted text-muted-foreground', icon: Package },
  rto: { label: 'RTO', color: 'bg-orange-500/10 text-orange-600', icon: RotateCcw },
  customer_return: { label: 'Customer Return', color: 'bg-rose-500/10 text-rose-600', icon: ArrowDownToLine },
  courier_return: { label: 'Courier Return', color: 'bg-amber-500/10 text-amber-600', icon: Ban },
};

// Portal cutoff times
const portalCutoffs: Record<string, { label: string; hour: number | null; description: string }> = {
  amazon: { label: 'Amazon', hour: 14, description: 'Cutoff 2:00 PM' },
  flipkart: { label: 'Flipkart', hour: 15, description: 'Cutoff 3:00 PM' },
  meesho: { label: 'Meesho', hour: 15, description: 'Cutoff 3:00 PM' },
  firstcry: { label: 'FirstCry', hour: 16, description: 'Cutoff 4:00 PM' },
  blinkit: { label: 'Blinkit', hour: null, description: 'Immediate' },
  own_website: { label: 'Website', hour: null, description: 'Immediate' },
};

function getOrderCutoffStatus(order: Order): 'within' | 'missed' | 'immediate' {
  const cutoff = portalCutoffs[order.portal];
  if (!cutoff || cutoff.hour === null) return 'immediate';
  const orderDate = new Date(order.orderDate);
  const orderHour = orderDate.getHours();
  return orderHour < cutoff.hour ? 'within' : 'missed';
}

function computeCustomerProfiles(orders: Order[]) {
  const map: Record<string, {
    name: string; phone: string; email: string; orderCount: number; totalSpend: number;
    lastOrderDate: string; addresses: string[]; pinCodes: string[]; cities: string[]; states: string[];
    suspicious: boolean;
  }> = {};
  orders.forEach(o => {
    if (!map[o.customerId]) {
      map[o.customerId] = {
        name: o.customerName, phone: o.customerPhone, email: o.customerEmail,
        orderCount: 0, totalSpend: 0, lastOrderDate: o.orderDate,
        addresses: [], pinCodes: [], cities: [], states: [], suspicious: false,
      };
    }
    const p = map[o.customerId];
    p.orderCount++;
    p.totalSpend += o.totalAmount;
    if (new Date(o.orderDate) > new Date(p.lastOrderDate)) p.lastOrderDate = o.orderDate;
    if (o.shippingAddress && !p.addresses.includes(o.shippingAddress)) p.addresses.push(o.shippingAddress);
    if (o.customerPinCode && !p.pinCodes.includes(o.customerPinCode)) p.pinCodes.push(o.customerPinCode);
    if (o.customerCity && !p.cities.includes(o.customerCity)) p.cities.push(o.customerCity);
    if (o.customerState && !p.states.includes(o.customerState)) p.states.push(o.customerState);
  });
  Object.values(map).forEach(p => {
    const returnOrders = orders.filter(o => o.customerId === Object.keys(map).find(k => map[k] === p) && ['returned', 'rto', 'customer_return', 'courier_return', 'cancelled'].includes(o.status));
    if (p.addresses.length >= 3 || (p.orderCount >= 3 && returnOrders.length / p.orderCount > 0.5)) {
      p.suspicious = true;
    }
  });
  return map;
}

type CustomerTypeFilter = 'all' | 'new' | 'repeat' | 'high_value';

// Video reconciliation types
type VideoQuality = '360' | '420' | '720' | '1000';
type VideoStatus = 'not_captured' | 'captured' | 'eligible_for_delete' | 'retained_for_return';

interface VideoRecord {
  captured: boolean;
  quality: VideoQuality;
  capturedAt?: string;
  status: VideoStatus;
}

// Generate initial video records for all orders
function generateVideoRecords(orders: Order[]): Record<string, VideoRecord> {
  const records: Record<string, VideoRecord> = {};
  orders.forEach(o => {
    const isReturn = ['returned', 'rto', 'customer_return', 'courier_return'].includes(o.status);
    const daysSinceOrder = Math.floor((Date.now() - new Date(o.orderDate).getTime()) / (1000 * 60 * 60 * 24));
    const captured = Math.random() > 0.2; // 80% captured
    let status: VideoStatus = 'not_captured';
    if (captured) {
      if (isReturn) {
        status = 'retained_for_return';
      } else if (daysSinceOrder > 30) {
        status = 'eligible_for_delete';
      } else {
        status = 'captured';
      }
    }
    records[o.orderId] = {
      captured,
      quality: captured ? (['360', '720', '1000'] as VideoQuality[])[Math.floor(Math.random() * 3)] : '720',
      capturedAt: captured ? new Date(new Date(o.orderDate).getTime() + 3600000).toISOString() : undefined,
      status,
    };
  });
  return records;
}

const videoStatusLabels: Record<VideoStatus, { label: string; color: string }> = {
  not_captured: { label: 'Not Captured', color: 'bg-destructive/10 text-destructive' },
  captured: { label: 'Captured', color: 'bg-success/10 text-success' },
  eligible_for_delete: { label: 'Auto Delete Eligible', color: 'bg-amber-500/10 text-amber-600' },
  retained_for_return: { label: 'Retained (Return)', color: 'bg-blue-500/10 text-blue-600' },
};

const ORDERS_PAGE_SIZE = 50;

export default function Orders() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPortal, setSelectedPortal] = useState<Portal | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerTypeFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('30days');
  const [activeTab, setActiveTab] = useState('orders');
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // DB-backed orders state
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchOrders = async () => {
      try {
        const data = await ordersDb.getAll();
        setAllOrders(data.map((o: any) => {
          const orderDate = o.order_date ?? o.orderDate ?? o.created_at ?? o.createdAt ?? null;
          const totalAmount = Number(o.total_amount ?? o.totalAmount ?? o.total ?? o.amount ?? 0) || 0;
          return {
            ...o,
            orderId: o.order_number || o.id || String(o.id || ''),
            orderDate,
            totalAmount,
            customerName: o.customer_name || o.customerName || '',
            customerId: o.id || o.customer_id || o.customerId || String(o.id || ''),
            customerEmail: o.customer_email || o.customerEmail || '',
            customerPhone: o.customer_phone || o.customerPhone || '',
            shippingAddress: o.customer_address || o.shipping_address || '',
            customerPinCode: o.customer_pincode || o.customer_pincode || '',
            customerCity: o.customer_city || o.customerCity || '',
            customerState: o.customer_state || o.customerState || '',
            deliveryDate: o.delivered_date || o.delivery_date || null,
            portalOrderId: o.order_number || o.portal_order_id || null,
            items: [],
          };
        }));
      } catch (e) { console.error(e); }
    };

    fetchOrders();
  }, [authLoading, user]);

  // Video reconciliation state
  const [videoRecords, setVideoRecords] = useState<Record<string, VideoRecord>>({});
  const [returnPolicyDays] = useState(30);
  const [videoRetentionDays] = useState(120);

  useEffect(() => {
    if (allOrders.length > 0) setVideoRecords(generateVideoRecords(allOrders));
  }, [allOrders]);

  const customerProfiles = useMemo(() => computeCustomerProfiles(allOrders), [allOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPortal, deferredSearchQuery, statusFilter, customerTypeFilter, dateFilter, globalDateRange.from, globalDateRange.to]);

  const getCustomerType = (customerId: string): 'new' | 'repeat' => {
    return (customerProfiles[customerId]?.orderCount ?? 0) > 1 ? 'repeat' : 'new';
  };

  const isHighValue = (customerId: string) => (customerProfiles[customerId]?.totalSpend ?? 0) >= 7000;

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      const matchesPortal = selectedPortal === 'all' || order.portal === selectedPortal;
      const searchTerm = deferredSearchQuery.toLowerCase();
      const matchesSearch = order.orderId.toLowerCase().includes(searchTerm) ||
                           order.customerName.toLowerCase().includes(searchTerm) ||
                           order.portalOrderId.toLowerCase().includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const custType = getCustomerType(order.customerId);
      const matchesCustomerType = customerTypeFilter === 'all' ||
        (customerTypeFilter === 'new' && custType === 'new') ||
        (customerTypeFilter === 'repeat' && custType === 'repeat') ||
        (customerTypeFilter === 'high_value' && isHighValue(order.customerId));
      
      return matchesPortal && matchesSearch && matchesStatus && matchesCustomerType;
    });
  }, [allOrders, selectedPortal, deferredSearchQuery, statusFilter, customerTypeFilter, customerProfiles]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * ORDERS_PAGE_SIZE;
    return filteredOrders.slice(start, start + ORDERS_PAGE_SIZE);
  }, [filteredOrders, safeCurrentPage]);

  const rowSelection = useRowSelection(paginatedOrders.map(o => o.orderId));

  const processingStats = useMemo(() => {
    const orders = selectedPortal === 'all' ? allOrders : allOrders.filter(o => o.portal === selectedPortal);
    const withinCutoff = orders.filter(o => ['pending', 'confirmed'].includes(o.status) && getOrderCutoffStatus(o) === 'within').length;
    const missedCutoff = orders.filter(o => ['pending', 'confirmed'].includes(o.status) && getOrderCutoffStatus(o) === 'missed').length;
    const pendingDispatch = orders.filter(o => ['confirmed', 'packed'].includes(o.status)).length;
    const rtoPending = orders.filter(o => o.status === 'rto').length;
    const total = orders.length;
    const customerReturns = orders.filter(o => o.status === 'customer_return').length;
    const courierReturns = orders.filter(o => o.status === 'courier_return').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    return { total, withinCutoff, missedCutoff, pendingDispatch, rtoPending, customerReturns, courierReturns, delivered, shipped };
  }, [selectedPortal]);

  // Video stats
  const videoStats = useMemo(() => {
    const all = Object.values(videoRecords);
    return {
      captured: all.filter(v => v.captured).length,
      notCaptured: all.filter(v => !v.captured).length,
      eligibleDelete: all.filter(v => v.status === 'eligible_for_delete').length,
      retained: all.filter(v => v.status === 'retained_for_return').length,
    };
  }, [videoRecords]);

  const toggleVideoCapture = (orderId: string) => {
    setVideoRecords(prev => {
      const rec = prev[orderId];
      const newCaptured = !rec.captured;
      return {
        ...prev,
        [orderId]: {
          ...rec,
          captured: newCaptured,
          capturedAt: newCaptured ? new Date().toISOString() : undefined,
          status: newCaptured ? 'captured' : 'not_captured',
        },
      };
    });
    toast({ title: 'Video status updated' });
  };

  const updateVideoQuality = (orderId: string, quality: VideoQuality) => {
    setVideoRecords(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], quality },
    }));
  };

  const runVideoCleanup = () => {
    setVideoRecords(prev => {
      const updated = { ...prev };
      allOrders.forEach(o => {
        const daysSince = Math.floor((Date.now() - new Date(o.orderDate).getTime()) / (1000 * 60 * 60 * 24));
        const isReturn = ['returned', 'rto', 'customer_return', 'courier_return'].includes(o.status);
        const rec = updated[o.orderId];
        if (!rec?.captured) return;
        if (isReturn) {
          updated[o.orderId] = { ...rec, status: daysSince > videoRetentionDays ? 'eligible_for_delete' : 'retained_for_return' };
        } else if (daysSince > returnPolicyDays) {
          updated[o.orderId] = { ...rec, status: 'eligible_for_delete' };
        }
      });
      return updated;
    });
    toast({ title: 'Video Cleanup Simulation', description: `Checked ${allOrders.length} orders. Return policy: ${returnPolicyDays}d, Retention: ${videoRetentionDays}d` });
  };

  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const printOrderInvoice = (order: Order) => {
    const portal = getChannels().find(p => p.id === order.portal);
    const portalName = portal?.name || order.portal;
    const invoiceWindow = window.open('', '_blank', 'width=800,height=900');
    if (!invoiceWindow) { toast({ title: 'Please allow popups to print invoice', variant: 'destructive' }); return; }

    const itemsHtml = order.items.length > 0
      ? order.items.map((item, i) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.productName}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.skuId}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${item.price.toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${(item.price * item.quantity).toLocaleString()}</td>
        </tr>`).join('')
      : `<tr><td colspan="6" style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">Order total: ₹${order.totalAmount.toLocaleString()}</td></tr>`;

    invoiceWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${order.orderId}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', sans-serif; padding:40px; color:#1a1a2e; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:3px solid #1a1a2e; }
        .portal-badge { background:#f0f4ff; color:#3b5bdb; padding:6px 16px; border-radius:6px; font-weight:600; font-size:13px; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
        .section { background:#f8f9fa; padding:16px; border-radius:8px; }
        .section h3 { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#868e96; margin-bottom:8px; }
        .section p { font-size:13px; line-height:1.6; }
        table { width:100%; border-collapse:collapse; margin-bottom:24px; }
        th { background:#1a1a2e; color:#fff; padding:10px 8px; text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; }
        th:nth-child(4), th:nth-child(5), th:nth-child(6) { text-align:right; }
        td { font-size:13px; }
        .total-row { background:#f0f4ff; }
        .total-row td { padding:12px 8px; font-weight:700; font-size:15px; }
        .footer { text-align:center; margin-top:40px; padding-top:16px; border-top:1px solid #dee2e6; color:#868e96; font-size:11px; }
        @media print { body { padding:20px; } .no-print { display:none; } }
      </style>
    </head><body>
      <div class="no-print" style="text-align:right;margin-bottom:16px;">
        <button onclick="window.print()" style="background:#1a1a2e;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;">🖨️ Print Invoice</button>
      </div>
      <div class="header">
        <div>
          <h1 style="font-size:28px;font-weight:800;letter-spacing:-0.5px;">ORDER INVOICE</h1>
          <p style="color:#868e96;font-size:13px;margin-top:4px;">Invoice generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style="text-align:right;">
          <span class="portal-badge">${portalName}</span>
          <p style="font-size:13px;margin-top:8px;color:#868e96;">Order #${order.orderId}</p>
          <p style="font-size:13px;color:#868e96;">Date: ${formatDate(order.orderDate)}</p>
        </div>
      </div>
      <div class="grid">
        <div class="section">
          <h3>Ship To</h3>
          <p><strong>${order.customerName}</strong></p>
          <p>${order.shippingAddress || 'N/A'}</p>
          ${order.customerCity ? `<p>${order.customerCity}${order.customerState ? ', ' + order.customerState : ''} ${order.customerPinCode || ''}</p>` : ''}
          <p>Phone: ${order.customerPhone || 'N/A'}</p>
          ${order.customerEmail ? `<p>Email: ${order.customerEmail}</p>` : ''}
        </div>
        <div class="section">
          <h3>Order Details</h3>
          <p><strong>Portal Order ID:</strong> ${order.portalOrderId}</p>
          <p><strong>Status:</strong> ${statusConfig[order.status]?.label || order.status}</p>
          ${order.trackingNumber ? `<p><strong>Tracking:</strong> ${order.trackingNumber}</p>` : ''}
          ${order.deliveryDate ? `<p><strong>Delivery Date:</strong> ${formatDate(order.deliveryDate)}</p>` : ''}
        </div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Product</th><th>SKU</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th>
        </tr></thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="5" style="text-align:right;padding:12px 8px;">Grand Total</td>
            <td style="text-align:right;padding:12px 8px;">₹${order.totalAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <p>This is a computer-generated invoice for order ${order.orderId} via ${portalName}.</p>
        <p>Generated from VendorFlow Hub</p>
      </div>
    </body></html>`);
    invoiceWindow.document.close();
  };

  const exportLabel = useMemo(() => {
    const parts = ['Export'];
    if (customerTypeFilter !== 'all') {
      const labels: Record<string, string> = { new: 'New Customers', repeat: 'Repeat Customers', high_value: 'High Value' };
      parts.push(labels[customerTypeFilter]);
    }
    parts.push('Orders');
    return parts.join(' ');
  }, [customerTypeFilter]);

  const selectedProfile = selectedCustomerId ? customerProfiles[selectedCustomerId] : null;
  const pageStart = filteredOrders.length === 0 ? 0 : (safeCurrentPage - 1) * ORDERS_PAGE_SIZE + 1;
  const pageEnd = Math.min(safeCurrentPage * ORDERS_PAGE_SIZE, filteredOrders.length);

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
            <p className="text-muted-foreground">Manage orders across all sales channels with processing intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <GlobalDateFilter value={globalDateRange} onChange={setGlobalDateRange} />
            <ExportButton label={rowSelection.count > 0 ? undefined : exportLabel} selectedCount={rowSelection.count} data={filteredOrders} filename="orders" />
          </div>
        </div>

        {/* Processing Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
          <Card className="bg-card">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <p className="text-xl font-bold">{processingStats.total}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Total Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-success/30">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <Timer className="w-5 h-5 text-success" />
                <p className="text-xl font-bold text-success">{processingStats.withinCutoff}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Within Cutoff</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-destructive/30">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <p className="text-xl font-bold text-destructive">{processingStats.missedCutoff}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Missed Cutoff</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-warning/30">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <Package className="w-5 h-5 text-warning" />
                <p className="text-xl font-bold text-warning">{processingStats.pendingDispatch}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Pending Dispatch</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-orange-500/30">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                <p className="text-xl font-bold text-orange-500">{processingStats.rtoPending}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">RTO Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <Truck className="w-5 h-5 text-info" />
                <p className="text-xl font-bold">{processingStats.shipped}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">In Transit</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <CheckCircle className="w-5 h-5 text-success" />
                <p className="text-xl font-bold">{processingStats.delivered}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Delivered</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-rose-500/30">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <ArrowDownToLine className="w-5 h-5 text-rose-500" />
                <p className="text-xl font-bold text-rose-500">{processingStats.customerReturns}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Customer Return</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-amber-600/30">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1">
                <Truck className="w-5 h-5 text-amber-600" />
                <p className="text-xl font-bold text-amber-600">{processingStats.courierReturns}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Courier Return</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Video Reconciliation Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Video Reconciliation</span>
                <Badge variant="outline" className="text-xs">Return Policy: {returnPolicyDays} days</Badge>
                <Badge variant="outline" className="text-xs">Retention: {videoRetentionDays} days</Badge>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={runVideoCleanup}>
                <Trash2 className="w-3.5 h-3.5" />
                Run Cleanup Simulation
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
                <Shield className="w-4 h-4 text-success" />
                <div>
                  <p className="text-lg font-bold text-success">{videoStats.captured}</p>
                  <p className="text-[11px] text-muted-foreground">Videos Captured</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                <X className="w-4 h-4 text-destructive" />
                <div>
                  <p className="text-lg font-bold text-destructive">{videoStats.notCaptured}</p>
                  <p className="text-[11px] text-muted-foreground">Not Captured</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <Trash2 className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-lg font-bold text-amber-600">{videoStats.eligibleDelete}</p>
                  <p className="text-[11px] text-muted-foreground">Auto Delete Eligible</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <RotateCcw className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-blue-600">{videoStats.retained}</p>
                  <p className="text-[11px] text-muted-foreground">Retained (Return)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portal Cutoff Reference */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Portal Cutoff Times</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(portalCutoffs).map(([key, config]) => (
                <Badge key={key} variant="outline" className="gap-1.5 text-xs px-3 py-1">
                  <ChannelIcon channelId={key} size={16} />
                  <span className="font-medium">{config.label}:</span>
                  <span className={config.hour === null ? 'text-success' : 'text-foreground'}>{config.description}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <PortalFilter selectedPortal={selectedPortal} onPortalChange={setSelectedPortal} />
              
              <div className="flex flex-1 flex-wrap gap-3">
                <DateFilter value={dateFilter} onChange={setDateFilter} />
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Order ID or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={customerTypeFilter} onValueChange={(v) => setCustomerTypeFilter(v as CustomerTypeFilter)}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Customer Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="new">New Customers</SelectItem>
                    <SelectItem value="repeat">Repeat Customers</SelectItem>
                    <SelectItem value="high_value">High Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10"><SelectAllCheckbox checked={rowSelection.isAllSelected} onCheckedChange={rowSelection.toggleAll} /></TableHead>
                    <TableHead className="font-semibold">Order ID</TableHead>
                    <TableHead className="font-semibold">Portal</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Customer Type</TableHead>
                    <TableHead className="font-semibold">Cutoff</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Video</TableHead>
                    <TableHead className="font-semibold">Quality</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const status = statusConfig[order.status];
                    const portal = getChannels().find(p => p.id === order.portal);
                    const StatusIcon = status.icon;
                    const custType = getCustomerType(order.customerId);
                    const cutoffStatus = getOrderCutoffStatus(order);
                    const profile = customerProfiles[order.customerId];
                    const videoRec = videoRecords[order.orderId];
                    const vStatus = videoRec ? videoStatusLabels[videoRec.status] : null;
                    
                      return (
                        <TableRow key={order.orderId} className={`hover:bg-muted/30 ${rowSelection.isSelected(order.orderId) ? 'bg-primary/5' : ''}`}>
                          <TableCell><RowCheckbox checked={rowSelection.isSelected(order.orderId)} onCheckedChange={() => rowSelection.toggle(order.orderId)} /></TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.orderId}</p>
                            <p className="text-xs text-muted-foreground">{order.portalOrderId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div>
                              <button
                                className="font-medium text-primary hover:underline cursor-pointer text-left"
                                onClick={() => setSelectedCustomerId(order.customerId)}
                              >
                                {order.customerName}
                              </button>
                              <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                            </div>
                            {profile?.suspicious && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>Suspicious pattern detected</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {custType === 'repeat' ? (
                            <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600">
                              <UserCheck className="w-3 h-3" />Repeat
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600">
                              <UserPlus className="w-3 h-3" />New
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {cutoffStatus === 'within' && (
                            <Badge variant="secondary" className="gap-1 bg-success/10 text-success text-xs">
                              <Timer className="w-3 h-3" />Within
                            </Badge>
                          )}
                          {cutoffStatus === 'missed' && (
                            <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive text-xs">
                              <AlertTriangle className="w-3 h-3" />Missed
                            </Badge>
                          )}
                          {cutoffStatus === 'immediate' && (
                            <Badge variant="secondary" className="gap-1 bg-info/10 text-info text-xs">
                              <CheckCircle className="w-3 h-3" />Immediate
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(order.orderDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`gap-1 ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        {/* Video Captured Toggle */}
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={videoRec?.captured ?? false}
                              onCheckedChange={() => toggleVideoCapture(order.orderId)}
                              className="scale-75"
                            />
                            {vStatus && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${vStatus.color}`}>
                                {vStatus.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {/* Video Quality */}
                        <TableCell>
                          <Select
                            value={videoRec?.quality ?? '720'}
                            onValueChange={(v) => updateVideoQuality(order.orderId, v as VideoQuality)}
                            disabled={!videoRec?.captured}
                          >
                            <SelectTrigger className="h-7 w-[70px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="360">360p</SelectItem>
                              <SelectItem value="420">420p</SelectItem>
                              <SelectItem value="720">720p</SelectItem>
                              <SelectItem value="1000">1000p</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                              className="gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => printOrderInvoice(order)}
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Print Invoice</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            )}
            {filteredOrders.length > 0 && (
              <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {pageStart}-{pageEnd} of {filteredOrders.length} orders
                </p>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(prev => Math.max(1, prev - 1));
                        }}
                        className={safeCurrentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#" isActive>{safeCurrentPage}</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(prev => Math.min(totalPages, prev + 1));
                        }}
                        className={safeCurrentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  Order Details - {selectedOrder?.orderId}
                  {selectedOrder && selectedOrder.items.length > 1 && (
                    <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-600">
                      <Layers className="w-3 h-3" />
                      Multi-SKU ({selectedOrder.items.length})
                    </Badge>
                  )}
                </DialogTitle>
                {selectedOrder && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printOrderInvoice(selectedOrder)}>
                    <Printer className="w-4 h-4" />
                    Print Invoice
                  </Button>
                )}
              </div>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Portal Order ID</p>
                    <p className="font-medium">{selectedOrder.portalOrderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Portal</p>
                    <Badge variant="outline" className="gap-1 mt-1">
                      <ChannelIcon channelId={selectedOrder.portal} size={16} />
                      {getChannels().find(p => p.id === selectedOrder.portal)?.name}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">{formatDate(selectedOrder.orderDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-lg">{formatCurrency(selectedOrder.totalAmount)}</p>
                  </div>
                </div>

                {/* Video Status in Detail */}
                {videoRecords[selectedOrder.orderId] && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Video className="w-4 h-4" /> Video Reconciliation
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Captured</p>
                        <p className="font-medium">{videoRecords[selectedOrder.orderId].captured ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quality</p>
                        <p className="font-medium">{videoRecords[selectedOrder.orderId].quality}p</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge variant="outline" className={`text-xs ${videoStatusLabels[videoRecords[selectedOrder.orderId].status].color}`}>
                          {videoStatusLabels[videoRecords[selectedOrder.orderId].status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    Customer Information
                    {customerProfiles[selectedOrder.customerId]?.suspicious && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Suspicious
                      </Badge>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedOrder.customerPhone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Shipping Address</p>
                      <p className="font-medium">{selectedOrder.shippingAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold mb-3">Order Items ({selectedOrder.items.length})</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold text-xs">SKU ID</TableHead>
                          <TableHead className="font-semibold text-xs">Product</TableHead>
                          <TableHead className="font-semibold text-xs">Brand</TableHead>
                          <TableHead className="font-semibold text-xs text-center">Qty</TableHead>
                          <TableHead className="font-semibold text-xs text-right">Price</TableHead>
                          <TableHead className="font-semibold text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="text-xs font-mono font-medium">{item.skuId}</p>
                                <p className="text-[10px] text-muted-foreground">Master: {item.skuId.replace(/^SKU-[A-Z]{3}-/, 'MSKU-')}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{item.brand}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-medium text-sm">{formatCurrency(item.price * item.quantity)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Status Timeline */}
                <div>
                  <h4 className="font-semibold mb-3">Status Timeline</h4>
                  <div className="space-y-3">
                    {selectedOrder.statusTimeline.map((event, index) => {
                      const config = statusConfig[event.status];
                      const Icon = config.icon;
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-full ${config.color}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{config.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleString('en-IN')}
                              </p>
                            </div>
                            {event.note && (
                              <p className="text-sm text-muted-foreground">{event.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Customer Profile Modal */}
        <Dialog open={!!selectedCustomerId} onOpenChange={() => setSelectedCustomerId(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customer Profile
              </DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {selectedProfile.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{selectedProfile.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProfile.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProfile.orderCount > 1 && (
                    <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600">
                      <UserCheck className="w-3 h-3" />
                      Repeat Customer
                    </Badge>
                  )}
                  {isHighValue(selectedCustomerId!) && (
                    <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600">
                      <Star className="w-3 h-3" />
                      High Value Customer
                    </Badge>
                  )}
                  {selectedProfile.suspicious && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Suspicious Pattern
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedProfile.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="font-bold text-lg">{selectedProfile.orderCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="font-bold text-lg">{formatCurrency(selectedProfile.totalSpend)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Order</p>
                    <p className="font-medium">{formatDate(selectedProfile.lastOrderDate)}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Address Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedProfile.cities.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">Cities</p>
                        <p className="font-medium">{selectedProfile.cities.join(', ')}</p>
                      </div>
                    )}
                    {selectedProfile.states.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">States</p>
                        <p className="font-medium">{selectedProfile.states.join(', ')}</p>
                      </div>
                    )}
                    {selectedProfile.pinCodes.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">Pin Codes</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedProfile.pinCodes.map(pin => (
                            <Badge key={pin} variant="outline" className="text-xs">{pin}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
