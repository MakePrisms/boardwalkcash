import { useParams } from '@remix-run/react';
import { Redirect } from '~/components/redirect';
import { VerifyEmailForm } from '~/features/signup/verify-email-form';
import { shouldVerifyEmail as shouldUserVerifyEmail } from '~/features/user/user';
import { useUserStore } from '~/features/user/user-provider';

export default function VerifyEmail() {
  const user = useUserStore((state) => state.user);
  const { code } = useParams<{ code?: string }>();
  const shouldVerifyEmail = shouldUserVerifyEmail(user);

  if (!shouldVerifyEmail) {
    return <Redirect to="/" logMessage="Redirecting from verify email to /" />;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <VerifyEmailForm user={user} code={code} />
    </div>
  );
}