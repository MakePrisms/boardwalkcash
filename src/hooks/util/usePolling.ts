import { useInterval, useTimeoutFn } from 'react-use';
import { useCallback, useState } from 'react';

/**
 *  A hook for polling a callback function at a specified interval with a timeout
 * @param callback - The function to be called at each interval
 * @param intervalMs - The interval between polls in milliseconds
 * @param timeoutMs - The total time to poll before stopping in milliseconds
 */

export const usePolling = (callback: Function, intervalMs: number, timeoutMs: number) => {
   const [isPolling, setIsPolling] = useState(false);

   /* Stop polling after timeout */
   const [, , resetTimeout] = useTimeoutFn(() => {
      setIsPolling(false);
   }, timeoutMs);

   const poll = useCallback(async () => {
      if (!isPolling) return;

      try {
         await callback();
      } catch (e) {
         console.error('Polling error:', e);
      }
   }, [callback, isPolling]);

   /* Set up the polling interval */
   useInterval(poll, isPolling ? intervalMs : null);

   const start = useCallback(() => {
      setIsPolling(true);
      resetTimeout();
   }, [resetTimeout]);

   const stop = useCallback(() => setIsPolling(false), []);

   return {
      start,
      stop,
      isPolling,
   };
};
