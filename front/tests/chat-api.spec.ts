import { test, expect, type APIRequestContext } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL;
const email = process.env.E2E_USER_EMAIL || 'demo@finbank.local';
const password = process.env.E2E_USER_PASSWORD || 'User@1234!';

test.describe('Chat backend scenarios', () => {
  test.skip(!apiUrl, 'Set E2E_API_URL to run against the deployed backend.');

  async function login(request: APIRequestContext) {
    const response = await request.post(`${apiUrl}/auth/login`, {
      data: { email, password },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.accessToken).toBeTruthy();
    return body.accessToken as string;
  }

  test('authenticates and detects a French transfer request', async ({ request }) => {
    const token = await login(request);
    const intent = await request.post(`${apiUrl}/ai/intent`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: 'Vire 250 vers le compte 204060-8' },
    });
    expect(intent.ok()).toBeTruthy();
    const body = await intent.json();
    expect(body.intent).toBe('TRANSFER');
    expect(body.parameters.amount).toBe(250);
    expect(body.parameters.targetAccountNumber).toBe('204060-8');
  });

  test('detects card creation without executing a card operation', async ({ request }) => {
    const token = await login(request);
    const intent = await request.post(`${apiUrl}/ai/intent`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: 'Je veux créer une carte de crédit' },
    });
    expect(intent.ok()).toBeTruthy();
    const body = await intent.json();
    expect(body.intent).toBe('CARD_CREATION');
  });
});
