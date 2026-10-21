import type { APIResponse } from '@playwright/test';
import type { Http } from '../http/http.ts';

export class HealthClient {
  constructor(private readonly http: Http) {}

  ping(): Promise<APIResponse> {
    return this.http.send('GET', '/ping');
  }
}
