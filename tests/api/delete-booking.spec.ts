import { expect, knownBug, test } from '../../src/fixtures.ts';
import { expectText, Text } from '../../src/support/expect-response.ts';

test.describe('Delete (DELETE /booking/{id})', () => {
  test('DL-1: DELETE с токеном удаляет бронь, GET → 404', async ({ steps }) => {
    const { bookingid } = await steps.createBooking();

    // DELETE → 201 Created, затем GET → 404 Not Found
    await steps.deleteBooking(bookingid);
  });

  test('DL-2: DELETE с невалидным токеном → 403 Forbidden, бронь остаётся', async ({ bookingClient, steps }) => {
    const created = await steps.createBooking();

    await expectText(await bookingClient.delete(created.bookingid, await steps.auth('INVALID_TOKEN')), Text.forbidden);

    expect(await steps.getBooking(created.bookingid)).toEqual(created.booking);
  });

  test('DL-3: DELETE уже удалённой брони → 405 [known bug: текущее поведение]', async ({ bookingClient, steps }) => {
    const id = await steps.createDeletedBooking();

    await expectText(await bookingClient.delete(id, await steps.tokenAuth()), Text.methodNotAllowed);
  });

  test(
    'DL-3 (bug): DELETE уже удалённой брони → 404',
    knownBug('DELETE несуществующей брони с токеном → 405 Method Not Allowed вместо 404 Not Found'),
    async ({ bookingClient, steps }) => {
      const id = await steps.createDeletedBooking();

      await expectText(await bookingClient.delete(id, await steps.tokenAuth()), Text.notFound);
    },
  );
});
