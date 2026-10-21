const sensitiveHeaders = new Set(['authorization', 'cookie', 'set-cookie']);
const sensitiveFields = new Set(['token', 'password']);

export function maskHeader(name: string, value: string): string {
  return sensitiveHeaders.has(name.toLowerCase()) ? '***' : value;
}

/**
 * JSON разбирается, и секретные поля заменяются на любой глубине. Тело, которое не разбирается
 * как JSON, но упоминает секретное поле, не выводится вовсе.
 */
export function maskBody(body: string): string {
  if (body.trim() === '') return body;
  let tree: unknown;
  try {
    tree = JSON.parse(body);
  } catch {
    const lower = body.toLowerCase();
    return [...sensitiveFields].some((field) => lower.includes(field))
      ? '<body hidden: not valid JSON and may contain secrets>'
      : body;
  }
  return JSON.stringify(mask(tree));
}

function mask(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(mask);
  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, sensitiveFields.has(key.toLowerCase()) ? '***' : mask(value)]),
    );
  }
  return node;
}
