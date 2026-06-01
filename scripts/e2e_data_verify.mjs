import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@local.test';
const ADMIN_PASSWORD = 'Admin123!';

// The pages where we expect significant data to load based on the DB count
const routes = [
  '/orders',
  '/products-catalog',
  '/inventory',
  '/returns',
  '/invoices',
  '/customers'
];

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const results = {};

  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await new Promise(r => setTimeout(r, 1000));
  
  // Select Administrator role
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const adminBtn = buttons.find(b => b.innerText.includes('Administrator'));
    if (adminBtn) adminBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.type('input[type="email"]', ADMIN_EMAIL);
  await page.type('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));

  for (const route of routes) {
    console.log(`Checking data on ${route}...`);
    
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2', timeout: 20000 });
      // wait a little longer for supabase data to render
      await new Promise(r => setTimeout(r, 5000));
      
      // Evaluate in browser context to count items
      const dataCount = await page.evaluate(() => {
        // Shadcn UI tables use <tr> in <tbody>
        const tableRows = document.querySelectorAll('tbody tr').length;
        // Or sometimes it's grid items/cards
        const cards = document.querySelectorAll('.grid > div').length;
        // Text like "No results."
        const noResults = document.body.innerText.includes('No results.') || document.body.innerText.includes('No orders found');
        
        return {
          tableRows,
          cards,
          noResults
        };
      });

      results[route] = dataCount;
      console.log(`Results for ${route}:`, dataCount);
      
    } catch (e) {
      console.error(`Error on ${route}:`, e.message);
      results[route] = { error: e.message };
    }
  }

  await browser.close();

  fs.writeFileSync('e2e_data_results.json', JSON.stringify(results, null, 2));
  console.log('Results written to e2e_data_results.json');
}

run().catch(console.error);
