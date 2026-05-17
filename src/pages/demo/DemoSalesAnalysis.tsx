import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Target, Facebook, Chrome } from 'lucide-react';

type Platform = 'facebook' | 'google';

const fbData = {
  sept: { sales: 1450000, orders: 1240, adSpend: 185000, roas: 7.84 },
  oct:  { sales: 1780000, orders: 1520, adSpend: 210000, roas: 8.48 },
  nov:  { sales: 2150000, orders: 1890, adSpend: 280000, roas: 7.68 },
  dec:  { sales: 1920000, orders: 1650, adSpend: 245000, roas: 7.84 },
};

const googleData = {
  sept: { sales: 1120000, orders: 980, adSpend: 165000, roas: 6.79 },
  oct:  { sales: 1350000, orders: 1180, adSpend: 195000, roas: 6.92 },
  nov:  { sales: 1780000, orders: 1520, adSpend: 260000, roas: 6.85 },
  dec:  { sales: 1580000, orders: 1380, adSpend: 230000, roas: 6.87 },
};

const months = [
  { value: 'sept', label: 'Sept 2025' },
  { value: 'oct', label: 'Oct 2025' },
  { value: 'nov', label: 'Nov 2025' },
  { value: 'dec', label: 'Dec 2025' },
];

const chartData = [
  { month: 'Sept', fbSales: 1450000, fbSpend: 185000, gSales: 1120000, gSpend: 165000 },
  { month: 'Oct', fbSales: 1780000, fbSpend: 210000, gSales: 1350000, gSpend: 195000 },
  { month: 'Nov', fbSales: 2150000, fbSpend: 280000, gSales: 1780000, gSpend: 260000 },
  { month: 'Dec', fbSales: 1920000, fbSpend: 245000, gSales: 1580000, gSpend: 230000 },
];

const roasChart = [
  { month: 'Sept', Facebook: 7.84, Google: 6.79 },
  { month: 'Oct', Facebook: 8.48, Google: 6.92 },
  { month: 'Nov', Facebook: 7.68, Google: 6.85 },
  { month: 'Dec', Facebook: 7.84, Google: 6.87 },
];

const fmt = (v: number) => `₹${(v / 100000).toFixed(1)}L`;

export default function DemoSalesAnalysis() {
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [month, setMonth] = useState('oct');

  const data = platform === 'facebook' ? fbData : googleData;
  const current = data[month as keyof typeof data];

  const kpis = [
    { label: 'Total Sales', value: fmt(current.sales), icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Total Orders', value: current.orders.toLocaleString(), icon: ShoppingCart, color: 'text-blue-400' },
    { label: 'Ad Spend', value: fmt(current.adSpend), icon: Target, color: 'text-amber-400' },
    { label: 'ROAS', value: `${current.roas}x`, icon: TrendingUp, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Analysis</h1>
          <p className="text-sm text-gray-400">Compare Facebook Pixel vs Google Ads performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40 bg-[#111833] border-white/10 text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2240] border-white/10">
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-gray-200 focus:bg-white/10 focus:text-white">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Platform Toggle */}
      <div className="flex gap-2">
        <Button
          variant={platform === 'facebook' ? 'default' : 'outline'}
          onClick={() => setPlatform('facebook')}
          className={platform === 'facebook'
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}
        >
          <Facebook className="w-4 h-4 mr-2" />
          Facebook Pixel
        </Button>
        <Button
          variant={platform === 'google' ? 'default' : 'outline'}
          onClick={() => setPlatform('google')}
          className={platform === 'google'
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}
        >
          <Chrome className="w-4 h-4 mr-2" />
          Google Ads
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-[#111833] border-white/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white/5`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
                <div>
                  <p className="text-xs text-gray-400">{k.label}</p>
                  <p className="text-xl font-bold text-white">{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#111833] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Sales vs Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                  <Tooltip contentStyle={{ background: '#1a2240', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [fmt(v), '']} />
                  <Bar dataKey={platform === 'facebook' ? 'fbSales' : 'gSales'} name="Sales" fill={platform === 'facebook' ? '#3b82f6' : '#f59e0b'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={platform === 'facebook' ? 'fbSpend' : 'gSpend'} name="Ad Spend" fill={platform === 'facebook' ? '#60a5fa' : '#fbbf24'} radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111833] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">ROAS Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={roasChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} domain={[5, 10]} />
                  <Tooltip contentStyle={{ background: '#1a2240', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="Facebook" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                  <Line type="monotone" dataKey="Google" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Facebook Pixel
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Google Ads
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
