import type { Config, Preset } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

export default {
  ssr: true,
  // Vercel preset changes the build output directory so we don't want that when building locally
  presets: [process.env.VERCEL ? vercelPreset() : null].filter(
    (preset): preset is Preset => Boolean(preset),
  ),
  async prerender() {
    return ['/terms', '/privacy'];
  },
} satisfies Config;
