export async function loader() {
  throw new Error('Sentry Test Error');
}
export default function ExamplePage() {
  return <div>Loading this page will throw an error</div>;
}
