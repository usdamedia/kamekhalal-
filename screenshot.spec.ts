import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  page.on('console', msg => console.log(msg.text()));
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot.png' });
});
