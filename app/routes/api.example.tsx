export async function loader() {
  const body = JSON.stringify({
    message: 'This is Remix api route example',
    docs: 'https://remix.run/docs/en/main/guides/api-routes',
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
