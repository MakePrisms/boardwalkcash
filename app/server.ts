import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@vercel/remix/server';
import express from 'express';

const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? null
    : await import('vite').then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

const app = express();
app.use(
  process.env.NODE_ENV !== 'production' && viteDevServer
    ? viteDevServer.middlewares
    : express.static('build/client'),
);

const dirname = path.dirname(fileURLToPath(import.meta.url));
const build =
  process.env.NODE_ENV !== 'production' && viteDevServer
    ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : await import(path.join(dirname, 'server/index.js'));

app.all('*', createRequestHandler({ build }));

app.listen(3000, () => {
  console.log('App listening on http://localhost:3000');
});
