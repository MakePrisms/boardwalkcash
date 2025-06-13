import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { useGetCashuTokenFromUrlHash } from '~/hooks/use-get-cashu-token-from-url-hash';

type Option = 'email' | 'google';
type Props = { onSelect: (option: Option) => Promise<void> };

export function LoginOptions({ onSelect }: Props) {
  const [submitting, setSubmitting] = useState<Option | null>(null);
  const { withTokenHash } = useGetCashuTokenFromUrlHash();
  const handeSelect = async (option: Option) => {
    if (submitting) return;

    try {
      setSubmitting(option);
      await onSelect(option);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Choose your preferred login method</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <Button
            onClick={() => handeSelect('email')}
            loading={submitting === 'email'}
          >
            Log in with Email
          </Button>
          <Button
            onClick={() => handeSelect('google')}
            loading={submitting === 'google'}
          >
            Log in with Google
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link to={withTokenHash('/signup')} className="underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
