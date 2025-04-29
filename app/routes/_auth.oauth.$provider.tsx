import { useNavigate, useSearchParams } from 'react-router';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { getErrorMessage } from '~/features/shared/error';
import { useAuthActions } from '~/features/user/auth';
import { useEffectNoStrictMode } from '~/hooks/use-effect-no-strict-mode';
import { useToast } from '~/hooks/use-toast';
import type { Route } from './+types/_auth.oauth.$provider';

export default function OAuthCallback({
  params: { provider },
}: Route.ComponentProps) {
  const { handleGoogleAuthCallback } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  console.debug('OAuthCallback', provider);
  console.debug('searchParams', searchParams.toString());

  useEffectNoStrictMode(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        const message = 'Missing code or state parameter';
        console.warn(message);
        toast({
          title: 'Login failed',
          description: message,
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      console.debug('code', code);
      console.debug('state', state);

      try {
        switch (provider) {
          case 'google':
            await handleGoogleAuthCallback(code, state);
            break;
          default:
            throw new Error('Unsupported OAuth provider');
        }
      } catch (error) {
        console.error('OAuth callback error', { cause: error });
        toast({
          title: 'Login failed',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
        navigate('/login');
      }
    }

    handleCallback();
  }, [provider, searchParams, handleGoogleAuthCallback, navigate, toast]);

  return <LoadingScreen />;
}
