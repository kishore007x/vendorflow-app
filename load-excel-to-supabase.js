import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// File patterns and their corresponding tables
const fileConfigs = [
  {
    pattern: 'VendorReconciliation*.xlsx',
    table: 'vendor_reconciliation',
    skipFirstRow: false
  },
  {
    pattern: 'ExplortPaymentAdviceData_*.xlsx',
    table: 'payment_advice',
    skipFirstRow: false
  },
  {
    pattern: 'dashboardsale_*.xlsx',
    table: 'dashboard_sales',
    skipFirstRow: false
  },
  {
    pattern: 'VendorInvoiceData*.xlsx',
    table: 'vendor_invoices',
    skipFirstRow: false
  },
  {
    pattern: 'POST*.xlsx',
    table: 'post_orders',
    skipFirstRow: false
  },
  {
    pattern: 'PRE*.xlsx',
    table: 'pre_orders',
    skipFirstRow: false
  },
  {
    pattern: 'SaleReturnData_*.xlsx',
    table: 'sale_returns',
    skipFirstRow: false
  },
  {
    pattern: 'ProductwiseBoxDetails_*.xlsx',
    table: 'product_box_details',
    skipFirstRow: false
  }
];

const downloadDir = 'c:\\Users\\kisho\\Downloads\\Firstcry\\';

// Get all files in the directory
const allFiles = fs.readdirSync(downloadDir).filter(f => f.endsWith('.xlsx'));

console.log(`Found ${allFiles.length} Excel files\n`);

// Group files by pattern
const filesByTable = {};

allFiles.forEach(file => {
  const fullPath = path.join(downloadDir, file);
  
  // Find matching config
  const config = fileConfigs.find(c => {
    const regex = new RegExp('^' + c.pattern.replace('*', '.*') + '$');
    return regex.test(file);
  });
  
  if (!config) {
    console.log(`⚠️  No config for: ${file}`);
    return;
  }
  
  if (!filesByTable[config.table]) {
    filesByTable[config.table] = [];
  }
  
  try {
    const workbook = XLSX.readFile(fullPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`✓ ${file}`);
    console.log(`  Table: ${config.table}`);
    console.log(`  Rows: ${data.length}`);
    console.log(`  Columns: ${Object.keys(data[0] || {}).join(', ')}\n`);
    
    filesByTable[config.table].push({
      file,
      data,
      columns: Object.keys(data[0] || {})
    });
  } catch (err) {
    console.error(`✗ Error reading ${file}:`, err.message);
  }
});

// Generate insights
console.log('\n=== SUMMARY ===');
Object.entries(filesByTable).forEach(([table, files]) => {
  const totalRows = files.reduce((sum, f) => sum + f.data.length, 0);
  console.log(`${table}: ${files.length} files, ${totalRows} total rows`);
});

// Export for SQL generation
fs.writeFileSync(
  'c:\\Kishore Projects\\vendorflow-hub-main\\excel-data.json',
  JSON.stringify(filesByTable, null, 2)
);

console.log('\nData saved to excel-data.json');
