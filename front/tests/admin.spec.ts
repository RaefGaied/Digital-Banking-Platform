import { test, expect } from '@playwright/test';

test.describe('Admin routes smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = {};
      if (path.endsWith('/admin/dashboard')) {
        body = {
          activeSessions: 0,
          pendingTasks: 0,
          activeUsers: 0,
          ticketStatistics: { totalTickets: 0, openTickets: 0, resolvedTickets: 0 },
          recentTasks: [],
          recentActivity: [],
        };
      } else if (path.includes('/notifications/unread-count')) {
        body = { data: { count: 0 } };
      } else if (path.includes('/notifications')) {
        body = { data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 6 } };
      } else if (path.includes('/admin/flowable/tasks')) {
        body = [];
      } else if (path.includes('/admin/rag-documents')) {
        body = [];
      } else if (path.includes('/admin')) {
        body = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('userId', '00000000-0000-0000-0000-000000000000');
      localStorage.setItem('userName', 'Admin User');
      localStorage.setItem('userRole', 'ADMIN');
    });
  });

  test('loads admin dashboard and tabs', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText('Administration', { exact: true })).toBeVisible();
    await expect(page.getByText(/Operational overview for tasks/i)).toBeVisible();
  });

  test('navigates to tasks/users/audit pages', async ({ page }) => {
    await page.goto('/admin/tasks');
    await expect(page.getByRole('heading', { name: /Admin inbox/i })).toBeVisible();

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /User management/i })).toBeVisible();

    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { name: /Audit log/i })).toBeVisible();
  });
});
