import { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

type AIMode = 'suggestion' | 'autonomous';

interface AIAccessContextType {
  aiMode: AIMode;
  setAIMode: (mode: AIMode) => void;
  criticalDecisionToggle: boolean;
  setCriticalDecisionToggle: (v: boolean) => void;
  requireApproval: (action: string, onApprove: () => void) => void;
}

const AIAccessContext = createContext<AIAccessContextType | null>(null);

export function useAIAccess() {
  const ctx = useContext(AIAccessContext);
  if (!ctx) throw new Error('useAIAccess must be used within AIAccessProvider');
  return ctx;
}

export function AIAccessProvider({ children }: { children: ReactNode }) {
  const [aiMode, setAIMode] = useState<AIMode>('suggestion');
  const [criticalDecisionToggle, setCriticalDecisionToggle] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ action: string; onApprove: () => void } | null>(null);

  const requireApproval = (action: string, onApprove: () => void) => {
    if (aiMode === 'suggestion' && criticalDecisionToggle) {
      setPendingAction({ action, onApprove });
    } else {
      onApprove();
    }
  };

  return (
    <AIAccessContext.Provider value={{ aiMode, setAIMode, criticalDecisionToggle, setCriticalDecisionToggle, requireApproval }}>
      {children}

      <Dialog open={!!pendingAction} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Human Approval Required
            </DialogTitle>
            <DialogDescription>
              AI is in Suggestion Mode. This action requires human confirmation before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <p className="text-sm font-medium">{pendingAction?.action}</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button onClick={() => { pendingAction?.onApprove(); setPendingAction(null); }} className="gap-2">
              <ShieldCheck className="w-4 h-4" />Approve & Execute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AIAccessContext.Provider>
  );
}
