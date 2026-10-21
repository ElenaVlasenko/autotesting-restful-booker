import { test as base, type TestDetails } from '@playwright/test';
import { AuthClient } from './clients/auth-client.ts';
import { BookingClient } from './clients/booking-client.ts';
import { HealthClient } from './clients/health-client.ts';
import { config } from './config/api-config.ts';
import { BookingBuilder } from './data/booking-builder.ts';
import { Http } from './http/http.ts';
import type { Auth } from './models/booking.ts';
import { BookingSteps } from './support/booking-steps.ts';
import { BookingTracker } from './support/booking-tracker.ts';

export { expect } from '@playwright/test';

export const KNOWN_BUG_TAG = '@known-bug';

/**
 * Тест известного дефекта API: проверяет правильное поведение и сейчас падает.
 * Исключён из основного прогона (project "api"), запускается `npm run test:known-bugs`.
 * Текущее (ошибочное) поведение фиксирует парный тест в основном наборе.
 * Транспортные ошибки такой тест прерывают (skipped), а не роняют — см. фикстуру http.
 */
export function knownBug(description: string): TestDetails {
  return { tag: KNOWN_BUG_TAG, annotation: { type: 'known bug', description } };
}

interface Fixtures {
  /** HTTP-клиент теста: его запросы попадают в лог, который выводится при падении. */
  http: Http;
  authClient: AuthClient;
  bookingClient: BookingClient;
  healthClient: HealthClient;
  /** Генератор данных теста: seed = BOOKER_SEED + имя теста, данные воспроизводятся. */
  data: BookingBuilder;
  /** Созданные тестом брони удаляются после теста. */
  bookings: BookingTracker;
  steps: BookingSteps;
}

export const test = base.extend<Fixtures>({
  http: async ({ playwright }, use, testInfo) => {
    const ctx = await playwright.request.newContext({ timeout: config.timeoutMs });
    // В known-bug тесте падение должно означать «API ответил неправильно», а не «стенд не ответил»
    const onTransportError = testInfo.tags.includes(KNOWN_BUG_TAG)
      ? (error: Error) => testInfo.skip(true, `Stand did not respond: ${error.message}`)
      : undefined;
    const http = new Http(ctx, config.baseUrl, onTransportError);

    await use(http);

    if (testInfo.status !== testInfo.expectedStatus) {
      const log = `Reproduce data with: ${config.reproduceEnv}\n\n${http.log.join('\n\n')}`;
      await testInfo.attach('http-log', { body: log, contentType: 'text/plain' });
      console.log(`HTTP log for failed test "${testInfo.title}":\n${log}`);
    }
    await ctx.dispose();
  },

  authClient: async ({ http }, use) => use(new AuthClient(http)),
  bookingClient: async ({ http }, use) => use(new BookingClient(http)),
  healthClient: async ({ http }, use) => use(new HealthClient(http)),

  data: async ({}, use, testInfo) => {
    const testId = testInfo.titlePath.join(' > ');
    await use(new BookingBuilder((config.seed ^ hash(testId)) >>> 0));
  },

  bookings: async ({ playwright }, use) => {
    // Отдельный контекст: запросы очистки не смешиваются с логом теста
    const ctx = await playwright.request.newContext({ timeout: config.timeoutMs });
    const http = new Http(ctx, config.baseUrl);
    const client = new BookingClient(http);
    const auth = async (): Promise<Auth> => ({ kind: 'token', token: await new AuthClient(http).token() });
    const tracker = new BookingTracker(client, auth);

    await use(tracker);

    const failures = await tracker.cleanup();
    await ctx.dispose();
    if (failures.length > 0) {
      throw new Error(
        `Cleanup failed, bookings may remain on the stand (reproduce data with ${config.reproduceEnv}):\n` +
          `${failures.join('\n')}\nHTTP log of cleanup:\n${http.log.join('\n\n')}`,
      );
    }
  },

  steps: async ({ authClient, bookingClient, bookings, data }, use) =>
    use(new BookingSteps(authClient, bookingClient, bookings, data)),
});

/** FNV-1a: стабильный 32-битный хэш строки (имя теста → добавка к seed). */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
