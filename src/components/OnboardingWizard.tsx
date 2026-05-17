import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Upload, ShoppingCart, BarChart3, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'vendorflow_onboarding_completed';

const steps = [
  {
    icon: Package,
    title: 'Add Your Products',
    description: 'Start by adding your product catalog. You can add products one-by-one or bulk upload via Excel.',
    actionLabel: 'Go to Products',
    path: '/products',
    color: 'text-blue-600 bg-blue-500/10',
  },
  {
    icon: Upload,
    title: 'Import Your Data',
    description: 'Upload orders, inventory, and other data from your marketplace portals using our Excel import tool.',
    actionLabel: 'Go to Data Import',
    path: '/data-import',
    color: 'text-emerald-600 bg-emerald-500/10',
  },
  {
    icon: ShoppingCart,
    title: 'Manage Orders',
    description: 'Track orders across Amazon, Flipkart, Meesho, FirstCry, Blinkit and your own website.',
    actionLabel: 'Go to Orders',
    path: '/orders',
    color: 'text-amber-600 bg-amber-500/10',
  },
  {
    icon: BarChart3,
    title: 'View Analytics',
    description: 'Once data is in, your dashboard will light up with insights, trends, and actionable KPIs.',
    actionLabel: 'View Dashboard',
    path: '/dashboard',
    color: 'text-purple-600 bg-purple-500/10',
  },
];

export function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `${ONBOARDING_KEY}_${user.id}`;
    const completed = localStorage.getItem(key);
    if (!completed) {
      // Small delay so dashboard loads first
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, 'true');
    }
    setOpen(false);
  };

  const handleGoToStep = (path: string) => {
    handleClose();
    navigate(path);
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Welcome to VendorFlow!</h2>
          </div>
          <p className="text-sm text-muted-foreground">Let's get your business set up in 4 simple steps.</p>
          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-8 bg-primary' : idx < currentStep ? 'w-4 bg-primary/40' : 'w-4 bg-border'
                }`}
              />
            ))}
            <Badge variant="outline" className="ml-auto text-[10px]">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${step.color}`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
            Skip for now
          </Button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(currentStep - 1)}>
                Back
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)} className="gap-1">
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleGoToStep(step.path)} className="gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Get Started
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
