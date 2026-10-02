import { useState, useEffect, useRef, useCallback } from 'react';

// Initialize global state for the true network status
if (typeof window !== 'undefined') {
  (window as any).__appIsOnline = navigator.onLine;
}

const PROBE_INTERVAL_MS = 5000;
const PROBE_TIMEOUT_MS = 3000;

// Probe a tiny external resource to detect real internet connectivity.
// localhost requests always succeed even when WiFi is off, so we must check
// something outside the machine. Google's generate_204 endpoint is ideal:
// lightweight (no body), globally available, and CORS-safe with no-cors mode.
async function probeInternet(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // cache-bust with a random query param so the browser doesn't serve a cached response
    await fetch(`https://clients3.google.com/generate_204?_=${Date.now()}`, {
      method: 'HEAD',
      mode: 'no-cors',        // avoids CORS errors; opaque response is fine
      signal: controller.signal,
      cache: 'no-store',
    });
    // If fetch didn't throw, the network request went through — we're online
    return true;
  } catch {
    // Network error, abort, DNS failure — we're offline
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const intervalRef = useRef<any>(null);
  const prevOnlineRef = useRef<boolean>(navigator.onLine);
  const firstProbeRef = useRef<boolean>(true);

  const check = useCallback(async () => {
    const online = await probeInternet();
    if (typeof window !== 'undefined') {
      (window as any).__appIsOnline = online;

      // After the very first probe, tell the rest of the app the true status is now known.
      // App.tsx waits for this before starting the sync engine.
      if (firstProbeRef.current) {
        firstProbeRef.current = false;
        window.dispatchEvent(new CustomEvent('app_online_status_ready'));
      }

      // Fire custom event when we transition offline → online
      if (online && !prevOnlineRef.current) {
        window.dispatchEvent(new CustomEvent('app_came_online'));
      }
    }
    prevOnlineRef.current = online;
    setIsOnline(online);
  }, []);

  useEffect(() => {
    // Check right away on mount
    check();

    // Poll regularly
    intervalRef.current = setInterval(check, PROBE_INTERVAL_MS);

    // Browser events trigger an immediate re-check (they're hints, not truth)
    const onOnline = () => check();
    const onOffline = () => {
      setIsOnline(false);  // optimistic instant update
      check();             // then verify
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [check]);

  return { isOnline };
}
