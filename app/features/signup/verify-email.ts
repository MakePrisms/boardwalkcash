import { useState } from 'react';
import { useToast } from '~/hooks/use-toast';
import { useRequestNewEmailVerificationCode } from '../user/user-hooks';

export const useRequestEmailVerificationCode = () => {
  const { toast } = useToast();
  const requestNewEmailVerificationCode = useRequestNewEmailVerificationCode();
  const [requestingEmailVerificationCode, setRequestingEmailVerificationCode] =
    useState<boolean>(false);

  const requestEmailVerificationCode = async () => {
    if (requestingEmailVerificationCode) return;

    try {
      setRequestingEmailVerificationCode(true);
      await requestNewEmailVerificationCode();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to send new verification email',
        description: 'Please try again or contact support',
      });
    } finally {
      setRequestingEmailVerificationCode(false);
    }
  };

  return {
    requestingEmailVerificationCode,
    requestEmailVerificationCode,
  };
};
