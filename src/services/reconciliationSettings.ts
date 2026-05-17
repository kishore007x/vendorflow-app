// Shared reconciliation settings store (simulated persistence)
// In production, this would be stored in a database

type TolerancePreset = '1' | '5' | 'custom';

interface ReconciliationSettings {
  tolerancePreset: TolerancePreset;
  toleranceValue: number;
}

let currentSettings: ReconciliationSettings = {
  tolerancePreset: '5',
  toleranceValue: 5,
};

const listeners: Set<() => void> = new Set();

export function getReconciliationSettings(): ReconciliationSettings {
  return currentSettings;
}

export function setReconciliationSettings(settings: ReconciliationSettings) {
  currentSettings = { ...settings };
  listeners.forEach(fn => fn());
}

export function subscribeReconciliationSettings(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
