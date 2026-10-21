import { defineConfig } from '@playwright/test';
// Импорт фиксирует seed / runId / baseDate в process.env до запуска воркеров (см. api-config.ts)
import './src/config/api-config.ts';

const KNOWN_BUG = /@known-bug/;

export default defineConfig({
  // Тесты ходят в общий публичный стенд: запускаем последовательно и без повторов,
  // чтобы нестабильность стенда была видна, а не маскировалась ретраями
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never' }]],

  projects: [
    {
      // Один раз за прогон ждёт ответа GET /ping; если стенд не ответил, тесты API пропускаются
      name: 'stand',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'api',
      testDir: './tests/api',
      grepInvert: KNOWN_BUG,
      dependencies: ['stand'],
    },
    {
      // Тесты известных дефектов проверяют правильное поведение и сейчас падают.
      // PASSED здесь означает, что дефект исправлен и ожидания в основном наборе пора обновить.
      name: 'known-bugs',
      testDir: './tests/api',
      grep: KNOWN_BUG,
      dependencies: ['stand'],
    },
  ],
});
