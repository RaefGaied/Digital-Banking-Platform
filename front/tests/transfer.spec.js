import { test, expect } from '@playwright/test';
test('serve login page', async ({ page }) => {
    const resp = await page.goto('http://localhost:5173/login');
    expect(resp && resp.status()).toBeLessThan(400);
});
