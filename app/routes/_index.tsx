import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Boardwalk" },
    { name: "description", content: "Welcome to Boardwalk!" },
  ];
};

export default function Index() {
  return (
    <div>
      <h1>Welcome to Boardwalk!</h1>
    </div>
  );
}
