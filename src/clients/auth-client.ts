import type { APIResponse } from '@playwright/test';
import { config } from '../config/api-config.ts';
import type { Http } from '../http/http.ts';

export class AuthClient {
  constructor(private readonly http: Http) {}

  auth(username: string, password: string): Promise<APIResponse> {
    return this.http.send('POST', '/auth', { json: { username, password } });
  }

  /** Токен для демо-аккаунта из config. */
  async token(): Promise<string> {
    const response = await this.auth(config.username, config.password);
    const body: unknown = response.ok() ? await response.json() : undefined;
    const token = (body as { token?: unknown } | undefined)?.token;
    if (typeof token !== 'string' || token === '') {
      throw new Error(`POST /auth did not return a token: ${response.status()} ${await response.text()}`);
    }
    return token;
  }
}
