import { useState, useEffect } from 'react';
import { dropdownOptionsDb } from '@/services/database';

const DEFAULTS: Record<string, { label: string; value: string }[]> = {
  expense_category: [
    { label: 'Office Miscellaneous', value: 'office_misc' },
    { label: 'Warehouse Miscellaneous', value: 'warehouse_misc' },
    { label: 'Day to Day Expense', value: 'daily' },
    { label: 'Lunch, Tea & Coffee', value: 'food' },
    { label: 'Stationery', value: 'stationery' },
    { label: 'Transport', value: 'transport' },
    { label: 'Tips & Wages', value: 'tips_wages' },
  ],
  payment_mode: [
    { label: 'Cash', value: 'Cash' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Card', value: 'Card' },
    { label: 'Online', value: 'Online' },
    { label: 'Wallet', value: 'Wallet' },
  ],
  paid_by: [
    { label: 'Self', value: 'Self' },
  ],
  brand: [
    { label: 'Boat', value: 'Boat' },
    { label: 'Samsung', value: 'Samsung' },
    { label: 'Nike', value: 'Nike' },
    { label: 'Puma', value: 'Puma' },
    { label: 'Mamaearth', value: 'Mamaearth' },
    { label: 'Sony', value: 'Sony' },
    { label: 'Apple', value: 'Apple' },
  ],
  category: [
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Fashion', value: 'Fashion' },
    { label: 'Beauty', value: 'Beauty' },
    { label: 'Home & Kitchen', value: 'Home & Kitchen' },
    { label: 'Health & Wellness', value: 'Health & Wellness' },
    { label: 'Sports', value: 'Sports' },
    { label: 'Accessories', value: 'Accessories' },
  ],
  size: [
    { label: 'M', value: 'M' },
    { label: 'L', value: 'L' },
    { label: 'XL', value: 'XL' },
    { label: 'XXL', value: 'XXL' },
    { label: 'XXXL', value: 'XXXL' },
    { label: '4XL', value: '4XL' },
    { label: '5XL', value: '5XL' },
    { label: 'Free Size', value: 'Free Size' },
  ],
  warehouse: [
    { label: 'Main Warehouse', value: 'Main Warehouse' },
    { label: 'Secondary', value: 'Secondary' },
    { label: 'Fulfillment Center', value: 'Fulfillment Center' },
  ],
};

export function useDropdownOptions(fieldType: string) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>(DEFAULTS[fieldType] || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await dropdownOptionsDb.getByFieldType(fieldType);
        if (data.length > 0) {
          setOptions(data.map((d: any) => ({ label: d.label, value: d.value })));
        }
        // else keep defaults
      } catch {
        // keep defaults on error
      } finally {
        setLoading(false);
      }
    })();
  }, [fieldType]);

  return { options, loading };
}
