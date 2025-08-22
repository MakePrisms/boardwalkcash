import { createRequestHandler } from '@react-router/express';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import 'react-router';
import { unstable_RouterContextProvider } from 'react-router';

export const app = express();
app.use(compression());
app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') {
  app.use(
    '/assets',
    express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
  );
  app.use(express.static('build/client', { maxAge: '1h' }));
}

app.use(morgan('tiny'));

app.use('/api/hello', (_, res) => {
  res.send('Hello World from express server');
});

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
    getLoadContext() {
      return new unstable_RouterContextProvider(new Map());
    },
  }),
);

if (process.env.NODE_ENV === 'production') {
  console.log('Starting production server');
  const PORT = Number.parseInt(process.env.PORT || '3000');
  app.listen(PORT, () => {
    console.log(`App listening on http://localhost:${PORT}`);
  });
}
