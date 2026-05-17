import { useState, useEffect, useCallback } from 'react';

export interface ThemeSettings {
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  accentColor: string; // HSL values like "284 40% 41%"
  compactMode: boolean;
}

const STORAGE_KEY = 'vendorflow-theme';

const DEFAULT_SETTINGS: ThemeSettings = {
  darkMode: false,
  fontSize: 'medium',
  accentColor: '284 40% 41%',
  compactMode: false,
};

const ACCENT_PRESETS = [
  { label: 'Royal Amethyst', value: '284 40% 41%', hex: '#7A3F91' },
  { label: 'Ocean Blue', value: '220 75% 50%', hex: '#2563EB' },
  { label: 'Emerald', value: '158 58% 42%', hex: '#10B981' },
  { label: 'Sunset Orange', value: '25 95% 53%', hex: '#F97316' },
  { label: 'Rose', value: '346 77% 50%', hex: '#E11D48' },
  { label: 'Teal', value: '173 80% 40%', hex: '#0D9488' },
];

function loadSettings(): ThemeSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function applySettings(settings: ThemeSettings) {
  const root = document.documentElement;

  // Dark mode
  if (settings.darkMode) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Font size
  const sizeMap = { small: '13px', medium: '14px', large: '16px' };
  root.style.fontSize = sizeMap[settings.fontSize];

  // Accent color
  root.style.setProperty('--accent', settings.accentColor);

  // Compact mode
  if (settings.compactMode) {
    root.classList.add('compact');
  } else {
    root.classList.remove('compact');
  }
}

export function useThemeSettings() {
  const [settings, setSettings] = useState<ThemeSettings>(loadSettings);

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply on mount
  useEffect(() => {
    applySettings(settings);
  }, []);

  const updateSetting = useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetToDefaults, ACCENT_PRESETS };
}
