// Module definitions for smart Excel import: field schemas, validation, sample data, templates

export interface ModuleField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'date' | 'email' | 'select';
  options?: string[];
  defaultValue?: any;
  validate?: (value: any) => string | null; // returns error message or null
}

export interface ImportModule {
  id: string;
  label: string;
  icon: string;
  dbTable: string;
  fields: ModuleField[];
  sampleData: Record<string, any>[];
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const IMPORT_MODULES: ImportModule[] = [
  {
    id: 'orders',
    label: 'Orders',
    icon: 'Package',
    dbTable: 'orders',
    fields: [
      { key: 'order_number', label: 'Order Number', required: true, type: 'text' },
      { key: 'portal', label: 'Portal/Channel', required: false, type: 'select', options: ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'FirstCry', 'Blinkit', 'Own Website'], defaultValue: 'FirstCry' },
      { key: 'customer_name', label: 'Customer Name', required: false, type: 'text', defaultValue: 'N/A' },
      { key: 'customer_email', label: 'Customer Email', required: false, type: 'email', validate: v => v && !emailRegex.test(v) ? 'Invalid email format' : null },
      { key: 'customer_phone', label: 'Customer Phone', required: false, type: 'text' },
      { key: 'customer_city', label: 'City', required: false, type: 'text' },
      { key: 'customer_state', label: 'State', required: false, type: 'text' },
      { key: 'customer_pincode', label: 'Pincode', required: false, type: 'text' },
      { key: 'total_amount', label: 'Total Amount (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'commission', label: 'Commission (₹)', required: false, type: 'number' },
      { key: 'shipping_fee', label: 'Shipping Fee (₹)', required: false, type: 'number' },
      { key: 'status', label: 'Status', required: false, type: 'select', options: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rto', 'returned', 'Account Approved', 'Account Rejected'] },
      { key: 'order_date', label: 'Order Date', required: false, type: 'date' },
    ],
    sampleData: [
      { order_number: 'ORD-2026-001', portal: 'Amazon', customer_name: 'Rahul Sharma', customer_email: 'rahul@email.com', customer_phone: '9876543210', customer_city: 'Mumbai', customer_state: 'Maharashtra', customer_pincode: '400001', total_amount: 2999, commission: 450, shipping_fee: 49, status: 'delivered', order_date: '2026-03-01' },
      { order_number: 'ORD-2026-002', portal: 'Flipkart', customer_name: 'Priya Patel', customer_email: 'priya@email.com', customer_phone: '9123456780', customer_city: 'Delhi', customer_state: 'Delhi', customer_pincode: '110001', total_amount: 1599, commission: 240, shipping_fee: 0, status: 'shipped', order_date: '2026-03-02' },
      { order_number: 'ORD-2026-003', portal: 'Meesho', customer_name: 'Ankit Kumar', customer_email: '', customer_phone: '9988776655', customer_city: 'Jaipur', customer_state: 'Rajasthan', customer_pincode: '302001', total_amount: 799, commission: 120, shipping_fee: 30, status: 'pending', order_date: '2026-03-03' },
    ],
  },
  {
    id: 'products',
    label: 'Products & Inventory',
    icon: 'Box',
    dbTable: 'products',
    fields: [
      { key: 'name', label: 'Product Name', required: true, type: 'text' },
      { key: 'sku', label: 'SKU', required: true, type: 'text' },
      { key: 'brand', label: 'Brand', required: false, type: 'text' },
      { key: 'category', label: 'Category', required: false, type: 'text' },
      { key: 'mrp', label: 'MRP (₹)', required: false, type: 'number', defaultValue: 0, validate: v => v !== undefined && v !== null && v !== '' && Number(v) < 0 ? 'MRP cannot be negative' : null },
      { key: 'base_price', label: 'Base Price (₹)', required: false, type: 'number', defaultValue: 0, validate: v => v !== undefined && v !== null && v !== '' && Number(v) < 0 ? 'Price cannot be negative' : null },
      { key: 'hsn_code', label: 'HSN Code', required: false, type: 'text' },
      { key: 'gst_percent', label: 'GST %', required: false, type: 'number', validate: v => v && (v < 0 || v > 28) ? 'GST must be 0-28%' : null },
      { key: 'status', label: 'Status', required: false, type: 'select', options: ['active', 'inactive', 'draft'] },
    ],
    sampleData: [
      { name: 'Wireless Earbuds Pro', sku: 'SKU-WEP-001', brand: 'SoundMax', category: 'Electronics', mrp: 3999, base_price: 2999, hsn_code: '85183000', gst_percent: 18, status: 'active' },
      { name: 'Cotton T-Shirt Classic', sku: 'SKU-CTS-002', brand: 'FashionHub', category: 'Clothing', mrp: 999, base_price: 599, hsn_code: '61091000', gst_percent: 5, status: 'active' },
      { name: 'Baby Gift Set Premium', sku: 'SKU-BGS-003', brand: 'LittleJoy', category: 'Baby Care', mrp: 1999, base_price: 1299, hsn_code: '95030090', gst_percent: 12, status: 'active' },
    ],
  },
  {
    id: 'settlements',
    label: 'Settlements & Finance',
    icon: 'Banknote',
    dbTable: 'settlements',
    fields: [
      { key: 'settlement_id', label: 'Settlement ID', required: false, type: 'text', defaultValue: '' },
      { key: 'portal', label: 'Portal', required: false, type: 'select', options: ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'FirstCry', 'Blinkit'], defaultValue: 'FirstCry' },
      { key: 'amount', label: 'Gross Amount (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'commission', label: 'Commission (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'tax', label: 'Tax (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'net_amount', label: 'Net Amount (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'settlement_date', label: 'Settlement Date', required: false, type: 'date' },
      { key: 'status', label: 'Status', required: false, type: 'select', options: ['pending', 'processed', 'paid', 'disputed', 'Account Approved', 'Account Rejected', 'Settled'] },
    ],
    sampleData: [
      { settlement_id: 'STL-AMZ-2026-001', portal: 'Amazon', amount: 125000, commission: 18750, tax: 3375, net_amount: 102875, settlement_date: '2026-03-05', status: 'paid' },
      { settlement_id: 'STL-FLK-2026-001', portal: 'Flipkart', amount: 89000, commission: 13350, tax: 2403, net_amount: 73247, settlement_date: '2026-03-07', status: 'processed' },
    ],
  },
  {
    id: 'sku_mapping',
    label: 'SKU Mapping',
    icon: 'Link',
    dbTable: 'sku_mappings',
    fields: [
      { key: 'master_sku_id', label: 'Master SKU', required: true, type: 'text' },
      { key: 'product_name', label: 'Product Name', required: true, type: 'text' },
      { key: 'brand', label: 'Brand', required: false, type: 'text' },
      { key: 'amazon_sku', label: 'Amazon SKU', required: false, type: 'text' },
      { key: 'flipkart_sku', label: 'Flipkart SKU', required: false, type: 'text' },
      { key: 'meesho_sku', label: 'Meesho SKU', required: false, type: 'text' },
      { key: 'firstcry_sku', label: 'FirstCry SKU', required: false, type: 'text' },
      { key: 'blinkit_sku', label: 'Blinkit SKU', required: false, type: 'text' },
      { key: 'own_website_sku', label: 'Own Website SKU', required: false, type: 'text' },
    ],
    sampleData: [
      { master_sku_id: 'MSK-001', product_name: 'Wireless Earbuds Pro', brand: 'SoundMax', amazon_sku: 'AMZ-WEP-001', flipkart_sku: 'FLK-WEP-001', meesho_sku: 'MSH-WEP-001', firstcry_sku: '', blinkit_sku: '', own_website_sku: 'OWN-WEP-001' },
      { master_sku_id: 'MSK-002', product_name: 'Cotton T-Shirt', brand: 'FashionHub', amazon_sku: 'AMZ-CTS-002', flipkart_sku: 'FLK-CTS-002', meesho_sku: 'MSH-CTS-002', firstcry_sku: '', blinkit_sku: '', own_website_sku: '' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expense Tracking',
    icon: 'Receipt',
    dbTable: 'expenses',
    fields: [
      { key: 'description', label: 'Description', required: true, type: 'text' },
      { key: 'category', label: 'Category', required: true, type: 'select', options: ['Office', 'Warehouse', 'Food', 'Stationery', 'Transport', 'Wages', 'Misc'] },
      { key: 'amount', label: 'Amount (₹)', required: true, type: 'number', validate: v => v <= 0 ? 'Amount must be positive' : null },
      { key: 'expense_date', label: 'Date', required: false, type: 'date' },
      { key: 'payment_mode', label: 'Payment Mode', required: false, type: 'select', options: ['Cash', 'UPI', 'Bank Transfer', 'Card'] },
      { key: 'paid_by', label: 'Paid By', required: false, type: 'text' },
    ],
    sampleData: [
      { description: 'Packaging material purchase', category: 'Warehouse', amount: 4500, expense_date: '2026-03-01', payment_mode: 'UPI', paid_by: 'Self' },
      { description: 'Staff lunch', category: 'Food', amount: 1200, expense_date: '2026-03-02', payment_mode: 'Cash', paid_by: 'Manager' },
      { description: 'Courier pickup charges', category: 'Transport', amount: 800, expense_date: '2026-03-03', payment_mode: 'Bank Transfer', paid_by: 'Self' },
    ],
  },
  {
    id: 'inventory',
    label: 'Warehouse Stock',
    icon: 'Warehouse',
    dbTable: 'inventory',
    fields: [
      { key: 'sku_id', label: 'SKU ID', required: true, type: 'text' },
      { key: 'product_name', label: 'Product Name', required: true, type: 'text' },
      { key: 'warehouse', label: 'Warehouse', required: false, type: 'text' },
      { key: 'master_quantity', label: 'Master Qty', required: false, type: 'number' },
      { key: 'available_quantity', label: 'Available Qty', required: false, type: 'number' },
      { key: 'reserved_quantity', label: 'Reserved Qty', required: false, type: 'number' },
      { key: 'low_stock_threshold', label: 'Low Stock Alert', required: false, type: 'number' },
      { key: 'brand', label: 'Brand', required: false, type: 'text' },
    ],
    sampleData: [
      { sku_id: 'SKU-WEP-001', product_name: 'Wireless Earbuds Pro', warehouse: 'Mumbai WH-1', master_quantity: 500, available_quantity: 420, reserved_quantity: 80, low_stock_threshold: 50, brand: 'SoundMax' },
      { sku_id: 'SKU-CTS-002', product_name: 'Cotton T-Shirt Classic', warehouse: 'Delhi WH-2', master_quantity: 1200, available_quantity: 950, reserved_quantity: 250, low_stock_threshold: 100, brand: 'FashionHub' },
    ],
  },
  {
    id: 'vendors',
    label: 'Vendor Management',
    icon: 'Users',
    dbTable: 'vendors',
    fields: [
      { key: 'name', label: 'Vendor Name', required: true, type: 'text' },
      { key: 'email', label: 'Email', required: false, type: 'email', validate: v => v && !emailRegex.test(v) ? 'Invalid email' : null },
      { key: 'phone', label: 'Phone', required: false, type: 'text' },
      { key: 'gst_number', label: 'GSTIN', required: false, type: 'text', validate: v => v && v.length !== 15 ? 'GSTIN must be 15 characters' : null },
      { key: 'address', label: 'Address', required: false, type: 'text' },
      { key: 'subscription_plan', label: 'Plan', required: false, type: 'select', options: ['Basic', 'Pro', 'Enterprise'] },
      { key: 'status', label: 'Status', required: false, type: 'select', options: ['active', 'inactive', 'suspended'] },
    ],
    sampleData: [
      { name: 'TechVendor India', email: 'contact@techvendor.in', phone: '9876543210', gst_number: '27AABCT1234F1ZV', address: 'Mumbai, Maharashtra', subscription_plan: 'Pro', status: 'active' },
      { name: 'FashionWare Ltd', email: 'info@fashionware.com', phone: '9123456780', gst_number: '07AABCF5678G2ZP', address: 'Delhi', subscription_plan: 'Enterprise', status: 'active' },
    ],
  },
  {
    id: 'returns',
    label: 'Returns & Claims',
    icon: 'RotateCcw',
    dbTable: 'returns',
    fields: [
      { key: 'order_number', label: 'Order Number', required: true, type: 'text' },
      { key: 'portal', label: 'Portal', required: false, type: 'select', options: ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'FirstCry', 'Blinkit'], defaultValue: 'FirstCry' },
      { key: 'customer_name', label: 'Customer Name', required: false, type: 'text', defaultValue: 'N/A' },
      { key: 'reason', label: 'Return Reason', required: false, type: 'text' },
      { key: 'refund_amount', label: 'Refund Amount (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'status', label: 'Status', required: false, type: 'select', options: ['requested', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'received', 'refund_initiated', 'closed'], defaultValue: 'requested' },
      { key: 'requested_at', label: 'Return Date', required: false, type: 'date' },
      { key: 'claim_status', label: 'Claim Status', required: false, type: 'select', options: ['pending', 'eligible', 'claimed', 'rejected'], defaultValue: 'pending' },
    ],
    sampleData: [
      { order_number: 'ORD-2026-001', portal: 'FirstCry', customer_name: 'Rahul Sharma', reason: 'Defective', refund_amount: 2999, status: 'received', requested_at: '2026-03-05', claim_status: 'eligible' },
      { order_number: 'ORD-2026-002', portal: 'FirstCry', customer_name: 'Priya Patel', reason: 'Not as described', refund_amount: 1599, status: 'refund_initiated', requested_at: '2026-03-06', claim_status: 'claimed' },
    ],
  },
  {
    id: 'gst_finance',
    label: 'GST / Finance',
    icon: 'IndianRupee',
    dbTable: 'gst_records',
    fields: [
      { key: 'gstin', label: 'GSTIN', required: false, type: 'text', validate: v => v && v.length !== 15 ? 'GSTIN must be 15 characters' : null },
      { key: 'invoice_number', label: 'Invoice Number', required: true, type: 'text' },
      { key: 'invoice_date', label: 'Invoice Date', required: false, type: 'date' },
      { key: 'party_name', label: 'Party Name', required: false, type: 'text' },
      { key: 'portal', label: 'Portal', required: false, type: 'select', options: ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'FirstCry', 'Blinkit'], defaultValue: 'FirstCry' },
      { key: 'taxable_value', label: 'Taxable Value (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'cgst', label: 'CGST (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'sgst', label: 'SGST (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'igst', label: 'IGST (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'total_tax', label: 'Total Tax (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'total_amount', label: 'Total Amount (₹)', required: false, type: 'number', defaultValue: 0 },
      { key: 'hsn_code', label: 'HSN Code', required: false, type: 'text' },
      { key: 'gst_percent', label: 'GST %', required: false, type: 'number', validate: v => v && (v < 0 || v > 28) ? 'GST must be 0-28%' : null },
      { key: 'filing_period', label: 'Filing Period', required: false, type: 'text' },
      { key: 'status', label: 'Status', required: false, type: 'select', options: ['pending', 'filed', 'reconciled', 'mismatch', 'Review', 'Account Approved', 'Account Rejected'] },
    ],
    sampleData: [
      { gstin: '27AABCT1234F1ZV', invoice_number: 'INV-FC-2026-001', invoice_date: '2026-03-01', party_name: 'FirstCry Newborn Care', portal: 'FirstCry', taxable_value: 50000, cgst: 4500, sgst: 4500, igst: 0, total_tax: 9000, total_amount: 59000, hsn_code: '95030090', gst_percent: 18, filing_period: 'Mar-2026', status: 'reconciled' },
      { gstin: '07AABCF5678G2ZP', invoice_number: 'INV-FC-2026-002', invoice_date: '2026-03-05', party_name: 'FirstCry Delhi Hub', portal: 'FirstCry', taxable_value: 30000, cgst: 0, sgst: 0, igst: 5400, total_tax: 5400, total_amount: 35400, hsn_code: '61091000', gst_percent: 18, filing_period: 'Mar-2026', status: 'pending' },
    ],
  },
];

export function getModuleById(id: string): ImportModule | undefined {
  return IMPORT_MODULES.find(m => m.id === id);
}
export interface ValidationResult {
  rowIndex: number;
  row: Record<string, any>;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export function validateRows(rows: Record<string, any>[], moduleId: string): {
  validRows: Record<string, any>[];
  errorRows: ValidationResult[];
  summary: { total: number; valid: number; errors: number; warnings: number };
} {
  const mod = getModuleById(moduleId);
  if (!mod) return { validRows: rows, errorRows: [], summary: { total: rows.length, valid: rows.length, errors: 0, warnings: 0 } };

  const validRows: Record<string, any>[] = [];
  const errorRows: ValidationResult[] = [];
  let warningCount = 0;

  rows.forEach((row, idx) => {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    mod.fields.forEach(field => {
      let val = row[field.key];
      const isEmpty = val === undefined || val === null || val === '';

      // Apply intelligent defaults for missing fields
      if (isEmpty && moduleId === 'orders' && field.key === 'order_number') {
        const autoOrderNumber = `AUTO-FC-${Date.now()}-${idx + 1}`;
        row[field.key] = autoOrderNumber;
        val = autoOrderNumber;
        return; // skip required check — generated order number applied
      }

      if (isEmpty && field.defaultValue !== undefined) {
        row[field.key] = field.defaultValue;
        val = field.defaultValue;
        return; // skip required check — default applied
      }

      if (field.required && isEmpty) {
        errors.push({ field: field.key, message: `${field.label} is required` });
      }

      if (!isEmpty && field.type === 'number') {
        // Try to clean non-numeric chars (commas, currency symbols, spaces)
        const cleaned = String(val).replace(/[₹$,\s]/g, '').trim();
        if (cleaned === '' || isNaN(Number(cleaned))) {
          row[field.key] = field.defaultValue !== undefined ? field.defaultValue : 0;
        } else {
          row[field.key] = Number(cleaned);
        }
      }

      if (!isEmpty && field.validate) {
        const err = field.validate(field.type === 'number' ? Number(val) : val);
        if (err) errors.push({ field: field.key, message: err });
      }

      if (!isEmpty && field.options && !field.options.some(o => o.toLowerCase() === String(val).toLowerCase())) {
        warnings.push({ field: field.key, message: `"${val}" not in expected values: ${field.options.join(', ')}` });
      }
    });

    if (errors.length > 0) {
      errorRows.push({ rowIndex: idx + 1, row, errors, warnings });
    } else {
      validRows.push(row);
      if (warnings.length > 0) {
        warningCount += warnings.length;
        errorRows.push({ rowIndex: idx + 1, row, errors: [], warnings });
      }
    }
  });

  return {
    validRows,
    errorRows,
    summary: {
      total: rows.length,
      valid: validRows.length,
      errors: errorRows.filter(r => r.errors.length > 0).length,
      warnings: warningCount,
    },
  };
}
