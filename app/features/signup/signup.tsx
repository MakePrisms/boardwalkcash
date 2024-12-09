import { useOpenSecret } from '@opensecret/react';
import { useState } from 'react';
import { SignupOptions } from '~/features/signup/signup-options';
import { SignupForm } from '~/features/signup/singup-form';
import { toast } from '~/hooks/use-toast';
import { generateRandomPassword } from '~/lib/password-generator';

type SignupStep = 'pick-option' | 'signup-with-email';

export function Signup() {
  const [step, setStep] = useState<SignupStep>('pick-option');
  const { signUpGuest, signInGuest } = useOpenSecret();

  const getExistingGuestAccount = () => {
    const id = localStorage.getItem('guestAccount.id');
    const password = localStorage.getItem('guestAccount.password');
    return id && password ? { id, password } : null;
  };

  const createNewGuestAccount = async () => {
    try {
      const password = generateRandomPassword(32);
      localStorage.setItem('guestAccount.password', password);
      const guestAccount = await signUpGuest(password, '');
      localStorage.setItem('guestAccount.id', guestAccount.id);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error! Signup failed',
        description: 'Please try again later or contact support',
      });
    }
  };

  const loginToExistingGuestAccount = async ({
    id,
    password,
  }: { id: string; password: string }) => {
    try {
      await signInGuest(id, password);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error! Signup failed',
        description: 'Please try again later or contact support',
      });
    }
  };

  const handleGuestAccountSelected = () => {
    const guestAccount = getExistingGuestAccount();
    return guestAccount
      ? loginToExistingGuestAccount(guestAccount)
      : createNewGuestAccount();
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
