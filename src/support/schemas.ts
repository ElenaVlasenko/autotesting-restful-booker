import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv } from 'ajv';

const schemaNames = ['booking', 'booking-list', 'create-booking-response'] as const;
export type SchemaName = (typeof schemaNames)[number];

const schemaDir = join(import.meta.dirname, '../../schemas');

// allErrors — в сообщении о падении видны все расхождения, а не только первое
const ajv = new Ajv({ allErrors: true });
for (const name of schemaNames) ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, `${name}.json`), 'utf8')), name);

/**
 * Проверяет значение по JSON Schema из папки schemas/. Возвращает текст ошибок или null.
 * Типы строгие: "777" не integer, "true" и 1 — не boolean, 1.5 — не integer, 123 — не string.
 */
export function schemaErrors(name: SchemaName, value: unknown): string | null {
  return ajv.validate(name, value) ? null : ajv.errorsText(ajv.errors, { dataVar: name });
}
