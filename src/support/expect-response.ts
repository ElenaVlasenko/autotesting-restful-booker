import { expect, type APIResponse } from '@playwright/test';
import { schemaErrors, type SchemaName } from './schemas.ts';

/** Текстовые ответы API: ошибки и 201 Created приходят как text/plain с телом-названием статуса. */
export const Text = {
  created: { status: 201, body: 'Created' },
  badRequest: { status: 400, body: 'Bad Request' },
  forbidden: { status: 403, body: 'Forbidden' },
  notFound: { status: 404, body: 'Not Found' },
  methodNotAllowed: { status: 405, body: 'Method Not Allowed' },
  teapot: { status: 418, body: "I'm a Teapot" },
  serverError: { status: 500, body: 'Internal Server Error' },
} as const;

async function describe(response: APIResponse): Promise<string> {
  return `${response.url()} → ${response.status()} ${await response.text()}`;
}

/**
 * Текстовый ответ: точные статус, Content-Type и тело. Так тест на валидацию не позеленеет
 * от случайного 503 упавшего стенда.
 */
export async function expectText(response: APIResponse, expected: { status: number; body: string }): Promise<void> {
  const context = await describe(response);
  expect(response.status(), context).toBe(expected.status);
  expect(response.headers()['content-type'], context).toMatch(/^text\/plain/);
  expect(await response.text(), context).toBe(expected.body);
}

/**
 * Успешный JSON-ответ: 200 + application/json. Если указана схема, тело проверяется по ней —
 * после этого его можно безопасно считать значением типа T.
 */
export async function expectOkJson<T = unknown>(response: APIResponse, schema?: SchemaName): Promise<T> {
  const context = await describe(response);
  expect(response.status(), context).toBe(200);
  expect(response.headers()['content-type'], context).toMatch(/^application\/json/);
  const body: unknown = await response.json();
  if (schema) expect(schemaErrors(schema, body), `JSON Schema "${schema}": ${context}`).toBeNull();
  return body as T;
}
