import { Link } from '@remix-run/react';

export default function Test2() {
  return (
    <div>
      <div>This is test 2 page</div>
      <br />
      <Link
        to="/"
        viewTransition
        state={{ transitionDirection: 'down', type: 'close' }}
      >
        Home
      </Link>
    </div>
  );
}
