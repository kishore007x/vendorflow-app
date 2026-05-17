import { PortalConfig } from '@/types';

const STORAGE_KEY = 'vendorflow_channel_configs';

const DEFAULT_CHANNELS: PortalConfig[] = [
  { id: 'amazon' as any, name: 'Amazon', color: 'hsl(33, 100%, 50%)', icon: '🛒' },
  { id: 'flipkart' as any, name: 'Flipkart', color: 'hsl(45, 100%, 51%)', icon: '🛍️' },
  { id: 'meesho' as any, name: 'Meesho', color: 'hsl(340, 82%, 52%)', icon: '📦' },
  { id: 'firstcry' as any, name: 'FirstCry', color: 'hsl(199, 89%, 48%)', icon: '👶' },
  { id: 'blinkit' as any, name: 'Blinkit', color: 'hsl(45, 100%, 51%)', icon: '⚡' },
  { id: 'myntra' as any, name: 'Myntra', color: 'hsl(350, 80%, 55%)', icon: '👗' },
  { id: 'nykaa' as any, name: 'Nykaa', color: 'hsl(330, 70%, 50%)', icon: '💄' },
  { id: 'ajio' as any, name: 'Ajio', color: 'hsl(210, 70%, 45%)', icon: '👔' },
  { id: 'own_website' as any, name: 'Own Website', color: 'hsl(262, 83%, 58%)', icon: '🌐' },
];

// Available icons for the picker
export const AVAILABLE_ICONS = [
  '🛒', '🛍️', '📦', '👶', '⚡', '👗', '💄', '👔', '🌐',
  '🏪', '🏬', '🛏️', '🎁', '💎', '🎯', '🔥', '⭐', '🚀',
  '💊', '🧴', '👟', '👜', '🎮', '📱', '💻', '🏠', '🍔',
  '🥤', '🛵', '🎨', '📚', '🧸', '🌿', '✨', '🏷️', '📌',
  '🔷', '🔶', '🟢', '🟣', '🟠', '🔴', '🟡', '🔵', '⬛',
];

export const AVAILABLE_COLORS = [
  'hsl(33, 100%, 50%)',   // Orange (Amazon)
  'hsl(45, 100%, 51%)',   // Yellow
  'hsl(340, 82%, 52%)',   // Pink
  'hsl(199, 89%, 48%)',   // Sky Blue
  'hsl(262, 83%, 58%)',   // Purple
  'hsl(350, 80%, 55%)',   // Rose
  'hsl(330, 70%, 50%)',   // Magenta
  'hsl(210, 70%, 45%)',   // Blue
  'hsl(142, 71%, 45%)',   // Green
  'hsl(0, 72%, 51%)',     // Red
  'hsl(25, 95%, 53%)',    // Deep Orange
  'hsl(180, 70%, 40%)',   // Teal
  'hsl(270, 60%, 50%)',   // Violet
  'hsl(60, 70%, 45%)',    // Olive
  'hsl(300, 60%, 50%)',   // Fuchsia
  'hsl(15, 85%, 55%)',    // Coral
];

let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach(fn => fn());
}

export function subscribeChannels(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function getChannels(): PortalConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_CHANNELS;
}

export function saveChannels(channels: PortalConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  notify();
}

export function addChannel(channel: PortalConfig) {
  const channels = getChannels();
  channels.push(channel);
  saveChannels(channels);
}

export function updateChannel(id: string, updates: Partial<PortalConfig>) {
  const channels = getChannels().map(c =>
    c.id === id ? { ...c, ...updates } : c
  );
  saveChannels(channels);
}

export function removeChannel(id: string) {
  const channels = getChannels().filter(c => c.id !== id);
  saveChannels(channels);
}

export function reorderChannels(channels: PortalConfig[]) {
  saveChannels(channels);
}

export function resetChannels() {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

// Generate a safe ID from a name
export function generateChannelId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
