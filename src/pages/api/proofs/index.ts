import type { NextApiRequest, NextApiResponse } from 'next';
import { createProof } from '@/lib/proofModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { id, amount, secret, C, userId } = req.body;

    // Basic validation (Consider more robust validation based on your requirements)
    if (!id || !amount || !secret || !C || !userId) {
      return res.status(400).json({ message: 'Missing required proof details' });
    }

    try {
      // Create the proof
      const newProof = await createProof(id, amount, secret, C, userId);
      
      // Respond with the created proof (or customize the response as needed)
      return res.status(201).json(newProof);
    } catch (error: any) {
      console.error('Failed to create proof:', error);
      // Adjust error handling as necessary based on the errors you expect from Prisma or your database
      return res.status(500).json({ message: 'Failed to create proof', error: error.message });
    }
  } else {
    // Optionally, handle other methods, e.g., GET for listing users
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
