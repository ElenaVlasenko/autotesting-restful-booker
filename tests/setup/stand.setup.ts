import { test as setup } from '@playwright/test';
import { config } from '../../src/config/api-config.ts';

const POLL_INTERVAL_MS = 3_000;

/**
 * Опрашивает GET /ping, пока не получит 201 или не истечёт BOOKER_STAND_WAIT. Если стенд так и не ответил,
 * падает этот setup-тест с понятной причиной, а зависимые проекты (api, known-bugs) пропускаются —
 * без ожидания таймаутов в каждом тесте.
 *
 * Срок проверяется между попытками, поэтому последняя попытка может закончиться позже на величину таймаута запроса.
 */
setup('стенд отвечает на GET /ping', async ({ playwright }) => {
  setup.setTimeout(config.standWaitMs + config.timeoutMs + 10_000);
  const ctx = await playwright.request.newContext({ baseURL: config.baseUrl, timeout: config.timeoutMs });
  const deadline = Date.now() + config.standWaitMs;
  try {
    for (;;) {
      let problem: string;
      try {
        const response = await ctx.get('/ping');
        if (response.status() === 201) return;
        problem = `GET /ping returned ${response.status()}`;
      } catch (e) {
        problem = e instanceof Error ? e.message : String(e);
      }
      if (Date.now() + POLL_INTERVAL_MS > deadline) {
        throw new Error(`Stand ${config.baseUrl} is unavailable after ${config.standWaitMs} ms: ${problem}`);
      }
      // Единственная пауза в проекте: интервал опроса, ограниченный BOOKER_STAND_WAIT
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } finally {
    await ctx.dispose();
  }
});
