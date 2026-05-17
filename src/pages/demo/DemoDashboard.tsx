import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ShoppingCart, IndianRupee, ArrowUpRight, ArrowDownRight, Package, RotateCcw, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const kpis = [
  { label: 'Total Revenue', value: '₹48,72,350', change: '+12.5%', up: true, icon: IndianRupee },
  { label: 'Total Orders', value: '3,847', change: '+8.2%', up: true, icon: ShoppingCart },
  { label: 'Active SKUs', value: '1,245', change: '+3.1%', up: true, icon: Package },
  { label: 'Return Rate', value: '4.2%', change: '-0.8%', up: false, icon: RotateCcw },
];

const marketplaceData = [
  { name: 'Sept', Flipkart: 1250000, Amazon: 980000, Meesho: 420000 },
  { name: 'Oct', Flipkart: 1480000, Amazon: 1120000, Meesho: 510000 },
  { name: 'Nov', Flipkart: 1820000, Amazon: 1350000, Meesho: 680000 },
  { name: 'Dec', Flipkart: 1650000, Amazon: 1280000, Meesho: 590000 },
];

const pieData = [
  { name: 'Flipkart', value: 45, color: '#3b82f6' },
  { name: 'Amazon', value: 35, color: '#f59e0b' },
  { name: 'Meesho', value: 20, color: '#a855f7' },
];

const recentOrders = [
  { id: 'FLP-78234', marketplace: 'Flipkart', amount: '₹2,450', status: 'Delivered' },
  { id: 'AMZ-45621', marketplace: 'Amazon', amount: '₹5,890', status: 'Shipped' },
  { id: 'MSH-12098', marketplace: 'Meesho', amount: '₹1,200', status: 'Processing' },
  { id: 'FLP-78240', marketplace: 'Flipkart', amount: '₹3,100', status: 'Delivered' },
  { id: 'AMZ-45630', marketplace: 'Amazon', amount: '₹7,250', status: 'Shipped' },
];

export default function DemoDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400">Multi-portal sales overview • Sept–Dec 2025</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-[#111833] border-white/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-500/10"><k.icon className="w-4 h-4 text-blue-400" /></div>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${k.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {k.change}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-[#111833] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Revenue by Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketplaceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                  <Tooltip contentStyle={{ background: '#1a2240', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [`₹${(v/100000).toFixed(1)}L`, '']} />
                  <Bar dataKey="Flipkart" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Amazon" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Meesho" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111833] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Revenue Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a2240', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name} ({d.value}%)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="bg-[#111833] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-400 font-medium">Order ID</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Marketplace</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5">
                    <td className="py-2.5 text-gray-200 font-mono text-xs">{o.id}</td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="text-xs border-white/20 text-gray-300">{o.marketplace}</Badge>
                    </td>
                    <td className="py-2.5 text-gray-200">{o.amount}</td>
                    <td className="py-2.5">
                      <Badge className={`text-xs ${
                        o.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        o.status === 'Shipped' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
