import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:8080';

const ROUTES = [
  '/login', '/insights', '/channels', '/brands', '/products-catalog',
  '/product-health', '/inventory', '/orders', '/consolidated-orders',
  '/returns', '/invoices', '/settlements', '/sku-mapping',
  '/reconciliation', '/affiliated', '/data-import', '/social-insights',
  '/subscription', '/support', '/alerts', '/vendors', '/warehouses',
  '/tasks', '/analytics', '/ecommerce', '/chatbot', '/permissions',
  '/reports', '/price-payout', '/system-settings', '/finance',
  '/api-settings', '/video-management', '/legal-compliance', '/leads',
  '/whatsapp', '/onboarding', '/customers', '/marketing-config',
  '/expenses', '/staff', '/technical-docs', '/broadcast',
  '/integrations', '/purchase', '/review-analytics', '/data-intelligence',
  '/email-marketing', '/google-meet', '/storage',
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Intercept console errors
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const results = [];

  // First, log in
  console.log('=== Logging in... ===');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tmp_login_page.png' });
  console.log('  Page URL:', page.url());

  const chooseRole = async () => {
    const roleButtons = ['Administrator', 'Vendor', 'Operations'];
    for (const roleName of roleButtons) {
      const button = page.getByRole('button', { name: roleName }).first();
      if (await button.count()) {
        await button.click();
        return roleName;
      }
    }
    return null;
  };

  const selectedRole = await chooseRole();
  if (selectedRole) {
    console.log(`  Selected role: ${selectedRole}`);
  } else {
    console.log('  No role selector found');
  }

  // Try multiple selectors for email/password fields
  let loggedIn = false;
  const strategies = [
    { email: 'input[type="email"]', pass: 'input[type="password"]', btn: 'button[type="submit"]' },
    { email: 'input[name="email"]', pass: 'input[name="password"]', btn: 'button, [role="button"]' },
    { email: '[data-testid="email"]', pass: '[data-testid="password"]', btn: '[data-testid="submit"]' },
  ];

  for (const s of strategies) {
    const emailEl = await page.$(s.email);
    if (!emailEl) continue;
    console.log('  Found email field with:', s.email);
    await emailEl.fill('admin@local.test');
    const passEl = await page.$(s.pass);
    if (!passEl) { console.log('  No password field found'); continue; }
    await passEl.fill('Admin123!');
    await page.waitForTimeout(500);
    const btnEl = await page.$(s.btn);
    if (!btnEl) { console.log('  No submit button found'); continue; }
    await btnEl.click();
    await page.waitForTimeout(5000);
    console.log('  After login URL:', page.url());
    if (!page.url().includes('/login')) { loggedIn = true; break; }
  }

  console.log(`  Logged in: ${loggedIn}`);

  if (!loggedIn) {
    // Try alternative: maybe it uses Supabase Auth UI
    const bodyHTML = await page.content();
    if (bodyHTML.includes('supabase') || bodyHTML.includes('auth')) {
      console.log('  Supabase Auth UI detected - trying to click sign in...');
      // Look for any auth-related input/button
      const allInputs = await page.$$('input');
      if (allInputs.length >= 2) {
        await allInputs[0].fill('admin@local.test');
        await allInputs[1].fill('Admin123!');
        await page.waitForTimeout(500);
        const btns = await page.$$('button');
        for (const btn of btns) {
          const text = await btn.textContent();
          if (text?.toLowerCase().includes('sign') || text?.toLowerCase().includes('login')) {
            await btn.click();
            break;
          }
        }
        await page.waitForTimeout(5000);
        loggedIn = !page.url().includes('/login');
        console.log(`  Retry logged in: ${loggedIn}`);
      }
    }
  }

  // Navigate to each route
  for (const route of ROUTES) {
    if (route === '/login' && loggedIn) continue; // skip login if already logged in
    console.log(`\n--- ${route} ---`);
    try {
      await page.goto(BASE + route, { timeout: 20000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000); // wait for React + data fetch

      const bodyText = await page.textContent('body').catch(() => '');
      const bodyLen = bodyText.length;
      const hasData = bodyLen > 500; // meaningful content
      const hasError = bodyText.toLowerCase().includes('error') || bodyText.toLowerCase().includes('failed to load') || bodyText.toLowerCase().includes('something went wrong');
      const isEmpty = bodyText.includes('No data') || bodyText.includes('No records') || bodyText.includes('No ') || bodyText.includes('empty');
      const url = page.url();

      // Take screenshot if it's a key page or has issues
      if (!hasData || route === '/insights' || route === '/orders' || route === '/finance') {
        await page.screenshot({ path: `tmp_${route.replace(/\//g, '_')}.png` });
      }

      results.push({
        route, bodyLen, hasData, hasError, isEmpty, url, consoleErrors: [...consoleErrors],
      });
      console.log(`  URL: ${url} | Body: ${bodyLen}c | Data: ${hasData} | Error: ${hasError} | Empty: ${isEmpty}`);
    } catch (err) {
      console.log(`  ERROR: ${err.message.slice(0, 120)}`);
      results.push({ route, error: err.message.slice(0, 200), bodyLen: 0, hasData: false });
    }
  }

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  const good = results.filter(r => r.hasData && !r.hasError);
  const empty = results.filter(r => !r.hasData && !r.error);
  const errors = results.filter(r => r.hasError || r.error);
  console.log(`Total: ${results.length}, Data visible: ${good.length}, Empty/minimal: ${empty.length}, Errors: ${errors.length}`);

  console.log('\n--- Pages with DATA ---');
  for (const r of good) console.log(`  ✅ ${r.route} (${r.bodyLen}c)`);

  if (empty.length) {
    console.log('\n--- Pages EMPTY/LOW CONTENT ---');
    for (const r of empty) console.log(`  ⚠️  ${r.route} (${r.bodyLen}c)`);
  }

  if (errors.length) {
    console.log('\n--- Pages with ERRORS ---');
    for (const r of errors) console.log(`  ❌ ${r.route}: ${(r.error || '').slice(0, 120)}`);
  }

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
