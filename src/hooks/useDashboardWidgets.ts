import { useState, useEffect, useCallback } from 'react';

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

const STORAGE_KEY = 'vendorflow-dashboard-widgets';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'daily-summary', label: 'Daily Summary', visible: true, order: 0 },
  { id: 'kpi-row', label: 'KPI Cards', visible: true, order: 1 },
  { id: 'sales-trend', label: 'Sales Trend Chart', visible: true, order: 2 },
  { id: 'executive-widgets', label: 'Executive Widgets', visible: true, order: 3 },
  { id: 'inventory-chart', label: 'Inventory Status', visible: true, order: 4 },
  { id: 'portal-sales', label: 'Channel Revenue', visible: true, order: 5 },
  { id: 'financial-overview', label: 'Financial Overview', visible: true, order: 6 },
  { id: 'top-products', label: 'Top Products', visible: true, order: 7 },
  { id: 'top-brands', label: 'Top Brands', visible: true, order: 8 },
];

function loadWidgets(): WidgetConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WidgetConfig[];
      // Merge with defaults to pick up any new widgets
      const ids = new Set(parsed.map(w => w.id));
      const merged = [...parsed];
      DEFAULT_WIDGETS.forEach(dw => {
        if (!ids.has(dw.id)) merged.push(dw);
      });
      return merged.sort((a, b) => a.order - b.order);
    }
  } catch {}
  return DEFAULT_WIDGETS;
}

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadWidgets);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  }, []);

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  const isVisible = useCallback((id: string) => {
    return widgets.find(w => w.id === id)?.visible ?? true;
  }, [widgets]);

  const resetWidgets = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  return { widgets, toggleWidget, moveWidget, isVisible, resetWidgets };
}
