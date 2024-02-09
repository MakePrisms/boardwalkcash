// pages/api/users/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '@/lib/userModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Create a new user
    try {
      const { pubkey } = req.body;
      if (!pubkey) {
        return res.status(400).json({ message: 'Pubkey is required' });
      }
      const user = await createUser(pubkey);
      return res.status(200).json(user);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  } else {
    // Optionally, handle other methods, e.g., GET for listing users
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
