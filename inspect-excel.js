import XLSX from 'xlsx';
import fs from 'fs';

// Inspect specific files more carefully
const filesToInspect = [
  'c:\\Users\\kisho\\Downloads\\Firstcry\\dashboardsale_2025_08_26_to_2026_02_22.xlsx',
  'c:\\Users\\kisho\\Downloads\\Firstcry\\VendorReconciliation1771758356.xlsx',
  'c:\\Users\\kisho\\Downloads\\Firstcry\\ExplortPaymentAdviceData_1771757808.xlsx',
  'c:\\Users\\kisho\\Downloads\\Firstcry\\POST25083962.xlsx',
];

filesToInspect.forEach(file => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`File: ${file.split('\\').pop()}`);
  console.log('='.repeat(80));
  
  try {
    const workbook = XLSX.readFile(file);
    console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
    
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      console.log(`\nSheet: ${sheetName}`);
      console.log(`Dimensions: ${sheet['!ref']}`);
      
      // Read raw data including empty cells
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      console.log(`Total rows: ${data.length}`);
      console.log(`First 3 rows:`);
      data.slice(0, 3).forEach((row, i) => {
        console.log(`  Row ${i}: [${row.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`);
      });
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
});
