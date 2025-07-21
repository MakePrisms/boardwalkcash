export async function loader() {
  throw new Error('some error thrown in a loader');
}
export default function ExamplePage() {
  return <div>Loading this page will throw an error</div>;
}
