import * as fs from 'node:fs';
import * as https from 'node:https';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@react-router/express';
import express from 'express';
import type { ServerBuild } from 'react-router';
import {
  createSupabaseHttpProxy,
  setupSupabaseWebSocketProxy,
} from './supabase-proxy';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('build/client'));

  const build = await import(path.join(dirname, 'server/index.js'));

  app.all('*', createRequestHandler({ build }));

  app.listen(3000, () => {
    console.log('App listening on http://localhost:3000');
  });
} else {
  const certPath = path.join(dirname, '../certs/localhost-cert.pem');
  const keyPath = path.join(dirname, '../certs/localhost-key.pem');

  const certificateExists = fs.existsSync(certPath) && fs.existsSync(keyPath);
  const useHttps = certificateExists && process.argv.includes('--https');

  const viteDevServer = await import('vite').then((vite) =>
    vite.createServer({
      server: {
        middlewareMode: true,
        https: useHttps
          ? {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath),
            }
          : undefined,
      },
    }),
  );

  app.use(viteDevServer.middlewares);

  if (useHttps) {
    app.use('/supabase/*', createSupabaseHttpProxy());
  }

  const build = () =>
    viteDevServer.ssrLoadModule(
      'virtual:react-router/server-build',
    ) as Promise<ServerBuild>;

  app.all('*', createRequestHandler({ build }));

  if (useHttps) {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    const hostname = os.hostname();

    const networkInterfaces = os.networkInterfaces();
    const localIP = Object.values(networkInterfaces)
      .flat()
      .find((iface) => iface?.family === 'IPv4' && !iface.internal)?.address;

    const httpsApp = https.createServer(httpsOptions, app);

    httpsApp.listen(3000, () => {
      console.log('App listening on https://localhost:3000');
      console.log(`Also available at https://${hostname}:3000`);
      if (localIP) {
        console.log(`Also available at https://${localIP}:3000`);
      }
    });

    setupSupabaseWebSocketProxy(httpsApp);
  } else {
    if (!certificateExists) {
      console.warn('HTTPS certificates not found. Falling back to HTTP.');
    }
    app.listen(3000, () => {
      console.log('App listening on http://localhost:3000');
    });
  }
}
