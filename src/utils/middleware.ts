import Cors from 'cors';
import type { NextApiRequest, NextApiResponse } from 'next';

export const corsMiddleware = Cors({
    methods: ['GET', 'HEAD', 'POST'],
    origin: '*',
});

type Middleware = (
    req: NextApiRequest,
    res: NextApiResponse,
    next: (result?: unknown) => void
) => void;

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
export async function runMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    middleware: Middleware
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
