import { useNavigate, useParams } from '@remix-run/react';
import { VerifyEmailForm } from '~/features/signup/verify-email-form';
import { shouldVerifyEmail as shouldUserVerifyEmail } from '~/features/user/user';
import { useUserStore } from '~/features/user/user-provider';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

export default function VerifyEmail() {
  const user = useUserStore((state) => state.user);
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const shouldVerifyEmail = shouldUserVerifyEmail(user);

  useEffectNoStrictMode(() => {
    if (!shouldVerifyEmail) {
      console.debug('Redirecting from verify email to /');
      navigate('/');
    }
  }, [shouldVerifyEmail, navigate]);

  if (!shouldVerifyEmail) {
    return null;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <VerifyEmailForm user={user} code={code} />
    </div>
  );
}
