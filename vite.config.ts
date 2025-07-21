import { reactRouter } from '@react-router/dev/vite';
import {
  sentryReactRouter,
  type SentryReactRouterBuildOptions,
} from '@sentry/react-router';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import tsconfigPaths from 'vite-tsconfig-paths';

const sentryConfig: SentryReactRouterBuildOptions = {
  org: 'make-prisms',
  project: 'agicash',
  // An auth token is required for uploading source maps;
  // store it in an environment variable to keep it secure.
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

export default defineConfig((config) => ({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    devtoolsJson(),
    sentryReactRouter(sentryConfig, config),
  ],
  build: {
    emptyOutDir: false,
  },
}));
