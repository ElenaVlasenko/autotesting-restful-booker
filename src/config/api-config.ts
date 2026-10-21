import { randomInt, randomUUID } from 'node:crypto';

/**
 * Параметры запуска. Источник — переменные окружения, иначе значение по умолчанию.
 *
 * Seed, runId и базовая дата, если не заданы, генерируются и записываются обратно в process.env.
 * Модуль импортируется в playwright.config.ts, то есть в главном процессе до запуска воркеров:
 * воркеры наследуют окружение и получают те же значения.
 */
function read(env: string, fallback: string): string {
  const value = process.env[env]?.trim();
  return value ? value : fallback;
}

function readOrInit(env: string, init: () => string): string {
  const value = read(env, '') || init();
  process.env[env] = value;
  return value;
}

function readInt(env: string, fallback: number): number {
  const raw = read(env, String(fallback));
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${env} must be an integer, got "${raw}"`);
  return value;
}

const seed = Number(readOrInit('BOOKER_SEED', () => String(randomInt(2 ** 31))));
if (!Number.isInteger(seed)) throw new Error(`BOOKER_SEED must be an integer, got "${process.env.BOOKER_SEED}"`);

const runId = readOrInit('BOOKER_RUN_ID', () => randomUUID().slice(0, 8));

const baseDate = readOrInit('BOOKER_BASE_DATE', () => new Date().toISOString().slice(0, 10));
if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) throw new Error(`BOOKER_BASE_DATE must be YYYY-MM-DD, got "${baseDate}"`);

export const config = {
  baseUrl: read('BOOKER_BASE_URL', 'https://restful-booker.herokuapp.com'),
  /** Таймаут одного HTTP-запроса (соединение + ответ). */
  timeoutMs: readInt('BOOKER_TIMEOUT', 30_000),
  /** Сколько ждать, пока стенд ответит на /ping перед прогоном: Heroku после простоя «просыпается» долго. */
  standWaitMs: readInt('BOOKER_STAND_WAIT', 60_000),

  // Публичные демо-креды из документации API; переопределяются через env
  username: read('BOOKER_USERNAME', 'admin'),
  password: read('BOOKER_PASSWORD', 'password123'),

  /** Seed тестовых данных (значения Faker). */
  seed,
  /**
   * Идентификатор запуска — часть уникальных имён. Отделён от seed: при повторе с тем же seed
   * и новым runId данные те же, а имена не пересекаются с бронями прошлого запуска на общем стенде.
   */
  runId,
  /** День (YYYY-MM-DD), от которого считаются даты броней. По умолчанию — сегодня (UTC). */
  baseDate,

  /** Переменные, с которыми повторяются данные упавшего теста. */
  get reproduceEnv(): string {
    return `BOOKER_SEED=${seed} BOOKER_RUN_ID=${runId} BOOKER_BASE_DATE=${baseDate}`;
  },
};
