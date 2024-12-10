import { useOpenSecret } from '@opensecret/react';
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

type Props = {
  email: string;
  secret: string;
  onSuccess: () => void;
  onBack: () => void;
};

type FormValues = {
  resetCode: string;
  password: string;
  confirmPassword: string;
};

export function PasswordReset({ email, secret, onSuccess, onBack }: Props) {
  const { confirmPasswordReset } = useOpenSecret();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await confirmPasswordReset(email, data.resetCode, secret, data.password);
      onSuccess();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error! Password reset failed',
        description: 'Please try again later or contact support',
      });
    }
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Enter the reset code and your new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="email">Reset Code</Label>
            <Input
              id="resetCode"
              type="text"
              aria-invalid={errors.resetCode ? 'true' : 'false'}
              {...register('resetCode', {
                required: 'Code is required',
              })}
            />
            {errors.resetCode && (
              <span role="alert" className="text-red-500 text-sm">
                {errors.resetCode.message}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              aria-invalid={errors.password ? 'true' : 'false'}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must have at least 8 characters',
                },
              })}
            />
            {errors.password && (
              <span role="alert" className="text-red-500 text-sm">
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              {...register('confirmPassword', {
                required: 'Password confirmation is required',
                validate: (value, values) =>
                  value === values.password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <span role="alert" className="text-red-500 text-sm">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Reset Password
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            Back
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
