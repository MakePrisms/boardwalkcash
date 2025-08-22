import * as fs from 'node:fs';
import * as https from 'node:https';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  createSupabaseHttpProxy,
  setupSupabaseWebSocketProxy,
} from './supabase-proxy';

const PORT = Number.parseInt(process.env.PORT || '3000');

const dirname = path.dirname(fileURLToPath(import.meta.url));

const certPath = path.join(dirname, '../certs/localhost-cert.pem');
const keyPath = path.join(dirname, '../certs/localhost-key.pem');

const certificateExists = fs.existsSync(certPath) && fs.existsSync(keyPath);
const useHttps = process.argv.includes('--https');

const setupHttps = certificateExists && useHttps;

console.log('setupHttps', setupHttps);

const app = express();

console.log('Starting development server');

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
    forceOptimizeDeps: process.argv.includes('--force'),
  }),
);

app.use(viteDevServer.middlewares);

if (setupHttps) {
  app.use('/supabase/*splat', createSupabaseHttpProxy());
}

app.use(async (req, res, next) => {
  try {
    const source = await viteDevServer.ssrLoadModule('./app/server.ts');
    return await source.app(req, res, next);
  } catch (error) {
    if (typeof error === 'object' && error instanceof Error) {
      viteDevServer.ssrFixStacktrace(error);
    }
    next(error);
  }
});

if (setupHttps) {
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
    console.log(`App listening on https://localhost:${PORT}`);
    console.log(`Also available at https://${hostname}:${PORT}`);
    if (localIP) {
      console.log(`Also available at https://${localIP}:${PORT}`);
    }
  });

  setupSupabaseWebSocketProxy(httpsApp);
} else {
  if (useHttps && !certificateExists) {
    console.warn('HTTPS certificates not found. Falling back to HTTP.');
  }

  app.listen(PORT, () => {
    console.log(`App listening on http://localhost:${PORT}`);
  });
}
