import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, RotateCcw, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

type Preset = 'today' | '7days' | '30days' | 'this_month' | 'this_year' | 'custom';

const presetLabels: Record<Preset, string> = {
  today: 'Today',
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  this_month: 'This Month',
  this_year: 'This Year',
  custom: 'Custom Range',
};

function getPresetRange(preset: Preset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'this_month':
      return { from: startOfMonth(now), to: endOfDay(now) };
    case 'this_year':
      return { from: startOfYear(now), to: endOfDay(now) };
    default:
      return { from: undefined, to: undefined };
  }
}

interface GlobalDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function GlobalDateFilter({ value, onChange, className }: GlobalDateFilterProps) {
  const [preset, setPreset] = useState<Preset>('30days');
  const [customOpen, setCustomOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value.to);

  const handlePresetChange = (selected: string) => {
    const p = selected as Preset;
    setPreset(p);
    if (p === 'custom') {
      setCustomOpen(true);
      return;
    }
    onChange(getPresetRange(p));
  };

  const applyCustom = () => {
    if (tempFrom && tempTo) {
      onChange({ from: tempFrom, to: tempTo });
      setCustomOpen(false);
    }
  };

  const displayLabel =
    preset === 'custom' && value.from && value.to
      ? `${format(value.from, 'dd MMM')} – ${format(value.to, 'dd MMM')}`
      : presetLabels[preset];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[170px] gap-2">
          <CalendarIcon className="w-4 h-4 shrink-0" />
          <SelectValue>{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(presetLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom range popover */}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-3">
            <p className="text-sm font-medium">Select Date Range</p>
            <div className="flex gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">From</p>
                <Calendar
                  mode="single"
                  selected={tempFrom}
                  onSelect={setTempFrom}
                  className={cn('p-2 pointer-events-auto')}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">To</p>
                <Calendar
                  mode="single"
                  selected={tempTo}
                  onSelect={setTempTo}
                  disabled={(date) => (tempFrom ? date < tempFrom : false)}
                  className={cn('p-2 pointer-events-auto')}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                disabled={!tempFrom || !tempTo}
                onClick={applyCustom}
              >
                <Check className="w-3.5 h-3.5" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setTempFrom(undefined);
                  setTempTo(undefined);
                  setPreset('30days');
                  onChange({ from: undefined, to: undefined });
                  setCustomOpen(false);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
