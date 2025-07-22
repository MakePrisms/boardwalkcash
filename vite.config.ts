import { reactRouter } from '@react-router/dev/vite';
import {
  type SentryReactRouterBuildOptions,
  sentryReactRouter,
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

console.log('!!!SENTRY_AUTH_TOKEN: ', process.env.SENTRY_AUTH_TOKEN);

export default defineConfig((config) => ({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    devtoolsJson(),
    sentryReactRouter(sentryConfig, config),
  ],
  build: {
    sourcemap: true,
    emptyOutDir: false,
    rollupOptions: {
      // See https://github.com/vitejs/vite/issues/15012#issuecomment-1948550039
      onwarn(warning, defaultHandler) {
        if (warning.code === 'SOURCEMAP_ERROR') {
          return;
        }

        defaultHandler(warning);
      },
    },
  },
}));
