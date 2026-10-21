import { withoutField } from '../../src/data/booking-builder.ts';
import { expect, knownBug, test } from '../../src/fixtures.ts';
import type { Booking } from '../../src/models/booking.ts';
import { expectText, Text } from '../../src/support/expect-response.ts';

test.describe('Create (POST /booking)', () => {
  test('CR-1: валидная бронь создаётся и читается по ID', async ({ data, steps }) => {
    const booking = data.valid();

    const created = await steps.createBooking(booking);

    expect(created.bookingid).toBeGreaterThan(0);
    expect(created.booking).toEqual(booking);
    // Ожидание — отправленный объект, а не ответ POST
    expect(await steps.getBooking(created.bookingid)).toEqual(booking);
  });

  test('CR-2: бронь без необязательного additionalneeds', async ({ data, steps }) => {
    const { additionalneeds: _, ...booking } = data.valid();

    const created = await steps.createBooking(booking);

    expect(created.booking).toEqual(booking);
    expect(await steps.getBooking(created.bookingid)).not.toHaveProperty('additionalneeds');
  });

  test('CR-3a: граница — totalprice = 0', async ({ data, steps }) => {
    const booking: Booking = { ...data.valid(), totalprice: 0 };

    const created = await steps.createBooking(booking);

    expect((await steps.getBooking(created.bookingid)).totalprice).toBe(0);
  });

  test('CR-3b: граница — однодневная бронь, checkin == checkout', async ({ data, steps }) => {
    const day = data.date(10);
    const booking: Booking = { ...data.valid(), bookingdates: { checkin: day, checkout: day } };

    const created = await steps.createBooking(booking);

    expect((await steps.getBooking(created.bookingid)).bookingdates).toEqual({ checkin: day, checkout: day });
  });

  // Ограничение длины не документировано; на стенде такие строки принимаются (200)
  test('CR-4: длинные строки (300 символов), кириллица и спецсимволы сохраняются без искажений', async ({ data, steps }) => {
    const booking: Booking = {
      ...data.valid(),
      firstname: data.uniqueName('Иван-Ø\'&<>"'),
      lastname: data.uniqueName('x'.repeat(300)),
      additionalneeds: 'Завтрак 🍳',
    };

    const created = await steps.createBooking(booking);

    expect(created.booking).toEqual(booking);
    expect(await steps.getBooking(created.bookingid)).toEqual(booking);
  });

  for (const field of ['firstname', 'totalprice'] as const) {
    test(`CR-5: без обязательного поля ${field} → 500, бронь не создаётся [known bug: текущее поведение]`, async ({
      bookingClient,
      bookings,
      data,
      steps,
    }) => {
      const booking = withoutField(data.valid(), field);

      await expectText(await bookings.track(await bookingClient.create(booking)), Text.serverError);

      await steps.assertNotCreated(booking);
    });
  }

  test(
    'CR-5 (bug): без обязательного поля firstname → 400',
    knownBug('Отсутствие обязательного поля → 500 Internal Server Error вместо 400 Bad Request'),
    async ({ bookingClient, bookings, data, steps }) => {
      const booking = withoutField(data.valid(), 'firstname');

      await expectText(await bookings.track(await bookingClient.create(booking)), Text.badRequest);

      await steps.assertNotCreated(booking);
    },
  );

  test('CR-6: синтаксически невалидный JSON → 400 Bad Request', async ({ bookingClient, bookings }) => {
    await expectText(await bookings.track(await bookingClient.createRaw('{"firstname": ')), Text.badRequest);
  });

  test('CR-7: отрицательная totalprice принимается [known bug: текущее поведение]', async ({ data, steps }) => {
    const booking: Booking = { ...data.valid(), totalprice: -100 };

    const created = await steps.createBooking(booking);

    expect(created.booking).toEqual(booking);
    expect((await steps.getBooking(created.bookingid)).totalprice).toBe(-100);
  });

  test(
    'CR-7 (bug): отрицательная totalprice → 400',
    knownBug('Отрицательная totalprice принимается (200), ожидается 400'),
    async ({ bookingClient, bookings, data, steps }) => {
      const booking: Booking = { ...data.valid(), totalprice: -100 };

      await expectText(await bookings.track(await bookingClient.create(booking)), Text.badRequest);

      await steps.assertNotCreated(booking);
    },
  );
});
