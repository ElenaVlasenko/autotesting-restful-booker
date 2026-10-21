import { expect } from '@playwright/test';
import type { AuthClient } from '../clients/auth-client.ts';
import type { BookingClient } from '../clients/booking-client.ts';
import { config } from '../config/api-config.ts';
import type { BookingBuilder } from '../data/booking-builder.ts';
import type { Auth, AuthKind, Booking, CreateBookingResponse } from '../models/booking.ts';
import type { BookingTracker } from './booking-tracker.ts';
import { expectOkJson, expectText, Text } from './expect-response.ts';

/** Общие шаги тестов: предусловия, чтение с проверкой, авторизация. */
export class BookingSteps {
  private tokenPromise?: Promise<string>;

  constructor(
    private readonly authClient: AuthClient,
    private readonly bookingClient: BookingClient,
    private readonly bookings: BookingTracker,
    private readonly data: BookingBuilder,
  ) {}

  /** Токен запрашивается один раз на тест и только если нужен. */
  token(): Promise<string> {
    this.tokenPromise ??= this.authClient.token();
    return this.tokenPromise;
  }

  async tokenAuth(): Promise<Auth> {
    return { kind: 'token', token: await this.token() };
  }

  /** Способ авторизации по имени — для параметризованных тестов. */
  async auth(kind: AuthKind): Promise<Auth> {
    switch (kind) {
      case 'NONE':
        return { kind: 'none' };
      case 'TOKEN':
        return this.tokenAuth();
      case 'BASIC':
        return { kind: 'basic', username: config.username, password: config.password };
      case 'INVALID_TOKEN':
        return { kind: 'token', token: 'invalid-token' };
    }
  }

  /** Создаёт бронь (precondition). ID регистрируется для очистки до проверок ответа. */
  async createBooking(booking: Booking = this.data.valid()): Promise<CreateBookingResponse> {
    const response = await this.bookings.track(await this.bookingClient.create(booking));
    return expectOkJson<CreateBookingResponse>(response, 'create-booking-response');
  }

  async getBooking(id: number): Promise<Booking> {
    return expectOkJson<Booking>(await this.bookingClient.get(id), 'booking');
  }

  /** ID броней из GET /booking с фильтрами. ID извлекаются после проверки формы [{bookingid}]. */
  async listIds(filters: Record<string, string> = {}): Promise<number[]> {
    const list = await expectOkJson<{ bookingid: number }[]>(await this.bookingClient.list(filters), 'booking-list');
    return list.map((item) => item.bookingid);
  }

  /**
   * Брони с такими именами не существует. Найденные брони сначала регистрируются для очистки:
   * API мог сохранить бронь, даже вернув ошибку.
   */
  async assertNotCreated(booking: Partial<Booking>): Promise<void> {
    const filters: Record<string, string> = {};
    if (booking.firstname !== undefined) filters.firstname = booking.firstname;
    if (booking.lastname !== undefined) filters.lastname = booking.lastname;
    if (Object.keys(filters).length === 0) throw new Error('Booking has no names to search by');
    const ids = await this.listIds(filters);
    ids.forEach((id) => this.bookings.trackId(id));
    expect(ids, 'bookings saved despite the error').toEqual([]);
  }

  /** Удаляет бронь и подтверждает удаление через GET; после этого очистка её не трогает. */
  async deleteBooking(id: number, auth?: Auth): Promise<void> {
    await expectText(await this.bookingClient.delete(id, auth ?? (await this.tokenAuth())), Text.created);
    await expectText(await this.bookingClient.get(id), Text.notFound);
    this.bookings.untrack(id);
  }

  /** Создаёт бронь и сразу удаляет её — ID гарантированно своей, уже несуществующей брони. */
  async createDeletedBooking(): Promise<number> {
    const { bookingid } = await this.createBooking();
    await this.deleteBooking(bookingid);
    return bookingid;
  }
}
