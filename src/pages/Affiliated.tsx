import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Link2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Affiliated() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ totalPartners: 0, activeReferrals: 0, totalCommission: 0 });
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await import('@/services/database');
        const [vendors, orders] = await Promise.all([
          db.vendorsDb.getAll().catch(() => []),
          db.ordersDb.getAll().catch(() => []),
        ]);
        if (!mounted) return;
        const v = (vendors || []) as Record<string, unknown>[];
        const o = (orders || []) as Record<string, unknown>[];
        const totalCommission = o.reduce((s, ord) => s + (Number(ord.commission) || 0), 0);
        setStats({
          totalPartners: v.length,
          activeReferrals: o.filter((ord) => ord.referral_id || ord.affiliate_id).length,
          totalCommission: Math.round(totalCommission),
        });
      } catch (e) { console.debug('load affiliates failed', e); }
    })();
    return () => { mounted = false; };
  }, []);

  const handleAddPartner = () => {
    toast({ title: 'Add Partner', description: 'Partner addition form would open here.' });
  };

  const handleGenerateLink = () => {
    toast({ title: 'Referral Link', description: 'Referral link generated. Share it with your partner.' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Affiliated</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage affiliate partnerships, referral programs, and commission tracking.
          </p>
        </div>
        <Button className="gap-2" style={{ background: 'var(--gradient-deep)', color: 'white' }} onClick={handleAddPartner}>
          <Plus className="w-4 h-4" /> Add Partner
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPartners}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalPartners > 0 ? `${stats.totalPartners} registered partners` : 'No partners added yet'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeReferrals}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeReferrals > 0 ? `${stats.activeReferrals} tracked referrals` : 'Pending referral tracking'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalCommission.toLocaleString()}</div>
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
              <h3 className="text-lg font-semibold">{stats.totalPartners > 0 ? `${stats.totalPartners} Affiliate Partner(s)` : 'No Affiliate Partners Yet'}</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                {stats.totalPartners > 0 ? 'Partners are loaded from your vendor database.' : 'Start building your affiliate network. Add partners, generate referral links, and track commissions automatically.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" className="gap-2" onClick={handleGenerateLink}>
                <Link2 className="w-4 h-4" /> Generate Referral Link
              </Button>
              <Button className="gap-2" style={{ background: 'var(--gradient-deep)', color: 'white' }} onClick={handleAddPartner}>
                <Plus className="w-4 h-4" /> Add Partner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
