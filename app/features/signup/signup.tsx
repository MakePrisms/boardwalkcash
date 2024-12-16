import { useState } from 'react';
import { SignupOptions } from '~/features/signup/signup-options';
import { SignupForm } from '~/features/signup/singup-form';
import { useAuthActions } from '~/features/user/auth';
import { toast } from '~/hooks/use-toast';

type SignupStep = 'pick-option' | 'signup-with-email';

export function Signup() {
  const [step, setStep] = useState<SignupStep>('pick-option');
  const { signUpGuest } = useAuthActions();

  const handleGuestAccountSelected = async () => {
    try {
      await signUpGuest();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error! Signup failed',
        description: 'Please try again later or contact support',
      });
    }
  };

  if (step === 'pick-option') {
    return (
      <SignupOptions
        onSelect={async (option) => {
          if (option === 'email') {
            setStep('signup-with-email');
          } else if (option === 'google') {
            alert('Not implemented yet.');
          } else {
            await handleGuestAccountSelected();
          }
        }}
      />
    );
  }

  return <SignupForm onBack={() => setStep('pick-option')} />;
}
