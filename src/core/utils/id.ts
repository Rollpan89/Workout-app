/**
 * Collision-resistant id generator that works on every platform (no
 * dependency on crypto.randomUUID, which is missing in some RN runtimes).
 */
export function createId(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${time}${rand}` : `${time}${rand}`;
}
