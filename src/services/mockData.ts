import { 
  Product, 
  InventoryItem, 
  Order, 
  ReturnOrder, 
  Settlement, 
  Vendor, 
  Warehouse,
  Alert,
  Task,
  KPIData,
  SalesData,
  Portal
} from '@/types';

import { ProductHealth, MasterSKUMapping, OrderReconciliation, ConsolidatedOrderRow } from '@/types';

// Portal configurations — now dynamic via channelManager
import { getChannels } from '@/services/channelManager';

// Re-export as a getter so consumers always get fresh data
export const portalConfigs = (() => {
  return getChannels();
})();

// Use this function for guaranteed fresh data
export function getPortalConfigs() {
  return getChannels();
}

// All data is now fetched from the database. No mock data.
// NOTE: Mock data removed — all data should be fetched from the database
// If any consumer still needs lightweight placeholders, use the DB wrappers
// in `src/services/database.ts` or call `getChannels()` for portal configs.
