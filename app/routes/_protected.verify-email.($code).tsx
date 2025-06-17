import { useParams } from 'react-router';
import { Page, PageContent } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { VerifyEmailForm } from '~/features/signup/verify-email-form';
import { shouldVerifyEmail as shouldUserVerifyEmail } from '~/features/user/user';
import { useUser } from '~/features/user/user-hooks';
import { useUrlNavigation } from '~/hooks/use-url-navigation';

export default function VerifyEmail() {
  const user = useUser();
  const { code } = useParams<{ code?: string }>();
  const shouldVerifyEmail = shouldUserVerifyEmail(user);
  const { buildRedirect } = useUrlNavigation();

  if (!shouldVerifyEmail) {
    return (
      <Redirect
        to={buildRedirect('/')}
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
