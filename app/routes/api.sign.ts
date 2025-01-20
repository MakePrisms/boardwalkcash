import type { ActionFunctionArgs } from '@remix-run/node';
import sign from 'jwt-encode';

// TODO: this endpoint should check for presence of OS jwt and valdate that sub in the OS jwt matches the sub in the request body
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const body = await request.json();

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set');
    return new Response('Error. Failed to sign the payload', { status: 500 });
  }

  const jwt = sign(body, secret);
  const responseBody = JSON.stringify({ jwt });

  return new Response(responseBody, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
