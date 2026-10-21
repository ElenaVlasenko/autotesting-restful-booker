import { test } from '../../src/fixtures.ts';
import { expectText, Text } from '../../src/support/expect-response.ts';

test.describe('HealthCheck', () => {
  test('HC-1: GET /ping — стенд доступен (201 Created)', async ({ healthClient }) => {
    await expectText(await healthClient.ping(), Text.created);
  });
});
