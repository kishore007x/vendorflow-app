import { useMemo, useState, useEffect } from 'react';
import { ChannelIcon } from '@/components/ChannelIcon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getChannels } from '@/services/channelManager';
import { alertsDb } from '@/services/database';
import { Portal } from '@/types';
import { ShieldAlert, Clock, TrendingUp, TrendingDown, RotateCcw, AlertTriangle, XCircle } from 'lucide-react';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type AlertType = 'settlement_delay' | 'commission_spike' | 'margin_leakage' | 'high_refund_rate' | 'chargeback_loss';

interface RiskAlert {
  id: string;
  type: AlertType;
  severity: Severity;
  title: string;
  description: string;
  portal: Portal;
  timestamp: string;
  impact: string;
}

const typeConfig: Record<AlertType, { label: string; icon: React.ElementType }> = {
  settlement_delay: { label: 'Settlement Delay', icon: Clock },
  commission_spike: { label: 'Commission Spike', icon: TrendingUp },
  margin_leakage: { label: 'Margin Leakage', icon: TrendingDown },
  high_refund_rate: { label: 'High Refund Rate', icon: RotateCcw },
  chargeback_loss: { label: 'Chargeback Loss', icon: XCircle },
};

const severityConfig: Record<Severity, { label: string; className: string; borderClass: string }> = {
  low: { label: 'Low', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30', borderClass: 'border-l-blue-500' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30', borderClass: 'border-l-amber-500' },
  high: { label: 'High', className: 'bg-orange-500/15 text-orange-600 border-orange-500/30', borderClass: 'border-l-orange-500' },
  critical: { label: 'Critical', className: 'bg-rose-500/15 text-rose-600 border-rose-500/30', borderClass: 'border-l-rose-500' },
};

// Alerts are now sourced from the database (Supabase). We only show FirstCry-related alerts.

export default function FinancialRiskAlerts() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const data = await alertsDb.getAll();
        // keep only FirstCry portal alerts (ensures no demo/mock data shown)
        const channels = await getChannels();
        const channelIds = (channels || []).map((c: any) => c.id || c.key);
        setAlerts((data || []).filter(a => channelIds.includes(a.portal) || a.portal === 'firstcry'));
        setChannels(channels || []);
      } catch (err) {
        console.error('Failed to load alerts:', err);
      }
    };
    load();
  }, []);

  const countBySeverity = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  }), [alerts]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-rose-500/30"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><ShieldAlert className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">{countBySeverity.critical}</p><p className="text-sm text-muted-foreground">Critical</p></div></div></CardContent></Card>
        <Card className="border-orange-500/30"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-500/10"><AlertTriangle className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold text-orange-600">{countBySeverity.high}</p><p className="text-sm text-muted-foreground">High</p></div></div></CardContent></Card>
        <Card className="border-amber-500/30"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-amber-600">{countBySeverity.medium}</p><p className="text-sm text-muted-foreground">Medium</p></div></div></CardContent></Card>
        <Card className="border-blue-500/30"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><AlertTriangle className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-blue-600">{countBySeverity.low}</p><p className="text-sm text-muted-foreground">Low</p></div></div></CardContent></Card>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => {
          const sev = severityConfig[alert.severity];
          const tc = typeConfig[alert.type];
          const TypeIcon = tc.icon;
          const portal = (channels || []).find((p: any) => p.id === alert.portal) || (channels || []).find((p: any) => p.key === alert.portal) || { id: alert.portal, name: alert.portal, icon: undefined };
          return (
            <Card key={alert.id} className={`border-l-4 ${sev.borderClass}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-rose-500/10' : alert.severity === 'high' ? 'bg-orange-500/10' : 'bg-amber-500/10'}`}>
                    <TypeIcon className={`w-5 h-5 ${alert.severity === 'critical' ? 'text-rose-600' : alert.severity === 'high' ? 'text-orange-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <Badge variant="outline" className="text-xs"><ChannelIcon channelId={portal?.id || ""} fallbackIcon={portal?.icon} size={16} /> {portal?.name}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-xs ${sev.className}`}>{sev.label}</Badge>
                      <Badge variant="secondary" className="text-xs">{tc.label}</Badge>
                      <span className="text-xs font-medium text-rose-600 ml-auto">{alert.impact}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
