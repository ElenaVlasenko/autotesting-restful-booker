import { expect, test } from '../../src/fixtures.ts';
import type { Booking } from '../../src/models/booking.ts';
import { expectOkJson, expectText, Text } from '../../src/support/expect-response.ts';

test.describe('Read (GET /booking)', () => {
  test('GT-1: GET /booking/{id} — ответ соответствует JSON Schema и отправленным данным', async ({
    bookingClient,
    data,
    steps,
  }) => {
    const expected = data.valid();
    const created = await steps.createBooking(expected);

    const booking = await expectOkJson<Booking>(await bookingClient.get(created.bookingid), 'booking');

    expect(booking).toEqual(expected);
  });

  test('GT-2: GET с нечисловым id → 404 Not Found', async ({ bookingClient }) => {
    await expectText(await bookingClient.get('abc'), Text.notFound);
  });

  test('GT-3: фильтр по firstname и lastname возвращает ровно свою бронь', async ({ steps }) => {
    const created = await steps.createBooking();
    const { firstname, lastname } = created.booking;

    expect(await steps.listIds({ firstname, lastname })).toEqual([created.bookingid]);
  });

  // Особенность API: неподдерживаемый Accept → 418 I'm a Teapot
  test("GT-4: GET с Accept: text/plain → 418 I'm a Teapot", async ({ bookingClient, steps }) => {
    const { bookingid } = await steps.createBooking();

    await expectText(await bookingClient.get(bookingid, 'text/plain'), Text.teapot);
  });
});
