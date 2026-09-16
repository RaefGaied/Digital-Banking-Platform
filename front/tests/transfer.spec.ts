import { test, expect } from '@playwright/test';

test('app frontend serves without errors', async ({ page }) => {
  // Just test that the frontend build works and serves
  const resp = await page.goto('http://127.0.0.1:4173/');
  expect(resp && resp.status()).toBeLessThan(400);
  
  // Verify page content loads (title element exists)
  const title = page.locator('title');
  const titleText = await title.textContent();
  expect(titleText).toBeTruthy();
});

test('login page renders successfully', async ({ page }) => {
  const resp = await page.goto('http://127.0.0.1:4173/login');
  expect(resp && resp.status()).toBeLessThan(400);
  
  // Verify page has content
  const body = page.locator('body');
  const content = await body.innerHTML();
  expect(content).toBeTruthy();
  expect(content.length).toBeGreaterThan(100);
});
