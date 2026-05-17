import { Palette, Sun, Moon, Type, RotateCcw, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { ThemeSettings } from '@/hooks/useThemeSettings';

interface ThemeCustomizerProps {
  settings: ThemeSettings;
  onUpdate: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  onReset: () => void;
  accentPresets: { label: string; value: string; hex: string }[];
}

export function ThemeCustomizer({ settings, onUpdate, onReset, accentPresets }: ThemeCustomizerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Palette className="w-3.5 h-3.5" />
          Theme
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Appearance</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onReset}>
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Dark Mode */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-3">
              {settings.darkMode ? <Moon className="w-5 h-5 text-accent" /> : <Sun className="w-5 h-5 text-warning" />}
              <div>
                <p className="text-sm font-semibold">Dark Mode</p>
                <p className="text-xs text-muted-foreground">{settings.darkMode ? 'Dark theme active' : 'Light theme active'}</p>
              </div>
            </div>
            <Switch checked={settings.darkMode} onCheckedChange={v => onUpdate('darkMode', v)} />
          </div>

          {/* Font Size */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Font Size</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => onUpdate('fontSize', size)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                    settings.fontSize === size
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Accent Color</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {accentPresets.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => onUpdate('accentColor', preset.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    settings.accentColor === preset.value
                      ? 'border-accent ring-1 ring-accent/30'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Mode */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-3">
              <Minimize2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Compact Mode</p>
                <p className="text-xs text-muted-foreground">Reduce spacing & padding</p>
              </div>
            </div>
            <Switch checked={settings.compactMode} onCheckedChange={v => onUpdate('compactMode', v)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
