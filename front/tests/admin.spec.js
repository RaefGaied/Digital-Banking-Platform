import { test, expect } from '@playwright/test';
test.describe('Admin routes smoke', () => {
    test.beforeEach(async ({ page }) => {
        // Seed localStorage as admin
        await page.addInitScript(() => {
            localStorage.setItem('token', 'fake-token');
            localStorage.setItem('userId', '00000000-0000-0000-0000-000000000000');
            localStorage.setItem('userName', 'Admin User');
            localStorage.setItem('userRole', 'ADMIN');
        });
    });
    test('loads admin dashboard and tabs', async ({ page }) => {
        await page.goto('/admin/dashboard');
        await expect(page.getByRole('heading', { name: /Administration/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Résumé administrateur/i })).toBeVisible();
    });
    test('navigates to tasks/users/audit pages', async ({ page }) => {
        await page.goto('/admin/tasks');
        await expect(page.getByRole('heading', { name: /Inbox administrateur/i })).toBeVisible();
        await page.goto('/admin/users');
        await expect(page.getByRole('heading', { name: /Gestion utilisateurs/i })).toBeVisible();
        await page.goto('/admin/audit');
        await expect(page.getByRole('heading', { name: /Journal d'audit/i })).toBeVisible();
    });
});
