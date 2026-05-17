import { useAIAccess } from '@/contexts/AIAccessContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Bot, ShieldAlert, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';

export function AIAccessBanner() {
  const { aiMode } = useAIAccess();

  if (aiMode !== 'suggestion') return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2">
      <ShieldAlert className="w-4 h-4 text-amber-600" />
      <span className="text-sm font-medium text-amber-600">
        AI Suggestion Only – Human Approval Required
      </span>
    </div>
  );
}

export function AIAccessControl() {
  const { aiMode, setAIMode, criticalDecisionToggle, setCriticalDecisionToggle } = useAIAccess();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-8">
          {aiMode === 'suggestion' ? (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          ) : (
            <Bot className="w-4 h-4 text-primary" />
          )}
          <span className="hidden lg:inline text-xs">
            {aiMode === 'suggestion' ? 'Suggestion' : 'Autonomous'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Access Control
        </div>

        {/* Mode Toggle */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">AI Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAIMode('suggestion')}
              className={`p-2.5 rounded-lg border text-center transition-colors ${
                aiMode === 'suggestion'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <ShieldAlert className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs font-medium">Suggestion</p>
              <p className="text-[10px] text-muted-foreground">Needs approval</p>
            </button>
            <button
              onClick={() => setAIMode('autonomous')}
              className={`p-2.5 rounded-lg border text-center transition-colors ${
                aiMode === 'autonomous'
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Bot className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs font-medium">Autonomous</p>
              <p className="text-[10px] text-muted-foreground">Auto-execute</p>
            </button>
          </div>
        </div>

        {/* Critical Decision Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs font-medium">Critical Decisions</p>
              <p className="text-[10px] text-muted-foreground">Warn before financial actions</p>
            </div>
          </div>
          <Switch checked={criticalDecisionToggle} onCheckedChange={setCriticalDecisionToggle} />
        </div>

        {/* Status */}
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <Badge variant="outline" className={
            aiMode === 'suggestion'
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1'
              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1'
          }>
            {aiMode === 'suggestion' ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            {aiMode === 'suggestion' ? 'Human approval active' : 'AI autonomous mode'}
          </Badge>
        </div>
      </PopoverContent>
    </Popover>
  );
}
