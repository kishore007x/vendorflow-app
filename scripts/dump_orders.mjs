import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@local.test';
const ADMIN_PASSWORD = 'Admin123!';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await new Promise(r => setTimeout(r, 1000));
  await page.type('input[type="email"]', ADMIN_EMAIL);
  await page.type('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));

  console.log('Checking /orders...');
  await page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 8000)); // wait longer

  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('orders_page.html', html);
  console.log('Saved to orders_page.html');

  await browser.close();
}

run().catch(console.error);
