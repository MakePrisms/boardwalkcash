import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useCashuAuthStore } from '~/features/shared/cashu-auth';

// This component handles OIDC callback after authentication
// It completes the auth flow and redirects based on returnTo stored in sessionStorage
export default function OidcCallback() {
  const navigate = useNavigate();
  const { completeAuth } = useCashuAuthStore();

  useQuery({
    queryKey: ['oidc-callback'],
    queryFn: async () => {
      // Complete auth flow - this automatically stores the session in the auth store
      await completeAuth();

      const returnTo = sessionStorage.getItem('oidc_return_to');

      if (returnTo) {
        // Clear the stored returnTo URL
        sessionStorage.removeItem('oidc_return_to');

        console.debug('OIDC callback redirecting to:', returnTo);

        navigate(returnTo);
      } else {
        console.debug(
          'OIDC callback, no returnTo specified, redirecting to home',
        );
        navigate('/');
      }

      return true;
    },
    retry: false,
    throwOnError: true,
  });

  return <LoadingScreen />;
}
