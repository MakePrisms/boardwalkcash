import { verifyEmail as osVerifyEmail } from '@opensecret/react';
import type { QueryClient } from '@tanstack/react-query';
import { redirect, unstable_createContext } from 'react-router';
import { Page, PageContent } from '~/components/page';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { VerifyEmailForm } from '~/features/signup/verify-email-form';
import { authStateQueryKey } from '~/features/user/auth';
import {
  type FullUser,
  type User,
  shouldVerifyEmail as shouldUserVerifyEmail,
} from '~/features/user/user';
import { userQueryKey } from '~/features/user/user-hooks';
import { toast } from '~/hooks/use-toast';
import { getQueryClient } from '~/query-client';
import type { Route } from './+types/_protected.verify-email.($code)';

const verifyEmailContext = unstable_createContext<FullUser>();

const getUser = (queryClient: QueryClient) => {
  const user = queryClient.getQueryData<User>([userQueryKey]);
  if (!user) {
    // This should never happen because route guard middleware in _protected.tsx will run first and load the user.
    throw new Error('User not found');
  }
  return user;
};

const getRedirect = (request: Request) => {
  const location = new URL(request.url);
  const redirectTo = location.searchParams.get('redirectTo') || '/';
  // We have to use window.location.hash because location that comes from the request does not have the hash
  return redirect(`${redirectTo}${location.search}${window.location.hash}`);
};

const routeGuardMiddleware: Route.unstable_ClientMiddlewareFunction = async (
  { request, context },
  next,
) => {
  const queryClient = getQueryClient();
  const user = getUser(queryClient);

  if (!shouldUserVerifyEmail(user)) {
    throw getRedirect(request);
  }

  context.set(verifyEmailContext, user);

  await next();
};

export const unstable_clientMiddleware: Route.unstable_ClientMiddlewareFunction[] =
  [routeGuardMiddleware];

const verifyEmail = async (
  code: string,
): Promise<{ verified: true } | { verified: false; error: Error }> => {
  try {
    await osVerifyEmail(code);
    const queryClient = getQueryClient();
    await queryClient.invalidateQueries({
      queryKey: [authStateQueryKey],
      refetchType: 'all',
    });
    return { verified: true };
  } catch (e) {
    const error = new Error('Failed to verify email', { cause: e });
    console.error(error);
    return { verified: false, error };
  }
};

export async function clientLoader({
  request,
  context,
  params: { code },
}: Route.ClientLoaderArgs) {
  const user = context.get(verifyEmailContext);

  if (!code) {
    return { user };
  }

  const result = await verifyEmail(code);

  if (result.verified) {
    throw getRedirect(request);
  }

  toast({
    variant: 'destructive',
    title: 'Failed to verify',
    description:
      'Please try entering the code manually or request another verification email',
    duration: 8000,
  });

  return { user };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <LoadingScreen />;
}

export default function VerifyEmail({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <Page>
      <PageContent className="justify-center">
        <VerifyEmailForm user={user} />
      </PageContent>
    </Page>
  );
}
