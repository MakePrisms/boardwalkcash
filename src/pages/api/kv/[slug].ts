import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv, createClient } from '@vercel/kv';
 
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { slug } = req.query;

    if (typeof slug !== 'string') {
        res.status(400).json({ message: 'Invalid slug' });
        return;
    }

    const client = createClient({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
    });

    const value = await client.get(slug);

    res.status(200).json({ slug, value });
}