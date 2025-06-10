import * as http from 'node:http';
import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import type { Request, Response } from 'express';
import { default as WebSocket, WebSocketServer } from 'ws';

const SUPABASE_PORT = 54321;
const SUPABASE_HOST = '127.0.0.1';

// Helper to filter headers
const filterHeaders = (
  headers: Record<string, string | string[] | undefined>,
  skipHeaders: Set<string>,
) => {
  const filtered: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (!skipHeaders.has(key.toLowerCase()) && value) {
      filtered[key] = Array.isArray(value) ? value[0] : value;
    }
  });
  return filtered;
};

// This is a workaround for issues with Supabase https when running locally.
// When Supabase is running on https locally it uses the non configurable self signed certificate
// which covers only localhost and 127.0.0.1. This is problematic when you want to access the dev
// server from the actual mobile device because you need to access it via the IP of the machine
// where the app and Supabase are running. Because of that when running the dev server on https
// we send all Supabase requests to the express server on /supabase path and there we proxy the
// requests to the Supabase server.
// If this is ever supported https://github.com/supabase/cli/issues/3684 we can remove the proxy.

// HTTP Proxy middleware
export const createSupabaseHttpProxy = () => {
  return (req: Request, res: Response) => {
    const targetPath = req.originalUrl.replace('/supabase', '');

    // Skip headers that would conflict with the proxy
    const skipHeaders = new Set(['host', 'content-length']);
    const headers = filterHeaders(req.headers, skipHeaders);

    const options = {
      hostname: SUPABASE_HOST,
      port: SUPABASE_PORT,
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
  };
};

// WebSocket Proxy setup
export const setupSupabaseWebSocketProxy = (
  server: HttpServer | HttpsServer,
) => {
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
    const targetUrl = `ws://${SUPABASE_HOST}:${SUPABASE_PORT}${targetPath}`;

    // Skip headers that would conflict with WebSocket connection
    const skipHeaders = new Set([
      'host',
      'connection',
      'upgrade',
      'sec-websocket-key',
      'sec-websocket-version',
      'sec-websocket-extensions',
      'sec-websocket-protocol',
    ]);

    const headers = filterHeaders(req.headers, skipHeaders);
    const targetWs = new WebSocket(targetUrl, { headers });

    // Forward messages from client to Supabase
    ws.on('message', (data, isBinary: boolean) => {
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(data, { binary: isBinary });
      } else {
        console.warn(
          '⚠️ Cannot forward message to Supabase - Supabase connection not open',
        );
      }
    });

    // Forward messages from Supabase to client
    targetWs.on('message', (data, isBinary: boolean) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data, { binary: isBinary });
      } else {
        console.warn(
          '⚠️ Cannot forward message from Supabase - Client connection not open',
        );
      }
    });

    // Handle connection events
    targetWs.on('open', () => {
      console.debug('✅ WebSocket proxy connected to Supabase realtime');
    });

    targetWs.on('close', () => {
      console.warn('⚠️  Supabase realtime connection closed');
      ws.close();
    });

    targetWs.on('error', (error) => {
      console.warn('⚠️  Supabase realtime connection error', error);
      ws.close();
    });

    ws.on('close', () => {
      console.warn('⚠️  Client WebSocket connection closed');
      targetWs.close();
    });
  });
};
