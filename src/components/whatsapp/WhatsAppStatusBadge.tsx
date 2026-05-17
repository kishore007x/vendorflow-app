import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle2, Eye, XCircle, Clock } from 'lucide-react';

export const statusBadge = (s: string) => {
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    sent: { cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Send },
    delivered: { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: CheckCircle2 },
    read: { cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: Eye },
    failed: { cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30', icon: XCircle },
    approved: { cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
    pending: { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
    rejected: { cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30', icon: XCircle },
  };
  const cfg = map[s] || map.pending;
  const Icon = cfg.icon;
  return <Badge variant="outline" className={`gap-1 capitalize ${cfg.cls}`}><Icon className="w-3 h-3" />{s}</Badge>;
};
