import { useState, useEffect, useMemo } from 'react';
import { alertsDb } from '@/services/database';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { AlertSeverity, AlertType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Check,
  CheckCheck,
  Package,
  CreditCard,
  RotateCcw,
  ShoppingCart
} from 'lucide-react';

const severityConfig: Record<AlertSeverity, { label: string; color: string; icon: React.ElementType; bgClass: string }> = {
  critical: { label: 'Critical', color: 'text-destructive', icon: AlertCircle, bgClass: 'alert-critical' },
  warning: { label: 'Warning', color: 'text-warning', icon: AlertTriangle, bgClass: 'alert-warning' },
  info: { label: 'Info', color: 'text-info', icon: Info, bgClass: 'alert-info' },
};

const typeIcons: Record<AlertType, React.ElementType> = {
  low_inventory: Package,
  payment_delay: CreditCard,
  return_initiated: RotateCcw,
  claim_eligible: AlertTriangle,
  order_issue: ShoppingCart,
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsDb.getAll();
      setAlerts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert: any) => {
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesType = typeFilter === 'all' || alert.type === typeFilter;
      const matchesRead = !showUnreadOnly || !alert.read;
      return matchesSeverity && matchesType && matchesRead;
    });
  }, [alerts, severityFilter, typeFilter, showUnreadOnly]);

  const stats = useMemo(() => ({
    total: alerts.length,
    unread: alerts.filter((a: any) => !a.read).length,
    critical: alerts.filter((a: any) => a.severity === 'critical').length,
    warning: alerts.filter((a: any) => a.severity === 'warning').length,
  }), [alerts]);

  const handleMarkAllRead = async () => {
    try {
      await alertsDb.markAllAsRead();
      fetchAlerts();
    } catch (err) { console.error(err); }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts & Notifications</h1>
          <p className="text-muted-foreground">Stay updated on critical events and actions needed</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unread}</p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.warning}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {Object.entries(severityConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="low_inventory">Low Inventory</SelectItem>
                <SelectItem value="payment_delay">Payment Delay</SelectItem>
                <SelectItem value="return_initiated">Return Initiated</SelectItem>
                <SelectItem value="claim_eligible">Claim Eligible</SelectItem>
                <SelectItem value="order_issue">Order Issue</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant={showUnreadOnly ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              Unread Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const severity = severityConfig[alert.severity];
          const SeverityIcon = severity.icon;
          const TypeIcon = typeIcons[alert.type];
          const portal = alert.portal ? getChannels().find(p => p.id === alert.portal) : null;
          
          return (
            <Card 
              key={alert.alertId} 
              className={`transition-all duration-200 hover:shadow-md ${severity.bgClass} ${
                !alert.read ? 'ring-1 ring-accent/50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-background ${severity.color}`}>
                    <SeverityIcon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{alert.title}</h4>
                          {!alert.read && (
                            <span className="w-2 h-2 rounded-full bg-accent" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{formatTime(alert.timestamp)}</span>
                        {portal && (
                          <Badge variant="outline" className="text-xs">
                            <ChannelIcon channelId={portal.id} fallbackIcon={portal.icon} size={16} /> {portal.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant="secondary" className={`text-xs ${severity.color}`}>
                        {severity.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {alert.type.replace('_', ' ')}
                      </Badge>
                      
                      {alert.actionUrl && (
                        <Button variant="link" size="sm" className="h-auto p-0 text-accent">
                          View Details →
                        </Button>
                      )}
                      
                      {!alert.read && (
                        <Button variant="ghost" size="sm" className="h-auto p-1 ml-auto">
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredAlerts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No alerts match your filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
