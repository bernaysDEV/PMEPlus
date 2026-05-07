import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface VersionResponse {
  version: string;
}

const VERSION_URL = "/version.json";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between background checks
const INITIAL_DELAY_MS = 30 * 1000; // wait a bit after first paint

async function fetchAppVersion(): Promise<string | null> {
  try {
    const res = await fetch(VERSION_URL, {
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionResponse;
    return typeof data?.version === "string" && data.version.length > 0
      ? data.version
      : null;
  } catch {
    return null;
  }
}

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Polls /version.json in the background and reports when a newer build
 * has been deployed. The hook records the version it sees on first
 * successful fetch and only flips to `updateAvailable=true` when a
 * subsequent fetch returns a different value.
 *
 * Designed to be unobtrusive:
 *   - waits 30s after mount before the first check
 *   - polls every 5 minutes, but only when the tab is visible
 *   - also re-checks immediately when the tab regains focus
 *   - skipped entirely inside the Capacitor native app
 */
export function useVersionCheck(): { updateAvailable: boolean } {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNativeApp()) return;

    let cancelled = false;
    let initialVersion: string | null = null;
    let pollTimer: number | null = null;
    let initialTimer: number | null = null;

    const check = async () => {
      const v = await fetchAppVersion();
      if (cancelled || !v) return;
      if (initialVersion == null) {
        initialVersion = v;
        return;
      }
      if (v !== initialVersion) {
        setUpdateAvailable(true);
      }
    };

    const schedule = () => {
      if (pollTimer != null) window.clearTimeout(pollTimer);
      pollTimer = window.setTimeout(async () => {
        if (!cancelled && document.visibilityState === "visible") {
          await check();
        }
        if (!cancelled) schedule();
      }, POLL_INTERVAL_MS);
    };

    initialTimer = window.setTimeout(() => {
      check();
      schedule();
    }, INITIAL_DELAY_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (initialTimer != null) window.clearTimeout(initialTimer);
      if (pollTimer != null) window.clearTimeout(pollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { updateAvailable };
}
