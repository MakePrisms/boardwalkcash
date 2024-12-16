import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  useRequestEmailVerificationCode,
  useVerifyEmailOnLoad,
} from '~/features/signup/verify-email';
import { useAuthActions } from '~/features/user/auth';
import type { FullUser } from '~/features/user/user';
import { useUserStore } from '~/features/user/user-provider';
import { useToast } from '~/hooks/use-toast';

type FormValues = { code: string };
type Step = 'auto-verification' | 'manual-verification';
type Props = { user: FullUser; code?: string };

export function VerifyEmailForm({ user, code }: Props) {
  const [step, setStep] = useState<Step>(() => {
    return code ? 'auto-verification' : 'manual-verification';
  });
  const { signOut } = useAuthActions();
  const verifyEmail = useUserStore((state) => state.verifyEmail);
  const { toast } = useToast();
  const { requestingEmailVerificationCode, requestEmailVerificationCode } =
    useRequestEmailVerificationCode();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  useVerifyEmailOnLoad({
    code,
    onFailed: () => setStep('manual-verification'),
  });

  if (step === 'auto-verification') {
    return 'Verifying email...';
  }

  const onSubmit = async (data: FormValues) => {
    try {
      await verifyEmail(data.code);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Failed to verify email',
      });
    }
  };

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
            loading={requestingEmailVerificationCode}
            onClick={requestEmailVerificationCode}
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
