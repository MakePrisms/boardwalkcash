import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv, createClient } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const client = createClient({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
    });

    if (req.method === 'GET') {
        const { slug } = req.query;

        if (typeof slug !== 'string') {
            res.status(400).json({ message: 'Invalid slug' });
            return;
        }

        const value = await client.get(slug);
        res.status(200).json({ slug, value });
    } else if (req.method === 'POST') {
        // Assuming your endpoint's path is structured as `/api/kv/:slug`
        const slug = req.query.slug;

        if (typeof slug !== 'string') {
            res.status(400).json({ message: 'Invalid slug for POST request' });
            return;
        }

        // Extract the value from the request body
        const { value } = req.body;

        if (typeof value !== 'string') {
            res.status(400).json({ message: 'Invalid or missing value' });
            return;
        }

        // Use the client to set the value
        await client.set(slug, value);

        // Respond to indicate success
        res.status(200).json({ message: `Value set for ${slug}` });
    } else {
        // Handle unsupported methods
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
