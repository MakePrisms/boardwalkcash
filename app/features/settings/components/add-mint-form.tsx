import { Link } from '@remix-run/react';
import { useForm } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

type FormValues = {
  mintUrl: string;
};

export function AddMintForm({ unit }: { unit: string }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    try {
      // TODO: Implement mint adding logic
      console.log('Adding mint:', data.mintUrl);
    } catch {
      // TODO
    }
  };

  return (
    <form
      className="mb-5 flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="grid gap-2">
        <Label htmlFor="mintUrl">Mint URL</Label>
        <Input
          id="mintUrl"
          type="url"
          placeholder="Mint URL (https://...)"
          {...register('mintUrl', {
            required: 'Mint URL is required',
            pattern: {
              value: /^https?:\/\/.+/,
              message: 'Must be a valid URL starting with http(s)://',
            },
          })}
        />
        <p className="text-muted-foreground text-sm">
          Search at{' '}
          <a
            className="text-primary underline hover:text-primary/90"
            href={`https://bitcoinmints.com?show=cashu&units=${unit}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            bitcoinmints.com
          </a>
          . Understand mint{' '}
          <Link
            className="text-primary underline hover:text-primary/90"
            to="/mintrisks"
          >
            risks
          </Link>
          .
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-end">
        Add
      </Button>
    </form>
  );
}
