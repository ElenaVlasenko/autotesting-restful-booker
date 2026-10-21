import type { APIResponse } from '@playwright/test';
import type { BookingClient } from '../clients/booking-client.ts';
import type { Auth } from '../models/booking.ts';

/**
 * Учёт созданных тестом броней и их удаление после теста (см. фикстуру bookings в fixtures.ts).
 * Если очистка не удалась, тест падает; у уже упавшего теста Playwright покажет обе ошибки.
 */
export class BookingTracker {
  private readonly ids = new Set<number>();

  constructor(
    private readonly client: BookingClient,
    private readonly auth: () => Promise<Auth>,
  ) {}

  /**
   * Регистрирует бронь, если в 2xx-ответе есть bookingid — независимо от Content-Type
   * и корректности остальных полей, которые проверяются позже.
   */
  async track(response: APIResponse): Promise<APIResponse> {
    if (response.ok()) {
      try {
        const id: unknown = (await response.json())?.bookingid;
        if (Number.isInteger(id)) this.ids.add(id as number);
      } catch {
        // Тело не JSON — регистрировать нечего
      }
    }
    return response;
  }

  /** Регистрирует бронь, найденную иначе, чем по ответу на создание (например, поиском по имени). */
  trackId(id: number): void {
    this.ids.add(id);
  }

  /** Снимает с учёта бронь, удаление которой уже подтвердил сам тест (DELETE → 201, GET → 404). */
  untrack(id: number): void {
    this.ids.delete(id);
  }

  /**
   * Удаляет все учтённые брони и возвращает описания проблем (пустой список — всё удалено).
   * Удалённой бронь считается, только если DELETE вернул 201 или последующий GET вернул 404:
   * любой другой ответ DELETE (в том числе 405, который стенд отдаёт для уже удалённой брони)
   * сам по себе не доказывает, что брони нет.
   */
  async cleanup(): Promise<string[]> {
    if (this.ids.size === 0) return [];
    const ids = [...this.ids];
    this.ids.clear();
    // Авторизация запрашивается один раз: если /auth недоступен, не повторяем запрос на каждую бронь
    let auth: Auth;
    try {
      auth = await this.auth();
    } catch (e) {
      return ids.map((id) => `booking ${id}: auth failed: ${errorMessage(e)}`);
    }
    const failures: string[] = [];
    for (const id of ids) {
      try {
        const problem = await this.deleteAndConfirm(id, auth);
        if (problem) failures.push(problem);
      } catch (e) {
        failures.push(`booking ${id}: ${errorMessage(e)}`);
      }
    }
    return failures;
  }

  private async deleteAndConfirm(id: number, auth: Auth): Promise<string | null> {
    const deleteStatus = (await this.client.delete(id, auth)).status();
    if (deleteStatus === 201) return null;
    const getStatus = (await this.client.get(id)).status();
    return getStatus === 404 ? null : `booking ${id}: DELETE returned ${deleteStatus}, GET returned ${getStatus}`;
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
