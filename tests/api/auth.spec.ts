import { config } from '../../src/config/api-config.ts';
import { expect, test } from '../../src/fixtures.ts';
import type { AuthResponse } from '../../src/models/booking.ts';
import { expectOkJson } from '../../src/support/expect-response.ts';

test.describe('Auth (POST /auth)', () => {
  test('AU-1: POST /auth с верными кредами возвращает токен', async ({ authClient }) => {
    const body = await expectOkJson<AuthResponse>(await authClient.auth(config.username, config.password));

    expect(typeof body.token).toBe('string');
    expect(body.token?.trim()).not.toBe('');
    expect(body).not.toHaveProperty('reason');
  });

  // Особенность API: неверные креды → 200 + reason, а не 401
  test('AU-2: POST /auth с неверным паролем → Bad credentials', async ({ authClient }) => {
    const body = await expectOkJson<AuthResponse>(await authClient.auth(config.username, 'wrong-password'));

    expect(body.reason).toBe('Bad credentials');
    expect(body).not.toHaveProperty('token');
  });
});
