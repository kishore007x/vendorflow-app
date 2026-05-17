import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, IndianRupee, FileSpreadsheet, FileDown, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

type Channel = 'all' | 'amazon' | 'flipkart' | 'meesho' | 'website' | 'blinkit';

const channelPnLData: Record<Exclude<Channel, 'all'>, { revenue: number; commission: number; logistics: number; refundImpact: number; otherExpenses: number; gst: number }> = {
  amazon:   { revenue: 0, commission: 0, logistics: 0, refundImpact: 0, otherExpenses: 0, gst: 0 },
  flipkart: { revenue: 0, commission: 0, logistics: 0, refundImpact: 0, otherExpenses: 0, gst: 0 },
  meesho:   { revenue: 0, commission: 0, logistics: 0, refundImpact: 0, otherExpenses: 0, gst: 0 },
  website:  { revenue: 0, commission: 0, logistics: 0, refundImpact: 0, otherExpenses: 0, gst: 0 },
  blinkit:  { revenue: 0, commission: 0, logistics: 0, refundImpact: 0, otherExpenses: 0, gst: 0 },
};

const channelLabels: Record<Exclude<Channel, 'all'>, string> = {
  amazon: 'Amazon', flipkart: 'Flipkart', meesho: 'Meesho', website: 'Website', blinkit: 'Blinkit',
};

export default function ChannelPnL() {
  const { toast } = useToast();
  const [channel, setChannel] = useState<Channel>('all');

  const data = useMemo(() => {
    if (channel === 'all') {
      const keys = Object.keys(channelPnLData) as Exclude<Channel, 'all'>[];
      return keys.reduce((acc, k) => ({
        revenue: acc.revenue + channelPnLData[k].revenue,
        commission: acc.commission + channelPnLData[k].commission,
        logistics: acc.logistics + channelPnLData[k].logistics,
        refundImpact: acc.refundImpact + channelPnLData[k].refundImpact,
        otherExpenses: acc.otherExpenses + channelPnLData[k].otherExpenses,
        gst: acc.gst + channelPnLData[k].gst,
      }), { revenue: 0, commission: 0, logistics: 0, refundImpact: 0, otherExpenses: 0, gst: 0 });
    }
    return channelPnLData[channel];
  }, [channel]);

  const netProfit = data.revenue - data.commission - data.logistics - data.refundImpact - data.otherExpenses;
  const marginPct = data.revenue > 0 ? ((netProfit / data.revenue) * 100).toFixed(1) : '0';

  const handleExport = (f: string) => toast({ title: `Export ${f}`, description: `Preparing P&L export...` });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <Badge variant="secondary" className="gap-1"><TrendingUp className="w-3 h-3" />Current Period: Feb 2026</Badge>
        <Select value={channel} onValueChange={v => setChannel(v as Channel)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {Object.entries(channelLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('Excel')}><FileSpreadsheet className="w-3.5 h-3.5" />Excel</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('PDF')}><FileDown className="w-3.5 h-3.5" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
          <CardDescription>
            {channel === 'all' ? 'Revenue breakdown across all channels' : `Channel: ${channelLabels[channel]}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
                <div><p className="font-semibold">Revenue</p><p className="text-xs text-muted-foreground">Total sales</p></div>
              </div>
              <p className="text-xl font-bold text-emerald-600">{fmt(data.revenue)}</p>
            </div>

            {[
              { label: 'Commission', desc: 'Marketplace & platform fees', value: data.commission, color: 'text-amber-600', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/10' },
              { label: 'Logistics', desc: 'Shipping & delivery costs', value: data.logistics, color: 'text-blue-600', bg: 'bg-blue-500/10', borderColor: 'border-blue-500/10' },
              { label: 'Refund Impact', desc: 'Returns & refund losses', value: data.refundImpact, color: 'text-rose-600', bg: 'bg-rose-500/10', borderColor: 'border-rose-500/10' },
              { label: 'Other Expenses', desc: 'Packaging, ads & misc', value: data.otherExpenses, color: 'text-muted-foreground', bg: 'bg-muted/50', borderColor: 'border-muted' },
            ].map(item => (
              <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg bg-background border ${item.borderColor}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bg}`}><TrendingDown className={`w-4 h-4 ${item.color}`} /></div>
                  <div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                </div>
                <p className={`text-lg font-semibold ${item.color}`}>- {fmt(item.value)}</p>
              </div>
            ))}

            <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-violet-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10"><Percent className="w-4 h-4 text-violet-600" /></div>
                <div><p className="font-medium">GST Collected</p><p className="text-xs text-muted-foreground">Output tax liability</p></div>
              </div>
              <p className="text-lg font-semibold text-violet-600">{fmt(data.gst)}</p>
            </div>

            <div className="border-t-2 border-dashed my-2" />

            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border-2 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><IndianRupee className="w-5 h-5 text-primary" /></div>
                <div><p className="font-bold text-lg">Net Profit</p><p className="text-sm text-muted-foreground">Margin: {marginPct}%</p></div>
              </div>
              <p className="text-2xl font-bold text-primary">{fmt(netProfit)}</p>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit Margin</span>
                <span className="font-semibold">{marginPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all" style={{ width: `${marginPct}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
