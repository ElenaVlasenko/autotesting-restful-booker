import { addDays, type BookingBuilder } from '../../src/data/booking-builder.ts';
import { expect, test } from '../../src/fixtures.ts';
import type { Booking } from '../../src/models/booking.ts';
import { expectOkJson, expectText, Text } from '../../src/support/expect-response.ts';

/** Новая бронь, у которой каждое поле гарантированно отличается от original. */
function changedEveryField(data: BookingBuilder, original: Booking): Booking {
  const updated: Booking = {
    ...data.valid(),
    totalprice: original.totalprice + 1,
    depositpaid: !original.depositpaid,
    bookingdates: {
      checkin: addDays(original.bookingdates.checkin, 1),
      checkout: addDays(original.bookingdates.checkout, 2),
    },
    additionalneeds: `${original.additionalneeds} + extra towels`,
  };
  // Имена уникальны и так; проверка защищает от правок выше, которые оставят поле прежним
  for (const field of Object.keys(original) as (keyof Booking)[]) {
    expect(updated[field], field).not.toEqual(original[field]);
  }
  return updated;
}

test.describe('Update (PUT / PATCH /booking/{id})', () => {
  test('UP-1: PUT (токен в Cookie) обновляет все поля', async ({ bookingClient, data, steps }) => {
    const created = await steps.createBooking();
    const updated = changedEveryField(data, created.booking);

    const response = await bookingClient.update(created.bookingid, updated, await steps.auth('TOKEN'));

    expect(await expectOkJson<Booking>(response, 'booking')).toEqual(updated);
    expect(await steps.getBooking(created.bookingid)).toEqual(updated);
  });

  test('UP-2: PATCH (Basic auth) меняет только переданные поля', async ({ bookingClient, data, steps }) => {
    const created = await steps.createBooking();
    const patch = { firstname: data.uniqueName('Patched'), totalprice: created.booking.totalprice + 1 };
    const expected: Booking = { ...created.booking, ...patch };

    const response = await bookingClient.patch(created.bookingid, patch, await steps.auth('BASIC'));

    expect(await expectOkJson<Booking>(response, 'booking')).toEqual(expected);
    expect(await steps.getBooking(created.bookingid)).toEqual(expected);
  });

  // Особенность API: без прав — 403, а не 401
  test('UP-3: PUT без авторизации → 403 Forbidden, данные не изменились', async ({ bookingClient, data, steps }) => {
    const created = await steps.createBooking();

    await expectText(await bookingClient.update(created.bookingid, data.valid(), await steps.auth('NONE')), Text.forbidden);

    expect(await steps.getBooking(created.bookingid)).toEqual(created.booking);
  });
});
