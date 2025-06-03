import { useEffect } from 'react';
import { agicashDb } from './database';

/**
 * Reconnects Supabase realtime when the page becomes visible again.
 * This is needed on mobile where backgrounding the app often closes
 * the websocket connection.
 */
export function useReconnectSupabaseRealtime() {
  useEffect(() => {
    const reconnect = () => {
      if (document.visibilityState === 'visible') {
        agicashDb.realtime.connect();
      }
    };

    document.addEventListener('visibilitychange', reconnect);
    window.addEventListener('focus', reconnect);

    return () => {
      document.removeEventListener('visibilitychange', reconnect);
      window.removeEventListener('focus', reconnect);
    };
  }, []);
}
