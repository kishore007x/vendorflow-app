import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReconRow {
  orderId: string;
  marketplace: string;
  amount: number;
  vmsProcessed: boolean;
  storedInDB: boolean;
}

const mockReconData: ReconRow[] = [
  { orderId: 'FLP-78234', marketplace: 'Flipkart', amount: 2450, vmsProcessed: true, storedInDB: true },
  { orderId: 'AMZ-45621', marketplace: 'Amazon', amount: 5890, vmsProcessed: true, storedInDB: false },
  { orderId: 'MSH-12098', marketplace: 'Meesho', amount: 1200, vmsProcessed: true, storedInDB: true },
  { orderId: 'FLP-78240', marketplace: 'Flipkart', amount: 3100, vmsProcessed: true, storedInDB: false },
  { orderId: 'AMZ-45630', marketplace: 'Amazon', amount: 7250, vmsProcessed: true, storedInDB: true },
  { orderId: 'MSH-12105', marketplace: 'Meesho', amount: 890, vmsProcessed: true, storedInDB: false },
  { orderId: 'FLP-78255', marketplace: 'Flipkart', amount: 4200, vmsProcessed: true, storedInDB: true },
  { orderId: 'AMZ-45640', marketplace: 'Amazon', amount: 3450, vmsProcessed: false, storedInDB: false },
  { orderId: 'MSH-12115', marketplace: 'Meesho', amount: 2100, vmsProcessed: true, storedInDB: false },
  { orderId: 'FLP-78260', marketplace: 'Flipkart', amount: 6800, vmsProcessed: true, storedInDB: true },
  { orderId: 'AMZ-45650', marketplace: 'Amazon', amount: 1560, vmsProcessed: true, storedInDB: false },
  { orderId: 'MSH-12120', marketplace: 'Meesho', amount: 3300, vmsProcessed: true, storedInDB: true },
  { orderId: 'FLP-78270', marketplace: 'Flipkart', amount: 2900, vmsProcessed: true, storedInDB: true },
  { orderId: 'AMZ-45660', marketplace: 'Amazon', amount: 4100, vmsProcessed: true, storedInDB: false },
  { orderId: 'MSH-12130', marketplace: 'Meesho', amount: 1750, vmsProcessed: true, storedInDB: true },
];

export default function DemoReconciliation() {
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const filtered = useMemo(() =>
    mockReconData.filter((r) =>
      r.orderId.toLowerCase().includes(search.toLowerCase()) ||
      r.marketplace.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const mismatchCount = filtered.filter((r) => r.vmsProcessed && !r.storedInDB).length;

  const exportCSV = () => {
    const header = 'Order ID,Marketplace,Amount,VMS Processed,Stored in DB,Mismatch\n';
    const rows = filtered.map((r) =>
      `${r.orderId},${r.marketplace},${r.amount},${r.vmsProcessed ? 'Yes' : 'No'},${r.storedInDB ? 'Yes' : 'No'},${r.vmsProcessed && !r.storedInDB ? 'Yes' : 'No'}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vms_reconciliation.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV Exported', description: `${filtered.length} records exported successfully.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">VMS Reconciliation</h1>
          <p className="text-sm text-gray-400">Daily order reconciliation — VMS processed vs Database stored</p>
        </div>
        <Button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#111833] border-white/10">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><CheckCircle className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Records</p>
              <p className="text-xl font-bold text-white">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#111833] border-white/10">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Matched</p>
              <p className="text-xl font-bold text-white">{filtered.length - mismatchCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#111833] border-rose-500/30 border">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10"><AlertTriangle className="w-5 h-5 text-rose-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Mismatches</p>
              <p className="text-xl font-bold text-rose-400">{mismatchCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search by Order ID or Marketplace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#111833] border-white/10 text-gray-200 placeholder:text-gray-500"
        />
      </div>

      {/* Table */}
      <Card className="bg-[#111833] border-white/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Order ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Marketplace</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">VMS Processed</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Stored in DB</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Mismatch</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isMismatch = r.vmsProcessed && !r.storedInDB;
                  return (
                    <tr key={r.orderId} className={`border-b border-white/5 transition-colors ${isMismatch ? 'bg-rose-500/5' : 'hover:bg-white/[0.02]'}`}>
                      <td className="py-3 px-4 text-gray-200 font-mono text-xs">{r.orderId}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs border-white/20 text-gray-300">{r.marketplace}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-200">₹{r.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={`text-xs ${r.vmsProcessed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {r.vmsProcessed ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={`text-xs ${r.storedInDB ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {r.storedInDB ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isMismatch ? (
                          <Badge className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Mismatch
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
