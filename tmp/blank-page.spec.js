import { test } from '@playwright/test';

test('log blank page diagnostics', async ({ page }) => {
  page.on('console', msg => console.log(`console:${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`pageerror: ${err.message}`));
  page.on('requestfailed', req => console.log(`requestfailed: ${req.url()} ${req.failure()?.errorText || ''}`));

  const responses = [];
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('firebase') || url.includes('googleapis') || url.includes('identitytoolkit') || url.includes('securetoken')) {
      responses.push(`${res.status()} ${url}`);
    }
  });

  await page.goto('http://127.0.0.1:4174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const html = await page.locator('#root').innerHTML();
  console.log(`root-html: ${html.slice(0, 1000)}`);
  for (const line of responses) console.log(`response: ${line}`);
});
