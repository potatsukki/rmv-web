import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/server-clock';

/**
 * The current time on the server clock, refreshed every `intervalMs` and whenever the tab
 * becomes visible again, so labels like "3 hours ago" keep counting while a page stays open.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    const tick = () => setNow(serverNow());
    const timer = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
