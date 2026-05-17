import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Building2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Tier = 'basic' | 'pro' | 'enterprise';

interface Feature {
  name: string;
  basic: boolean;
  pro: boolean;
  enterprise: boolean;
}

const features: Feature[] = [
  { name: 'Dashboard Overview', basic: true, pro: true, enterprise: true },
  { name: 'Basic Reports', basic: true, pro: true, enterprise: true },
  { name: 'Sales Analysis', basic: false, pro: true, enterprise: true },
  { name: 'FB Pixel / Google Ads Comparison', basic: false, pro: true, enterprise: true },
  { name: 'Data Import (Excel/CSV)', basic: false, pro: true, enterprise: true },
  { name: 'VMS Reconciliation', basic: false, pro: false, enterprise: true },
  { name: 'Business Onboarding', basic: false, pro: false, enterprise: true },
  { name: 'Support Ticketing', basic: false, pro: false, enterprise: true },
  { name: 'API Pull Integration', basic: false, pro: false, enterprise: true },
  { name: 'White-label Branding', basic: false, pro: false, enterprise: true },
];

const tiers = [
  { id: 'basic' as Tier, name: 'Basic', price: '₹999', period: '/mo', icon: Zap, color: 'border-gray-500/30', badge: 'bg-gray-500/20 text-gray-300', desc: 'Dashboard view only' },
  { id: 'pro' as Tier, name: 'Pro', price: '₹2,499', period: '/mo', icon: Crown, color: 'border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', desc: 'Analytics + Import', popular: true },
  { id: 'enterprise' as Tier, name: 'Enterprise', price: '₹4,999', period: '/mo', icon: Building2, color: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-400', desc: 'All modules unlocked' },
];

export default function DemoSubscription() {
  const [activeTier, setActiveTier] = useState<Tier>('pro');
  const { toast } = useToast();

  const handleSelect = (tier: Tier) => {
    setActiveTier(tier);
    toast({ title: 'Plan Updated', description: `Switched to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription</h1>
        <p className="text-sm text-gray-400">Manage your plan and feature access</p>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <Card key={t.id} className={`bg-[#111833] border ${activeTier === t.id ? t.color : 'border-white/10'} relative transition-all`}>
            {t.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white text-[10px] px-2">Most Popular</Badge>
              </div>
            )}
            <CardContent className="pt-6 pb-5 text-center">
              <div className={`inline-flex p-3 rounded-xl ${t.badge} mb-3`}>
                <t.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{t.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white">{t.price}</span>
                <span className="text-sm text-gray-500">{t.period}</span>
              </div>
              <Button
                className={`w-full mt-4 ${
                  activeTier === t.id
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                onClick={() => handleSelect(t.id)}
              >
                {activeTier === t.id ? 'Current Plan' : 'Select Plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Matrix */}
      <Card className="bg-[#111833] border-white/10">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-300">Feature Access Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Basic</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Pro</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.name} className="border-b border-white/5">
                    <td className="py-3 px-4 text-gray-300">{f.name}</td>
                    {(['basic', 'pro', 'enterprise'] as const).map((tier) => (
                      <td key={tier} className="py-3 px-4 text-center">
                        {f[tier] ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
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
