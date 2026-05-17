import { Columns3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ColumnDef } from '@/hooks/useColumnVisibility';

interface ColumnToggleProps {
  columns: ColumnDef[];
  onToggle: (key: string) => void;
  onReset: () => void;
}

export function ColumnToggle({ columns, onToggle, onReset }: ColumnToggleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Columns3 className="w-3.5 h-3.5" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Show / Hide Columns</p>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={onReset}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
          {columns.map(col => (
            <label key={col.key} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1.5 py-1">
              <Checkbox
                checked={col.visible}
                onCheckedChange={() => onToggle(col.key)}
                disabled={col.locked}
              />
              <span className={col.locked ? 'text-muted-foreground' : ''}>{col.label}</span>
              {col.locked && <span className="text-[10px] text-muted-foreground ml-auto">Required</span>}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
