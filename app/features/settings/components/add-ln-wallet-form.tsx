import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useToast } from '~/hooks/use-toast';

type FormValues = {
  nwcUri: string;
  lud16: string;
};

export function AddLightningWalletForm() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    watch,
    setValue,
  } = useForm<FormValues>();

  const nwcUri = watch('nwcUri');

  useEffect(() => {
    if (!nwcUri) return;
    try {
      // some NWC providers (ie getalby.com) include the user's lud16
      const url = new URL(nwcUri);
      const lud16 = url.searchParams.get('lud16');
      if (lud16) {
        setValue('lud16', lud16);
      }
    } catch {
      // Invalid URL, ignore
    }
  }, [nwcUri, setValue]);

  const onSubmit = async (data: FormValues) => {
    try {
      // TODO: Implement lightning wallet connection logic
      console.log('Connecting lightning wallet:', data);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error connecting wallet',
        description: 'Please try again later or contact support',
      });
    }
  };

  return (
    <form
      className="mb-5 flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="grid gap-2">
        <Label htmlFor="nwcUri">Nostr Wallet Connect</Label>
        <Input
          id="nwcUri"
          type="text"
          placeholder="Nostr Wallet Connect URI"
          {...register('nwcUri', {
            required: 'NWC URI is required',
          })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lud16">Lightning Address</Label>
        <Input
          id="lud16"
          type="text"
          placeholder="Lightning Address"
          {...register('lud16', {
            required: 'Lightning address is required',
          })}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="self-end"
        loading={isSubmitting}
      >
        Connect{' '}
      </Button>
    </form>
  );
}
