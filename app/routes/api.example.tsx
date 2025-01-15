const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function loader() {
  const body = JSON.stringify({
    message: 'This is Remix api route example',
    docs: 'https://remix.run/docs/en/main/guides/api-routes',
    supabaseUrl,
    supabaseAnonKey,
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
