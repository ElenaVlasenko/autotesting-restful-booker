import type { APIResponse } from '@playwright/test';
import type { Http } from '../http/http.ts';
import type { Auth, Booking } from '../models/booking.ts';

/** HTTP-обёртки над /booking. Только запросы, без проверок. */
export class BookingClient {
  constructor(private readonly http: Http) {}

  /** Partial — чтобы можно было отправить бронь без обязательного поля. */
  create(booking: Partial<Booking>): Promise<APIResponse> {
    return this.http.send('POST', '/booking', { json: booking });
  }

  /** Отправка произвольного тела — для невалидного JSON. */
  createRaw(body: string): Promise<APIResponse> {
    return this.http.send('POST', '/booking', { raw: body });
  }

  get(id: number | string, accept?: string): Promise<APIResponse> {
    return this.http.send('GET', `/booking/${id}`, { headers: accept ? { Accept: accept } : {} });
  }

  list(filters: Record<string, string> = {}): Promise<APIResponse> {
    return this.http.send('GET', '/booking', { params: filters });
  }

  update(id: number, booking: Booking, auth: Auth): Promise<APIResponse> {
    return this.http.send('PUT', `/booking/${id}`, { json: booking, headers: authHeaders(auth) });
  }

  patch(id: number, fields: Partial<Booking>, auth: Auth): Promise<APIResponse> {
    return this.http.send('PATCH', `/booking/${id}`, { json: fields, headers: authHeaders(auth) });
  }

  delete(id: number, auth: Auth): Promise<APIResponse> {
    return this.http.send('DELETE', `/booking/${id}`, { headers: authHeaders(auth) });
  }
}

function authHeaders(auth: Auth): Record<string, string> {
  switch (auth.kind) {
    case 'none':
      return {};
    case 'token':
      return { Cookie: `token=${auth.token}` };
    case 'basic':
      // Сразу (preemptive), без ожидания 401 — API его всё равно не присылает
      return { Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}` };
  }
}
