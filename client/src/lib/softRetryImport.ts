export const CHUNK_RECOVERY_ERROR = 'CHUNK_LOAD_RECOVERY_PENDING';

export function isChunkErrorMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  if (m.includes(CHUNK_RECOVERY_ERROR.toLowerCase())) return false;
  return (
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('importing binding name') ||
    m.includes('importing a module script failed') ||
    m.includes('loading chunk') ||
    m.includes('loading css chunk') ||
    m.includes('chunkloaderror') ||
    m.includes('unable to preload css')
  );
}

export function isRecoveryError(error: Error | null | undefined): boolean {
  if (!error) return false;
  return (error.message || '').includes(CHUNK_RECOVERY_ERROR);
}

/**
 * Like the global `retryImport` in App.tsx but never escalates to a full-page
 * cache-bust reload. Use this for in-page lazy sections (e.g. below-the-fold
 * sections on the home page) where a chunk-load failure should surface a
 * small inline retry placeholder instead of yanking the user out of their
 * scroll position.
 *
 * Behavior:
 *  - Retries the import N times with exponential backoff for transient
 *    network/chunk failures.
 *  - On final failure for a chunk-load error, rejects with a sentinel
 *    `CHUNK_RECOVERY_ERROR`. Section-level error boundaries should catch this
 *    and show an inline retry.
 *  - Non-chunk runtime errors are surfaced immediately (no retry).
 */
export function softRetryImport<T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 400,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number, currentDelay: number) => {
      importFn()
        .then(resolve)
        .catch((error: Error) => {
          const isModuleError = isChunkErrorMessage(error?.message);
          if (!isModuleError) {
            reject(error);
            return;
          }
          if (remaining > 0) {
            setTimeout(() => attempt(remaining - 1, currentDelay * 2), currentDelay);
            return;
          }
          const wrapper = new Error(CHUNK_RECOVERY_ERROR);
          (wrapper as Error & { original?: Error }).original = error;
          reject(wrapper);
        });
    };
    attempt(retries, delay);
  });
}
