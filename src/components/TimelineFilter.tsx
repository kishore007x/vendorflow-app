import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type TimelinePreset = 'today' | '7days' | '30days' | 'this_month' | 'this_year' | 'custom';

const presetLabels: Record<TimelinePreset, string> = {
  today: 'Today',
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  this_month: 'This Month',
  this_year: 'This Year',
  custom: 'Custom Range',
};

export interface TimelineValue {
  preset: TimelinePreset;
  from?: Date;
  to?: Date;
}

interface TimelineFilterProps {
  value: TimelineValue;
  onChange: (v: TimelineValue) => void;
  className?: string;
}

export function getTimelineLabel(value: TimelineValue): string {
  if (value.preset === 'custom' && value.from && value.to) {
    return `${format(value.from, 'dd MMM')} – ${format(value.to, 'dd MMM yyyy')}`;
  }
  return presetLabels[value.preset];
}

export function TimelineFilter({ value, onChange, className }: TimelineFilterProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value.to);

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setCustomOpen(true);
      return;
    }
    onChange({ preset: preset as TimelinePreset });
  };

  const applyCustom = () => {
    if (tempFrom && tempTo) {
      onChange({ preset: 'custom', from: tempFrom, to: tempTo });
      setCustomOpen(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={value.preset}
        onValueChange={handlePresetChange}
      >
        <SelectTrigger className="w-[180px] gap-2">
          <CalendarIcon className="w-4 h-4 shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(presetLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom date range popover */}
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
                  className={cn('p-2 pointer-events-auto')}
                />
              </div>
            </div>
            <Button size="sm" className="w-full" disabled={!tempFrom || !tempTo} onClick={applyCustom}>
              Apply Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {value.preset === 'custom' && value.from && value.to && (
        <span className="text-xs text-muted-foreground">
          {format(value.from, 'dd MMM yyyy')} – {format(value.to, 'dd MMM yyyy')}
        </span>
      )}
    </div>
  );
}
