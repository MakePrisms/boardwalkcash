import { type Preset, vitePlugin as remix } from '@remix-run/dev';
import { vercelPreset } from '@vercel/remix/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
const { jsonRoutes } = require('remix-json-routes');

declare module '@remix-run/node' {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      // Vercel preset changes the build output directory so we don't want that when building locally
      presets: [process.env.VERCEL ? vercelPreset() : null].filter(
        (preset): preset is Preset => Boolean(preset),
      ),
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      routes: async (defineRoutes) => {
        return jsonRoutes(defineRoutes, [
          {
            path: '/',
            file: 'routes/_app.tsx',
            children: [
              {
                path: 'settings',
                file: 'features/settings/routes/layout.tsx',
                children: [
                  {
                    index: true,
                    file: 'features/settings/routes/_index.tsx',
                  },
                  {
                    path: 'accounts',
                    file: 'features/settings/routes/accounts/_index.tsx',
                    index: true,
                  },
                  {
                    path: 'accounts/:account_id',
                    file: 'features/settings/routes/accounts/$account_id.tsx',
                  },
                  {
                    path: 'accounts/create',
                    file: 'features/settings/routes/accounts/create/_index.tsx',
                    index: true,
                  },
                  {
                    path: 'accounts/create/nwc',
                    file: 'features/settings/routes/accounts/create/nwc.tsx',
                  },
                  {
                    path: 'accounts/create/spark',
                    file: 'features/settings/routes/accounts/create/spark.tsx',
                  },
                  {
                    path: 'accounts/create/cashu',
                    file: 'features/settings/routes/accounts/create/cashu.tsx',
                  },
                  {
                    path: 'qr',
                    file: 'features/settings/routes/qr.tsx',
                  },
                  {
                    path: 'appearance',
                    file: 'features/settings/routes/appearance.tsx',
                  },
                  {
                    path: 'advanced',
                    file: 'features/settings/routes/advanced.tsx',
                  },
                  {
                    path: 'profile/edit',
                    file: 'features/settings/routes/profile/edit.tsx',
                  },
                ],
              },
            ],
          },
        ]);
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    emptyOutDir: false,
  },
});
