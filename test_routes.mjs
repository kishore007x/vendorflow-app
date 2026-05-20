import puppeteer from 'puppeteer';
import fs from 'fs';

const routes = [
  '/login', '/channels', '/brands', '/products-catalog', '/product-health',
  '/inventory', '/orders', '/consolidated-orders', '/returns', '/invoices',
  '/settlements', '/sku-mapping', '/reconciliation', '/affiliated', '/data-import',
  '/social-insights', '/subscription', '/support', '/alerts', '/vendors',
  '/warehouses', '/tasks', '/analytics', '/ecommerce', '/chatbot', '/permissions',
  '/reports', '/price-payout', '/system-settings', '/finance', '/api-settings',
  '/video-management', '/legal-compliance', '/leads', '/whatsapp', '/onboarding',
  '/customers', '/insights', '/marketing-config', '/expenses', '/staff',
  '/technical-docs', '/broadcast', '/integrations', '/purchase', '/review-analytics',
  '/data-intelligence', '/email-marketing', '/google-meet', '/storage', '/ai-learning'
];

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const failedRoutes = [];

  for (const route of routes) {
    console.log(`Testing ${route}...`);
    
    let caughtError = false;
    let pageErrors = [];

    // Capture console errors
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore 404s for favicon or mock images
        if (!text.includes('404 (Not Found)') && !text.includes('favicon.ico')) {
          pageErrors.push(text);
        }
      }
    };
    
    page.on('console', onConsole);
    page.on('pageerror', (err) => {
      pageErrors.push(err.toString());
    });

    try {
      await page.goto(`http://localhost:8080${route}`, { waitUntil: 'networkidle2', timeout: 10000 });
      await new Promise(r => setTimeout(r, 1500)); // wait for renders and overlay
      
      const rootHtml = await page.$eval('#root', el => el.innerHTML).catch(() => '');
      const bodyHtml = await page.$eval('body', el => el.innerHTML).catch(() => '');

      // Check for vite error overlay tag
      const hasViteOverlay = await page.$('vite-error-overlay').then(res => !!res);

      if (!rootHtml || rootHtml.trim() === '' || hasViteOverlay || bodyHtml.includes('vite-error-overlay') || pageErrors.length > 0) {
        caughtError = true;
      }
    } catch (e) {
      caughtError = true;
      pageErrors.push(e.message);
    }
    
    page.off('console', onConsole);

    if (caughtError) {
      console.error(`❌ FAILED: ${route}`);
      failedRoutes.push({ route, errors: pageErrors });
    } else {
      console.log(`✅ Passed: ${route}`);
    }
  }

  await browser.close();
  
  fs.writeFileSync('failed_routes.json', JSON.stringify(failedRoutes, null, 2));
  console.log(`\nTesting complete. ${failedRoutes.length} routes failed.`);
}

run().catch(console.error);
