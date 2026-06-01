import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@local.test';
const ADMIN_PASSWORD = 'Admin123!';

const routes = [
  '/channels', '/brands', '/products-catalog', '/product-health',
  '/inventory', '/orders', '/consolidated-orders', '/returns', '/invoices',
  '/settlements', '/sku-mapping', '/reconciliation', '/stock-reconciliation',
  '/affiliated', '/data-import', '/social-insights', '/subscription',
  '/support', '/alerts', '/vendors', '/warehouses', '/tasks', '/analytics',
  '/ecommerce', '/chatbot', '/permissions', '/reports', '/price-payout',
  '/system-settings', '/finance', '/api-settings', '/video-management',
  '/legal-compliance', '/leads', '/whatsapp', '/onboarding', '/customers',
  '/insights', '/marketing-config', '/expenses', '/staff', '/technical-docs',
  '/broadcast', '/integrations', '/purchase', '/review-analytics',
  '/data-intelligence', '/email-marketing', '/google-meet', '/storage',
  '/ai-learning'
];

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const results = {};

  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await new Promise(r => setTimeout(r, 1000));
  await page.type('input[type="email"]', ADMIN_EMAIL);
  await page.type('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));

  for (const route of routes) {
    console.log(`Checking ${route}...`);
    const errors = [];
    
    const handlePageError = (err) => errors.push(`Page Error: ${err.message}`);
    const handleConsole = (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if(!text.includes('favicon.ico') && !text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')) {
            errors.push(`Console Error: ${text}`);
        }
      }
    };
    
    page.on('pageerror', handlePageError);
    page.on('console', handleConsole);
    
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000)); // Give React time to render/crash
      
      const content = await page.content();
      if (content.includes('Application error: a client-side exception has occurred') || 
          content.includes('Something went wrong')) {
        errors.push('React Error Boundary triggered');
      }
    } catch (e) {
      errors.push(`Navigation Error: ${e.message}`);
    }
    
    page.off('pageerror', handlePageError);
    page.off('console', handleConsole);
    
    results[route] = {
      status: errors.length === 0 ? 'Success' : 'Error',
      errors: errors.filter((v, i, a) => a.indexOf(v) === i) // Unique errors
    };
  }

  await browser.close();

  fs.writeFileSync('e2e_results.json', JSON.stringify(results, null, 2));
  console.log('Results written to e2e_results.json');
}

run().catch(console.error);
