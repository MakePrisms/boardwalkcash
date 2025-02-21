import { useEffect, useRef, useState } from 'react';
import { useToast } from '~/hooks/use-toast';
import {
  useRrequestNewEmailVerificationCode,
  useVerifyEmail,
} from '../user/user-hooks';

export const useVerifyEmailOnLoad = ({
  code,
  onFailed,
}: {
  code: string | undefined;
  onFailed: () => void;
}) => {
  const verifyEmail = useVerifyEmail();
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
  const requestNewEmailVerificationCode = useRrequestNewEmailVerificationCode();
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
