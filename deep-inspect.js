import XLSX from 'xlsx';
import fs from 'fs';

// Deep inspect problematic files
const files = [
  'c:\\Users\\kisho\\Downloads\\Firstcry\\POST25083962.xlsx',
  'c:\\Users\\kisho\\Downloads\\Firstcry\\PRE25062240.xlsx',
  'c:\\Users\\kisho\\Downloads\\Firstcry\\ExplortPaymentAdviceData_1771757808.xlsx',
  'c:\\Users\\kisho\\Downloads\\Firstcry\\VendorInvoiceDataVendorInvoice_1771758002.xlsx',
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`File: ${file.split('\\').pop()}`);
  console.log('='.repeat(80));
  
  try {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Total rows: ${data.length}`);
    console.log(`First 10 rows (raw):`);
    data.slice(0, 10).forEach((row, i) => {
      const rowStr = row.slice(0, 10).map(v => {
        if (v === undefined || v === '') return '∅';
        if (typeof v === 'string') return v.substring(0, 30).replace(/\n/g, '↵');
        return v;
      }).join(' | ');
      console.log(`[${i}] ${rowStr}`);
    });
    
    // Try to find actual data table
    console.log(`\nLooking for data patterns...`);
    let tableStart = -1;
    for (let i = 0; i < Math.min(data.length, 50); i++) {
      const row = data[i] || [];
      const nonEmpty = row.filter(v => v !== undefined && v !== '').length;
      if (nonEmpty >= 5) {
        tableStart = i;
        console.log(`Potential table at row ${i}: ${nonEmpty} non-empty cells`);
        if (tableStart >= 0 && i <= tableStart + 5) {
          const cols = row.slice(0, 20).map((v, idx) => `${idx}: ${v || '∅'}`).join(', ');
          console.log(`  Columns: ${cols}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
});
