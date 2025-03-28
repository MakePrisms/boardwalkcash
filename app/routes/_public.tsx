import { Outlet } from 'react-router';

export default function PublicRoute() {
  return (
    <div>
      <div>This is a public route</div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
