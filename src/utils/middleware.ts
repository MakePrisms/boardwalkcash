import { AuthenticatedRequest } from '@/types';
import Cors from 'cors';
import type { NextApiRequest, NextApiResponse } from 'next';
import { nip98 } from 'nostr-tools';

export const corsMiddleware = Cors({
   methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
   origin: '*',
});

export const authMiddleware = async (
   req: AuthenticatedRequest,
   res: NextApiResponse,
   next: Function,
   optional: boolean = false,
) => {
   const authorization = req.headers.authorization;
   if (!authorization) {
      if (optional) {
         return next();
      }
      return res.status(401).json({ message: 'Unauthorized' });
   }
   const [scheme, token] = authorization.split(' ');
   if (scheme.toLowerCase() !== 'nostr') {
      if (optional) {
         return next();
      }
      return res.status(401).json({ message: 'Invalid authorization scheme' });
   }
   try {
      const event = await nip98.unpackEventFromToken(token);

      const { method, url } = req;

      if (!method || !url) {
         if (optional) {
            return next();
         }
         return res.status(401).json({ message: 'Invalid request' });
      }

      const protocol =
         req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'] || 'http';
      const fullUrl = url;

      const valid = await nip98.validateEvent(event, fullUrl, method);

      if (!valid) {
         if (optional) {
            return next();
         }
         return res.status(401).json({ message: 'Invalid authorization' });
      }

      // Add authenticated pubkey to the request
      req.authenticatedPubkey = event.pubkey;
   } catch (error) {
      console.error('Error unpacking NIP98 event:', error);
      if (optional) {
         return next();
      }
      return res.status(401).json({ message: 'Invalid authorization' });
   }

   next();
};

type Middleware = (
   req: NextApiRequest,
   res: NextApiResponse,
   next: (result?: unknown) => void,
) => void;

export async function runAuthMiddleware(
   req: AuthenticatedRequest,
   res: NextApiResponse,
   optional: boolean = false,
) {
   return new Promise((resolve, reject) => {
      authMiddleware(
         req,
         res,
         (result?: unknown) => {
            if (result instanceof Error) {
               return reject(result);
            }
            return resolve(result);
         },
         optional,
      );
   });
}

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

export const basicAuthMiddleware = async (
   req: NextApiRequest,
   res: NextApiResponse,
   next: () => void,
) => {
   const authHeader = req.headers.authorization;

   if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.status(401).json({ message: 'Missing or invalid authorization header' });
      return;
   }

   const base64Credentials = authHeader.split(' ')[1];
   const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
   const [username, password] = credentials.split(':');

   const hashedPassword = process.env.ADMIN_PASSWORD_HASH;

   if (!hashedPassword) {
      console.error('ADMIN_PASSWORD_HASH is not set in environment variables');
      res.status(500).json({ message: 'Server configuration error' });
      return;
   }

   try {
      const crypto = require('crypto');
      const inputHash = crypto.createHash('sha256').update(password).digest('hex');
      const isPasswordValid = crypto.timingSafeEqual(
         Buffer.from(inputHash, 'hex'),
         Buffer.from(hashedPassword, 'hex'),
      );

      if (isPasswordValid) {
         next();
      } else {
         res.status(401).json({ message: 'Invalid credentials' });
      }
   } catch (error) {
      console.error('Error during password comparison:', error);
      res.status(500).json({ message: 'Internal server error' });
   }
};
