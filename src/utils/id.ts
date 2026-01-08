/**
 * ID helper
 * - Prefers crypto.randomUUID() when available (browser + Node 20+)
 * - Falls back to time+random for older environments
 */
export function createId(prefix: string): string {
  const cryptoObj: Crypto | undefined =
    typeof crypto !== "undefined"
      ? crypto
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined);

  const uuid =
    cryptoObj && typeof cryptoObj.randomUUID === "function" ? cryptoObj.randomUUID() : null;

  if (uuid) {
    return `${prefix}_${uuid}`;
  }

  // Fallback: reasonably unique, but not cryptographically strong
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

