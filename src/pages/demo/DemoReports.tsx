import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ShoppingCart, IndianRupee, XCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reports = [
  { month: 'Sept 2025', marketplace: 'Flipkart', orders: 1240, sales: 1450000, cancelled: 87, returnPct: 4.2 },
  { month: 'Oct 2025', marketplace: 'Flipkart', orders: 1520, sales: 1780000, cancelled: 102, returnPct: 3.8 },
  { month: 'Nov 2025', marketplace: 'Flipkart', orders: 1890, sales: 2150000, cancelled: 145, returnPct: 5.1 },
  { month: 'Dec 2025', marketplace: 'Flipkart', orders: 1650, sales: 1920000, cancelled: 118, returnPct: 4.5 },
  { month: 'Sept 2025', marketplace: 'Amazon', orders: 980, sales: 1120000, cancelled: 65, returnPct: 3.5 },
  { month: 'Oct 2025', marketplace: 'Amazon', orders: 1180, sales: 1350000, cancelled: 78, returnPct: 3.9 },
  { month: 'Nov 2025', marketplace: 'Amazon', orders: 1520, sales: 1780000, cancelled: 112, returnPct: 4.8 },
  { month: 'Dec 2025', marketplace: 'Amazon', orders: 1380, sales: 1580000, cancelled: 95, returnPct: 4.1 },
  { month: 'Sept 2025', marketplace: 'Meesho', orders: 520, sales: 420000, cancelled: 48, returnPct: 6.2 },
  { month: 'Oct 2025', marketplace: 'Meesho', orders: 640, sales: 510000, cancelled: 55, returnPct: 5.8 },
  { month: 'Nov 2025', marketplace: 'Meesho', orders: 780, sales: 680000, cancelled: 72, returnPct: 6.5 },
  { month: 'Dec 2025', marketplace: 'Meesho', orders: 690, sales: 590000, cancelled: 60, returnPct: 5.9 },
];

const marketplaceColor: Record<string, string> = {
  Flipkart: 'text-blue-400',
  Amazon: 'text-amber-400',
  Meesho: 'text-purple-400',
};

export default function DemoReports() {
  const { toast } = useToast();

  const handleDownload = (month: string, marketplace: string) => {
    toast({ title: 'Download Started', description: `${marketplace} ${month} report downloading...` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Monthly Reports</h1>
        <p className="text-sm text-gray-400">Marketplace performance — Sept to Dec 2025</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r, i) => (
          <Card key={i} className="bg-[#111833] border-white/10 hover:border-white/20 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className={marketplaceColor[r.marketplace]}>{r.marketplace}</span>
                  <span className="text-gray-500">•</span>
                  {r.month}
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(r.month, r.marketplace)}
                  className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5 h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShoppingCart className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Orders</span>
                  </div>
                  <p className="text-lg font-bold text-white">{r.orders.toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IndianRupee className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sales</span>
                  </div>
                  <p className="text-lg font-bold text-white">₹{(r.sales / 100000).toFixed(1)}L</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Cancelled</span>
                  </div>
                  <p className="text-lg font-bold text-white">{r.cancelled}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Return %</span>
                  </div>
                  <p className="text-lg font-bold text-white">{r.returnPct}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
