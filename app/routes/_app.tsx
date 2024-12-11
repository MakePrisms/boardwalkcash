import { Outlet, useNavigate } from '@remix-run/react';
import { Cog } from 'lucide-react';
import { Button } from '~/components/ui/button';

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <>
      <div className="relative">
        <div>
          <h1>Welcome to Boardwalk!</h1>
        </div>
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
          >
            <Cog />
          </Button>
        </div>
      </div>
      <Outlet />
    </>
  );
}
