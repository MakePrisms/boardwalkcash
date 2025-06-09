import * as fs from 'node:fs';
import * as https from 'node:https';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@react-router/express';
import express from 'express';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const certPath = path.join(dirname, '../certs/localhost-cert.pem');
const keyPath = path.join(dirname, '../certs/localhost-key.pem');

const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? null
    : await import('vite').then((vite) =>
        vite.createServer({
          server: {
            middlewareMode: true,
            https:
              fs.existsSync(certPath) && fs.existsSync(keyPath)
                ? {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath),
                  }
                : undefined,
          },
        }),
      );

const app = express();
app.use(
  process.env.NODE_ENV !== 'production' && viteDevServer
    ? viteDevServer.middlewares
    : express.static('build/client'),
);

const build =
  process.env.NODE_ENV !== 'production' && viteDevServer
    ? () => viteDevServer.ssrLoadModule('virtual:react-router/server-build')
    : await import(path.join(dirname, 'server/index.js'));

app.all('*', createRequestHandler({ build }));

if (process.env.NODE_ENV === 'production') {
  app.listen(3000, () => {
    console.log('App listening on http://localhost:3000');
  });
} else {
  const certificateExist = fs.existsSync(certPath) && fs.existsSync(keyPath);
  const useHttp = process.argv.includes('--http') || !certificateExist;

  if (useHttp) {
    if (!certificateExist) {
      console.warn('HTTPS certificates not found. Falling back to HTTP.');
    }
    app.listen(3000, () => {
      console.log('App listening on http://localhost:3000');
    });
  } else {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    const hostname = os.hostname();

    // Get local IP address
    const networkInterfaces = os.networkInterfaces();
    const localIP = Object.values(networkInterfaces)
      .flat()
      .find((iface) => iface?.family === 'IPv4' && !iface.internal)?.address;

    https.createServer(httpsOptions, app).listen(3000, () => {
      console.log('App listening on https://localhost:3000');
      console.log(`Also available at https://${hostname}:3000`);
      if (localIP) {
        console.log(`Also available at https://${localIP}:3000`);
      }
    });
  }
}
