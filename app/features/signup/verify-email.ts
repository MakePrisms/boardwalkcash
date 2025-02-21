import { useEffect, useRef, useState } from 'react';
import { useUserActions } from '~/features/user/user-hooks';
import { useToast } from '~/hooks/use-toast';

export const useVerifyEmailOnLoad = ({
  code,
  onFailed,
}: {
  code: string | undefined;
  onFailed: () => void;
}) => {
  const { verifyEmail } = useUserActions();
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
  const { toast } = useToast();
  const { requestNewEmailVerificationCode } = useUserActions();
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
