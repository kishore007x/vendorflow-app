import { Settings2, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { WidgetConfig } from '@/hooks/useDashboardWidgets';

interface DashboardCustomizerProps {
  widgets: WidgetConfig[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onReset: () => void;
}

export function DashboardCustomizer({ widgets, onToggle, onMove, onReset }: DashboardCustomizerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Settings2 className="w-3.5 h-3.5" />
          Customize
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Customize Dashboard</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onReset}>
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-1">
          <p className="text-xs text-muted-foreground mb-3">Show, hide, or reorder dashboard widgets</p>
          {widgets.map((widget, idx) => (
            <div key={widget.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${widget.visible ? 'bg-card border-border' : 'bg-muted/30 border-transparent opacity-60'}`}>
              <div className="flex flex-col gap-0.5">
                <button
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  onClick={() => onMove(widget.id, 'up')}
                  disabled={idx === 0}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  onClick={() => onMove(widget.id, 'down')}
                  disabled={idx === widgets.length - 1}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{widget.label}</p>
              </div>
              <Switch checked={widget.visible} onCheckedChange={() => onToggle(widget.id)} />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
