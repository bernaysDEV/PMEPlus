const CB_COUNT_KEY = "sabq_cb_count";
const CB_LAST_KEY = "sabq_cb_last";
const CB_HARD_COUNT_KEY = "sabq_hard_reset_count";
const CB_HARD_LAST_KEY = "sabq_hard_reset_last";
const CB_PARAM = "_cb";
const CB_MAX_PER_SESSION = 3;
const CB_COOLDOWN_MS = 30_000;
// Persistent circuit breaker (survives hardReset) so we never loop forever.
const HARD_RESET_MAX_PER_DAY = 2;
const HARD_RESET_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canCacheBust(): boolean {
  try {
    const last = sessionStorage.getItem(CB_LAST_KEY);
    if (last && Date.now() - parseInt(last, 10) < CB_COOLDOWN_MS) {
      return false;
    }
    const count = parseInt(sessionStorage.getItem(CB_COUNT_KEY) || "0", 10);
    return count < CB_MAX_PER_SESSION;
  } catch {
    return true;
  }
}

/**
 * Returns true only when the per-session quota is fully exhausted (not merely
 * inside the 30s cooldown). Use this to decide when to escalate to a hardReset.
 */
export function isCacheBustQuotaExhausted(): boolean {
  try {
    const count = parseInt(sessionStorage.getItem(CB_COUNT_KEY) || "0", 10);
    return count >= CB_MAX_PER_SESSION;
  } catch {
    return false;
  }
}

/**
 * Persistent circuit breaker — independent of sessionStorage and not cleared
 * by hardReset(). Caps how often we may auto-trigger a hard reset to avoid
 * infinite reload loops if the origin/CDN keeps serving a stale index.html.
 */
export function canHardReset(): boolean {
  try {
    const last = parseInt(localStorage.getItem(CB_HARD_LAST_KEY) || "0", 10);
    const count = parseInt(localStorage.getItem(CB_HARD_COUNT_KEY) || "0", 10);
    if (!last || Date.now() - last > HARD_RESET_WINDOW_MS) {
      return true;
    }
    return count < HARD_RESET_MAX_PER_DAY;
  } catch {
    return true;
  }
}

function markHardReset(): void {
  try {
    const last = parseInt(localStorage.getItem(CB_HARD_LAST_KEY) || "0", 10);
    const withinWindow = last && Date.now() - last <= HARD_RESET_WINDOW_MS;
    const prev = withinWindow
      ? parseInt(localStorage.getItem(CB_HARD_COUNT_KEY) || "0", 10)
      : 0;
    localStorage.setItem(CB_HARD_COUNT_KEY, String(prev + 1));
    localStorage.setItem(CB_HARD_LAST_KEY, String(Date.now()));
  } catch {}
}

export function markCacheBust(): void {
  try {
    const count = parseInt(sessionStorage.getItem(CB_COUNT_KEY) || "0", 10);
    sessionStorage.setItem(CB_COUNT_KEY, String(count + 1));
    sessionStorage.setItem(CB_LAST_KEY, String(Date.now()));
  } catch {}
}

export function getCacheBustCount(): number {
  try {
    return parseInt(sessionStorage.getItem(CB_COUNT_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

export function cacheBustReload(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(CB_PARAM, String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Clears only the per-session cache-bust counters (NOT the persistent hard-reset
 * circuit breaker). Use this when a lazy chunk has loaded successfully so a
 * single past failure doesn't carry over and trip the recovery UI prematurely.
 */
export function resetSessionCacheBustCounters(): void {
  try {
    sessionStorage.removeItem(CB_COUNT_KEY);
    sessionStorage.removeItem(CB_LAST_KEY);
    sessionStorage.removeItem("sabq_chunk_reload");
    sessionStorage.removeItem("sabq_chunk_error_reload");
  } catch {}
}

/**
 * Clears EVERY recovery-related counter — session cache-bust counters AND the
 * persistent hard-reset circuit breaker. Call this only when the user has
 * explicitly asked us to retry (e.g. tapped the recovery button), so their
 * intent overrides the safety caps that prevent automatic loops.
 */
export function resetAllRecoveryCounters(): void {
  resetSessionCacheBustCounters();
  try {
    localStorage.removeItem(CB_HARD_COUNT_KEY);
    localStorage.removeItem(CB_HARD_LAST_KEY);
    localStorage.removeItem("sabq_chunk_reload");
    localStorage.removeItem("sabq_chunk_error_reload");
  } catch {}
}

export function hardReset(): void {
  try {
    // Record this hard reset in the persistent circuit breaker BEFORE clearing
    // session counters, so canHardReset() can stop loops on subsequent failures.
    markHardReset();
    const cacheKeys = ["sabq_chunk_reload", "sabq_chunk_error_reload", CB_COUNT_KEY, CB_LAST_KEY];
    cacheKeys.forEach((k) => {
      try { sessionStorage.removeItem(k); } catch {}
      // Only wipe legacy session-style keys from localStorage; do NOT remove
      // CB_HARD_COUNT_KEY / CB_HARD_LAST_KEY here — that would defeat the
      // circuit breaker.
      if (k !== CB_HARD_COUNT_KEY && k !== CB_HARD_LAST_KEY) {
        try { localStorage.removeItem(k); } catch {}
      }
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k).catch(() => {}));
      }).catch(() => {});
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
    }
  } catch {}
  cacheBustReload();
}
