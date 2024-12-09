import { useState } from 'react';
import { LoginForm } from '~/features/login/login-form';
import { LoginOptions } from '~/features/login/login-options';

type LoginStep = 'pick-option' | 'login-with-email';

export function Login() {
  const [step, setStep] = useState<LoginStep>('pick-option');

  if (step === 'pick-option') {
    return (
      <LoginOptions
        onSelect={(option) => {
          if (option === 'email') {
            setStep('login-with-email');
          } else {
            alert('Not implemented yet.');
          }
        }}
      />
    );
  }

  return <LoginForm onBack={() => setStep('pick-option')} />;
}
