/**
 * Race a promise against a timeout.
 *
 * If `promise` does not settle within `ms` milliseconds, the returned promise
 * resolves with `fallbackValue` instead. This guards against network calls that
 * can hang forever — e.g. `fetch()` with no AbortController when a device
 * reports "connected" but has no real internet (dead APN / mobile-data pack
 * exhausted while Wi-Fi is also on). Such a `fetch()` never resolves *or*
 * rejects, so a plain `.catch()` cannot recover from it — only a timeout can.
 *
 * Note: if `promise` *rejects* before the timeout elapses, the returned promise
 * also rejects. Callers that must never throw should still attach `.catch()`.
 *
 * @template T
 * @param {Promise<T>} promise       The promise to race.
 * @param {number} ms                Timeout in milliseconds.
 * @param {T} [fallbackValue]        Value to resolve with on timeout.
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}
