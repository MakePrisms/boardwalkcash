import Cors from 'cors';
import type { NextApiRequest, NextApiResponse } from 'next';
import { nip98 } from 'nostr-tools';

export const corsMiddleware = Cors({
   methods: ['GET', 'HEAD', 'POST'],
   origin: '*',
});

export const authMiddleware = async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
   const authorization = req.headers.authorization;
   if (!authorization) {
      return res.status(401).json({ message: 'Unauthorized' });
   }
   const [scheme, token] = authorization.split(' ');
   if (scheme.toLowerCase() !== 'nostr') {
      return res.status(401).json({ message: 'Invalid authorization scheme' });
   }
   const event = await nip98.unpackEventFromToken(token);

   const { method, url } = req;

   if (!method || !url) {
      return res.status(401).json({ message: 'Invalid request' });
   }

   const protocol =
      req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'] || 'http';
   // const fullUrl = `${protocol}://${req.headers.host}${req.url}`;
   const fullUrl = url;

   console.log('Full URL:', fullUrl);

   const valid = await nip98.validateEvent(event, fullUrl, method);

   if (!valid) {
      return res.status(401).json({ message: 'Invalid authorization' });
   }

   next();
};

type Middleware = (
   req: NextApiRequest,
   res: NextApiResponse,
   next: (result?: unknown) => void,
) => void;

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
export async function runMiddleware(
   req: NextApiRequest,
   res: NextApiResponse,
   middleware: Middleware,
): Promise<unknown> {
   return new Promise((resolve, reject) => {
      middleware(req, res, (result?: unknown) => {
         if (result instanceof Error) {
            return reject(result);
         }
         return resolve(result);
      });
   });
}
