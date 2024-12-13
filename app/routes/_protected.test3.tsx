import { useNavigate } from '@remix-run/react';
import { Button } from '~/components/ui/button';

export default function Test2() {
  const navigate = useNavigate();
  return (
    <div>
      <div>
        This is test 3 page that navigates with manual call to navigate(-1)
      </div>
      <br />
      <Button
        onClick={() => {
          // @ts-ignore
          navigate(-1, {
            viewTransition: true,
            state: { transitionDirection: 'left', type: 'close' },
          });
        }}
      >
        Back
      </Button>
    </div>
  );
}
