import { test, expect } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL;
const email = process.env.E2E_USER_EMAIL || 'demo@finbank.local';
const password = process.env.E2E_USER_PASSWORD || 'User@1234!';

test.describe('Chat backend scenarios', () => {
  test.skip(!apiUrl, 'Set E2E_API_URL to run against the deployed backend.');

  test('authenticates and detects a French transfer request', async ({ request }) => {
    const login = await request.post(`${apiUrl}/auth/login`, {
      data: { email, password },
    });
    expect(login.ok()).toBeTruthy();

    const loginBody = await login.json();
    expect(loginBody.accessToken).toBeTruthy();

    const intent = await request.post(`${apiUrl}/ai/intent`, {
      headers: { Authorization: `Bearer ${loginBody.accessToken}` },
      data: { message: 'Vire 250 vers le compte 204060-8' },
    });
    expect(intent.ok()).toBeTruthy();
    await expect(intent).toHaveJSON({
      intent: 'TRANSFER',
      parameters: {
        amount: 250,
        targetAccountNumber: '204060-8',
      },
    });
  });

  test('detects card creation without executing a card operation', async ({ request }) => {
    const login = await request.post(`${apiUrl}/auth/login`, {
      data: { email, password },
    });
    expect(login.ok()).toBeTruthy();

    const loginBody = await login.json();
    const intent = await request.post(`${apiUrl}/ai/intent`, {
      headers: { Authorization: `Bearer ${loginBody.accessToken}` },
      data: { message: 'Je veux créer une carte de crédit' },
    });
    expect(intent.ok()).toBeTruthy();
    await expect(intent).toHaveJSON({
      intent: 'CARD_CREATION',
    });
  });
});
