import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';

interface HealthScoreProps {
  matchedPct: number;
  mismatchPct: number;
  delayedPct: number;
  chargebackLossPct: number;
}

export default function ReconciliationHealthScore({ matchedPct, mismatchPct, delayedPct, chargebackLossPct }: HealthScoreProps) {
  const { score, status, statusClass, icon: StatusIcon } = useMemo(() => {
    const s = Math.max(0, Math.min(100, Math.round(matchedPct * 0.4 + (100 - mismatchPct) * 0.25 + (100 - delayedPct) * 0.2 + (100 - chargebackLossPct) * 0.15)));
    if (s >= 80) return { score: s, status: 'Healthy', statusClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: ShieldCheck };
    if (s >= 50) return { score: s, status: 'Monitor', statusClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: AlertTriangle };
    return { score: s, status: 'High Risk', statusClass: 'bg-rose-500/15 text-rose-600 border-rose-500/30', icon: XCircle };
  }, [matchedPct, mismatchPct, delayedPct, chargebackLossPct]);

  const progressColor = score >= 80 ? '[&>div]:bg-emerald-500' : score >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500';

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className={`p-3 rounded-xl ${score >= 80 ? 'bg-emerald-500/10' : score >= 50 ? 'bg-amber-500/10' : 'bg-rose-500/10'}`}>
              <StatusIcon className={`w-8 h-8 ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Reconciliation Health Score</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-4xl font-bold text-foreground">{score}</span>
                <span className="text-lg text-muted-foreground">/100</span>
                <Badge variant="outline" className={`ml-2 ${statusClass}`}>{status}</Badge>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Matched</span><span className="font-medium">{matchedPct.toFixed(1)}%</span></div>
            <Progress value={matchedPct} className={`h-2 ${progressColor}`} />
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center"><p className="text-xs text-muted-foreground">Mismatch</p><p className="text-sm font-bold text-amber-600">{mismatchPct.toFixed(1)}%</p></div>
              <div className="text-center"><p className="text-xs text-muted-foreground">Delayed</p><p className="text-sm font-bold text-orange-600">{delayedPct.toFixed(1)}%</p></div>
              <div className="text-center"><p className="text-xs text-muted-foreground">Chargeback</p><p className="text-sm font-bold text-rose-600">{chargebackLossPct.toFixed(1)}%</p></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
