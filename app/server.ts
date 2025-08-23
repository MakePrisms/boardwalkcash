import 'react-router';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';
import {
  createRequestHandler,
  unstable_RouterContextProvider,
} from 'react-router';

export const app = new Hono();
app.use(compress());
app.use(logger());

app.get('/api/hello', (c) => {
  return c.text('Hello World from hono server');
});

const handler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
);
app.mount('/', (req) => handler(req, new unstable_RouterContextProvider()));

export default app.fetch;
