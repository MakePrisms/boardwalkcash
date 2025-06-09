import * as fs from 'node:fs';
import * as http from 'node:http';
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

// Proxy Supabase requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/supabase/*', (req, res) => {
    const targetPath = req.originalUrl.replace('/supabase', '');

    // Pass all headers except those that would conflict with the proxy
    const skipHeaders = new Set(['host', 'content-length']);
    const headers: Record<string, string> = {};

    Object.entries(req.headers).forEach(([key, value]) => {
      if (!skipHeaders.has(key.toLowerCase()) && value) {
        headers[key] = Array.isArray(value) ? value[0] : value;
      }
    });

    const options = {
      hostname: '127.0.0.1',
      port: 54321,
      path: targetPath,
      method: req.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode || 500);

      // Copy response headers
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value) {
          res.setHeader(key, value);
        }
      });

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Supabase proxy error:', error);
      res.status(500).json({ error: 'Proxy error' });
    });

    // Pipe request body to proxy request
    req.pipe(proxyReq);
  });
}

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
  // Production: HTTP server
  app.listen(3000, () => {
    console.log('App listening on http://localhost:3000');
  });
} else {
  // Development: HTTPS server
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    const hostname = os.hostname();
    const server = https.createServer(httpsOptions, app);

    // Add WebSocket proxy for Supabase Realtime (dynamic import for dev-only dependency)
    const { WebSocketServer, default: WebSocket } = await import('ws');

    const wss = new WebSocketServer({
      server,
      path: '/supabase/realtime/v1/websocket',
    });

    wss.on('connection', (ws, req) => {
      if (!req.url) {
        console.error('WebSocket request missing URL');
        ws.close();
        return;
      }

      const url = new URL(req.url, `https://${req.headers.host}`);
      const targetPath = url.pathname.replace('/supabase', '') + url.search;
      const targetUrl = `ws://127.0.0.1:54321${targetPath}`;

      // Create WebSocket connection to Supabase
      const headers: Record<string, string> = {};

      // Pass all headers except those that would conflict with WebSocket connection
      const skipHeaders = new Set([
        'host',
        'connection',
        'upgrade',
        'sec-websocket-key',
        'sec-websocket-version',
        'sec-websocket-extensions',
        'sec-websocket-protocol',
      ]);

      Object.entries(req.headers).forEach(([key, value]) => {
        if (!skipHeaders.has(key.toLowerCase()) && value) {
          headers[key] = Array.isArray(value) ? value[0] : value;
        }
      });

      const targetWs = new WebSocket(targetUrl, {
        headers,
      });

      // Forward messages from client to Supabase
      ws.on('message', (data, isBinary: boolean) => {
        if (targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(data, { binary: isBinary });
        }
      });

      // Forward messages from Supabase to client
      targetWs.on('message', (data, isBinary: boolean) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data, { binary: isBinary });
        }
      });

      // Handle connection events
      targetWs.on('open', () => {
        console.log('✅ WebSocket proxy connected to Supabase realtime');
      });

      targetWs.on('close', () => {
        ws.close();
      });

      targetWs.on('error', () => {
        ws.close();
      });

      ws.on('close', () => {
        targetWs.close();
      });
    });

    server.listen(3000, () => {
      console.log('App listening on https://localhost:3000');
      console.log(`Also available at https://${hostname}:3000`);
    });
  } else {
    console.warn('HTTPS certificates not found. Falling back to HTTP.');
    app.listen(3000, () => {
      console.log('App listening on http://localhost:3000');
    });
  }
}
