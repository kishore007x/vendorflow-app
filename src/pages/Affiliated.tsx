import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Link2, Globe, TrendingUp, Plus } from 'lucide-react';

export default function Affiliated() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Affiliated</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage affiliate partnerships, referral programs, and commission tracking.
          </p>
        </div>
        <Button className="gap-2" style={{ background: 'var(--gradient-deep)', color: 'white' }}>
          <Plus className="w-4 h-4" /> Add Partner
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">No partners added yet</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Pending referral tracking</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground mt-1">Commission earned this month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="py-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--glass-bg-medium)' }}>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No Affiliate Partners Yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                Start building your affiliate network. Add partners, generate referral links, and track commissions automatically.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" className="gap-2">
                <Link2 className="w-4 h-4" /> Generate Referral Link
              </Button>
              <Button className="gap-2" style={{ background: 'var(--gradient-deep)', color: 'white' }}>
                <Plus className="w-4 h-4" /> Add Partner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
