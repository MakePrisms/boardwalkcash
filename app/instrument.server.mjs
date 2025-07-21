import * as Sentry from '@sentry/react-router';

console.log('will call sentry init. Node env: ', process.env.NODE_ENV);

Sentry.init({
  dsn: 'https://3e5837ba4db251e806915155170ef71b@o4509706567680000.ingest.us.sentry.io/4509707316690944',

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  enabled: process.env.NODE_ENV === 'production',
});

console.log('sentry init executed');
