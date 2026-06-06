import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8081';
const ADMIN_EMAIL = 'admin@local.test';
const ADMIN_PASSWORD = 'Admin123!';

const pages = [
  { route: '/',          name: 'Dashboard', dataChecks: ['revenue', 'order', 'inventory'] },
  { route: '/orders',    name: 'Orders',    dataChecks: ['order_number', 'flipkart', 'amazon'] },
  { route: '/inventory', name: 'Inventory', dataChecks: ['sku', 'quantity', 'firstcry'] },
  { route: '/returns',   name: 'Returns',   dataChecks: ['return', 'reason', 'status'] },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Collect all console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico') && !text.includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(`[CONSOLE] ${text.slice(0, 200)}`);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[PAGE_ERROR] ${err.message.slice(0, 200)}`);
  });

  // Login
  console.log('Navigating to login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check if we're already logged in
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    console.log('Already logged in, navigating directly...');
  } else {
    console.log('Logging in...');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  const results = {};

  for (const { route, name, dataChecks } of pages) {
    console.log(`\n=== ${name} (${route}) ===`);
    const pageErrors = [];

    consoleErrors.length = 0; // Clear errors for this page

    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(3000); // Wait for React rendering + data fetch

      // Take a screenshot for visual check
      await page.screenshot({ path: `e2e_${name.toLowerCase()}.png`, fullPage: false });

      const bodyText = await page.textContent('body') || '';
      const bodyLower = bodyText.toLowerCase();

      console.log(`  Page loaded, body length: ${bodyText.length} chars`);

      // Check for React error boundary
      if (bodyText.includes('Application error') || bodyText.includes('Something went wrong')) {
        pageErrors.push('React Error Boundary triggered');
      }

      // Check for data-specific keywords
      for (const check of dataChecks) {
        const found = bodyLower.includes(check.toLowerCase());
        console.log(`  Check "${check}": ${found ? '✓ found' : '✗ missing'}`);
        if (!found) pageErrors.push(`Missing: "${check}"`);
      }

      // Check for empty state indicators
      if (bodyLower.includes('no data') || bodyLower.includes('no orders') || bodyLower.includes('0 results')) {
        console.log('  ⚠ Empty state detected: no data / no orders / 0 results');
        pageErrors.push('Empty state detected');
      }

      // Count table rows as proxy for data
      const rows = await page.$$('table tbody tr, [role="row"]');
      console.log(`  Table rows found: ${rows.length}`);

    } catch (e) {
      pageErrors.push(`Navigation/check error: ${e.message}`);
    }

    // Report console errors for this page
    if (consoleErrors.length > 0) {
      console.log(`  Console errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 3).forEach(e => console.log(`    ${e}`));
    }

    results[name] = {
      status: pageErrors.length === 0 ? 'PASS' : 'ISSUES',
      errors: pageErrors,
      consoleErrors: [...consoleErrors],
    };
  }

  await browser.close();

  console.log('\n\n=== FINAL RESULTS ===');
  let passed = 0, failed = 0;
  for (const [name, result] of Object.entries(results)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${result.status}`);
    if (result.errors.length > 0) {
      result.errors.forEach(e => console.log(`       - ${e}`));
    }
    if (result.status === 'PASS') passed++; else failed++;
  }
  console.log(`\n${passed} passed, ${failed} failed`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
