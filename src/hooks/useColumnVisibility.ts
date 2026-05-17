import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'vendorflow-columns-';

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Can't be hidden
}

export function useColumnVisibility(tableId: string, defaultColumns: ColumnDef[]) {
  const storageKey = STORAGE_KEY_PREFIX + tableId;

  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const savedVisibility: Record<string, boolean> = JSON.parse(stored);
        return defaultColumns.map(col => ({
          ...col,
          visible: col.locked ? true : (savedVisibility[col.key] ?? col.visible),
        }));
      }
    } catch {}
    return defaultColumns;
  });

  useEffect(() => {
    const visibility: Record<string, boolean> = {};
    columns.forEach(col => { visibility[col.key] = col.visible; });
    localStorage.setItem(storageKey, JSON.stringify(visibility));
  }, [columns, storageKey]);

  const toggleColumn = useCallback((key: string) => {
    setColumns(prev => prev.map(col =>
      col.key === key && !col.locked ? { ...col, visible: !col.visible } : col
    ));
  }, []);

  const isVisible = useCallback((key: string) => {
    return columns.find(c => c.key === key)?.visible ?? true;
  }, [columns]);

  const resetColumns = useCallback(() => {
    setColumns(defaultColumns);
    localStorage.removeItem(storageKey);
  }, [defaultColumns, storageKey]);

  const visibleColumns = columns.filter(c => c.visible);

  return { columns, visibleColumns, toggleColumn, isVisible, resetColumns };
}
