import { useInterval, useTimeout } from 'react-use';

/**
 * Repeatedly calls a function at a specified interval until a timeout is reached.
 * @param callback - Function to call periodically. If it returns true, polling will stop
 * @param delay - Time in milliseconds between each call. If null, polling is paused
 * @param timeout - Total duration in milliseconds to poll before stopping. Optional
 */
export const usePolling = (callback: Function, delay?: number | null, timeout?: number) => {
   const [hasTimedOut, _, restart] = useTimeout(timeout);

   /* hasTimedOut returns true if the timeout has been reached */
   const pollingPeriod = timeout === undefined || !hasTimedOut() ? delay : null;

   useInterval(callback, pollingPeriod);

   return {
      isPolling: !!pollingPeriod,
      restart,
   };
};
