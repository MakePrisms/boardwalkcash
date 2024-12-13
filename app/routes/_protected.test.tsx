import { Link } from '@remix-run/react';

export default function Test() {
  return (
    <div>
      <div>This is test page</div>
      <br />
      <Link
        to="/"
        viewTransition
        state={{ transitionDirection: 'right', type: 'close' }}
      >
        Home
      </Link>
    </div>
  );
}
