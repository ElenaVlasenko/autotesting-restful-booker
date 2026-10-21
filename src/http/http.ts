import type { APIRequestContext, APIResponse } from '@playwright/test';
import { maskBody, maskHeader } from './masking.ts';

export interface SendOptions {
  /** Объект, который отправляется как JSON. Поля со значением undefined не отправляются. */
  json?: unknown;
  /** Тело как есть — для невалидного JSON. */
  raw?: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Тонкая обёртка над APIRequestContext Playwright: базовые заголовки, запись каждого обмена в лог
 * с маскировкой секретов. Лог выводится только при падении теста (см. fixtures.ts).
 *
 * [onTransportError] вызывается, если ответа не было (DNS, таймаут, обрыв соединения, TLS).
 * Для known-bug тестов он превращает такую ошибку в skipped, см. fixtures.ts.
 */
export class Http {
  readonly log: string[] = [];

  constructor(
    private readonly ctx: APIRequestContext,
    private readonly baseUrl: string,
    private readonly onTransportError?: (error: Error) => void,
  ) {}

  async send(method: string, path: string, options: SendOptions = {}): Promise<APIResponse> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(options.params ?? {})) url.searchParams.set(key, value);

    const body = options.raw ?? (options.json === undefined ? undefined : JSON.stringify(options.json));
    const headers: Record<string, string> = {
      // Строго один тип: список из нескольких MIME-типов API отклоняет с 418
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    // Запрос форматируется до отправки, чтобы попасть в лог и при транспортной ошибке
    const requestLog = [
      `--> ${method} ${url}`,
      ...Object.entries(headers).map(([name, value]) => `    ${name}: ${maskHeader(name, value)}`),
      ...(body === undefined ? [] : [`    ${maskBody(body)}`]),
    ].join('\n');

    let response: APIResponse;
    try {
      response = await this.ctx.fetch(url.toString(), { method, headers, data: body, failOnStatusCode: false, maxRedirects: 0 });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.log.push(`${requestLog}\n<-- NO RESPONSE: ${error.message}`);
      this.onTransportError?.(error);
      throw error;
    }

    this.log.push(
      [
        requestLog,
        `<-- ${response.status()} ${response.statusText()}`,
        ...response.headersArray().map(({ name, value }) => `    ${name}: ${maskHeader(name, value)}`),
        `    ${maskBody(await response.text())}`,
      ].join('\n'),
    );
    return response;
  }
}
