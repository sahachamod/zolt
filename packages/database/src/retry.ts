import type { RetryOptions } from "./types.js";

const transientCodes = new Set([
  "ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "EAI_AGAIN",
  "PROTOCOL_CONNECTION_LOST", "PROTOCOL_ENQUEUE_AFTER_QUIT"
]);

/** True only for errors that mean a connection was never established, so retrying cannot double-apply a write. */
export function isTransientConnectionError(error: unknown): boolean {
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === "string" && transientCodes.has(code);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withConnectionRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const minDelayMs = options.minDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransientConnectionError(error)) throw error;
      await delay(Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
