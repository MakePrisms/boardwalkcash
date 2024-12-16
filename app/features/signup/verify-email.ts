import { useEffect, useRef, useState } from 'react';
import { useUserStore } from '~/features/user/user-provider';
import { useToast } from '~/hooks/use-toast';

export const useVerifyEmailOnLoad = (
  code: string | undefined,
  onFailed: () => void,
) => {
  const verifyEmail = useUserStore((state) => state.verifyEmail);
  const { toast } = useToast();
  const failedRef = useRef(onFailed);

  useEffect(() => {
    if (code) {
      const handleVerificationCode = async () => {
        try {
          await verifyEmail(code);
        } catch {
          toast({
            variant: 'destructive',
            title: 'Failed to verify',
            description:
              'Please try entering the code manually or request another verification email',
          });
          failedRef.current();
        }
      };
      handleVerificationCode();
    }
  }, [code, verifyEmail, toast]);
};

export const useRequestEmailVerificationCode = () => {
  const [requestingEmailVerificationCode, setRequestingEmailVerificationCode] =
    useState<boolean>(false);
  const requestNewEmailVerificationCode = useUserStore(
    (state) => state.requestNewEmailVerificationCode,
  );
  const { toast } = useToast();

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
