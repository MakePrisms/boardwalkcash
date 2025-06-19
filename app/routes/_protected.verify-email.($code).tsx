import { useLocation, useParams } from 'react-router';
import { Page, PageContent } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { VerifyEmailForm } from '~/features/signup/verify-email-form';
import { shouldVerifyEmail as shouldUserVerifyEmail } from '~/features/user/user';
import { useUser } from '~/features/user/user-hooks';

export default function VerifyEmail() {
  const user = useUser();
  const location = useLocation();
  const { code } = useParams<{ code?: string }>();
  const shouldVerifyEmail = shouldUserVerifyEmail(user);

  if (!shouldVerifyEmail) {
    const searchParams = new URLSearchParams(location.search);
    const redirectTo = searchParams.get('redirectTo') || '/';

    return (
      <Redirect
        to={{ ...location, pathname: redirectTo }}
        logMessage="Redirecting from verify email to /"
      />
    );
  }

  return (
    <Page>
      <PageContent className="justify-center">
        <VerifyEmailForm user={user} code={code} />
      </PageContent>
    </Page>
  );
}
