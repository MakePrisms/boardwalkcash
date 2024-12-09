import { useOpenSecret } from '@opensecret/react';
import { Link, useNavigate } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useToast } from '~/hooks/use-toast';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

type FormValues = { code: string };

export function VerifyEmailForm() {
  // TODO: ask OS why do they have requestNewVerificationCode and requestNewVerificationEmail which seem to be doing the same thing
  const {
    auth,
    verifyEmail,
    requestNewVerificationCode,
    signOut,
    refetchUser,
  } = useOpenSecret();
  const [requestingVerificationCode, setRequestingVerificationCode] =
    useState<boolean>(false);
  const navigate = useNavigate();
  // TODO: handle this better later so we don't have to use !
  // biome-ignore lint/style/noNonNullAssertion: temporary
  const user = auth.user!.user;
  const isGuestUser = !user.email;
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  // TODO: handling this redirect probably doesn't belong here
  useEffectNoStrictMode(
    () => {
      if (user.email_verified || isGuestUser) {
        console.log('++++++++ redirecting from verify email to /');
        navigate('/');
      }
    },
    [user.email_verified, isGuestUser, navigate],
    'verify email - home redirect',
  );

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await verifyEmail(data.code);
      await refetchUser();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Failed to verify email',
      });
    }
  };

  const handleResendVerificationEmail = async () => {
    if (requestingVerificationCode) return;

    try {
      setRequestingVerificationCode(true);
      await requestNewVerificationCode();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to send new verification email',
        description: 'Please try again or contact support',
      });
    } finally {
      setRequestingVerificationCode(false);
    }
  };

  if (user.email_verified || isGuestUser) {
    return null;
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Verify Your Email</CardTitle>
        <CardDescription>
          Please check your email ({user.email}) to verify your account. You'll
          need to verify your email to continue using Maple AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="verificationCode"
              type="text"
              placeholder="Enter verification code"
              aria-invalid={errors.code ? 'true' : 'false'}
              {...register('code', {
                required: 'Code is required',
              })}
            />
            {errors.code && (
              <span role="alert" className="text-red-500 text-sm">
                {errors.code.message}
              </span>
            )}
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Verify
          </Button>
          <Button
            type="button"
            className="w-full"
            variant="outline"
            loading={requestingVerificationCode}
            onClick={handleResendVerificationEmail}
          >
            Resend Verification Email
          </Button>
          <Button
            type="button"
            className="w-full"
            variant="outline"
            onClick={signOut}
          >
            Log Out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
