import type { Config, Preset } from '@react-router/dev/config';
import { sentryOnBuildEnd } from '@sentry/react-router';
import { vercelPreset } from '@vercel/react-router/vite';

export default {
  ssr: true,
  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    if (process.env.VERCEL) {
      // We don't want to upload source maps to Sentry when building locally.
      await sentryOnBuildEnd({ viteConfig, reactRouterConfig, buildManifest });
    }
  },
  // Vercel preset changes the build output directory so we don't want that when building locally
  presets: [process.env.VERCEL ? vercelPreset() : null].filter(
    (preset): preset is Preset => Boolean(preset),
  ),
  async prerender() {
    return ['/terms', '/privacy'];
  },
} satisfies Config;
