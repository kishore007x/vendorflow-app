import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Chart colors matching our design system
export const CHART_COLORS = {
  primary: 'hsl(222, 47%, 20%)',
  accent: 'hsl(173, 80%, 40%)',
  info: 'hsl(199, 89%, 48%)',
  warning: 'hsl(38, 92%, 50%)',
  success: 'hsl(142, 76%, 36%)',
  destructive: 'hsl(0, 84%, 60%)',
};

export const PORTAL_COLORS: Record<string, string> = {
  amazon: 'hsl(33, 100%, 50%)',
  flipkart: 'hsl(45, 100%, 40%)',
  meesho: 'hsl(340, 82%, 52%)',
  firstcry: 'hsl(199, 89%, 48%)',
  blinkit: 'hsl(45, 100%, 51%)',
};

interface SalesChartProps {
  data: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Sales Trend</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }} />
            <span className="text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.accent }} />
            <span className="text-muted-foreground">Orders</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 13%, 91%)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
            formatter={(value: number, name: string) => [
              name === 'revenue' ? `₹${value.toLocaleString()}` : value,
              name === 'revenue' ? 'Revenue' : 'Orders'
            ]}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders"
            stroke={CHART_COLORS.accent}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface InventoryChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function InventoryChart({ data }: InventoryChartProps) {
  return (
    <div className="chart-container">
      <h3 className="font-semibold text-foreground mb-6">Inventory Status</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 13%, 91%)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value} SKUs`, '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReturnsChartProps {
  data: Array<{
    date: string;
    returns: number;
    claims: number;
  }>;
}

export function ReturnsChart({ data }: ReturnsChartProps) {
  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Returns & Claims</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 13%, 91%)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="returns" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} />
          <Bar dataKey="claims" fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.warning }} />
          <span className="text-sm text-muted-foreground">Returns</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.info }} />
          <span className="text-sm text-muted-foreground">Claims</span>
        </div>
      </div>
    </div>
  );
}

interface PortalSalesChartProps {
  data: Array<{
    portal: string;
    revenue: number;
  }>;
}

export function PortalSalesChart({ data }: PortalSalesChartProps) {
  return (
    <div className="chart-container">
      <h3 className="font-semibold text-foreground mb-6">Revenue by Portal</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" horizontal={false} />
          <XAxis 
            type="number"
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
          />
          <YAxis 
            type="category"
            dataKey="portal"
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 13%, 91%)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
          />
          <Bar 
            dataKey="revenue" 
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={PORTAL_COLORS[entry.portal.toLowerCase()] || CHART_COLORS.primary} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
