/**
 * By default, React Router  will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx react-router reveal` ✨
 * For more information, see https://reactrouter.com/explanation/special-files#entryclienttsx
 */
import * as Sentry from '@sentry/react-router';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

/**
 * Checks if running on a local server. Returns true if built for development or if
 * host is localhost, 127.0.0.1, .local domain or a local IP address.
 */
const isLocalServer = (): boolean => {
  // Check environment variables first
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.LOCAL_DEV === 'true'
  ) {
    return true;
  }

  // Auto-detect local environment using browser APIs
  const hostname = window.location.hostname;

  // Check if hostname indicates local environment
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return true;
  }

  return false;
};

Sentry.init({
  dsn: 'https://3e5837ba4db251e806915155170ef71b@o4509706567680000.ingest.us.sentry.io/4509707316690944',
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
  integrations: [],
  enabled: process.env.NODE_ENV === 'production' && !isLocalServer(),
  environment: 'preview', // TODO: set proper environment
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
