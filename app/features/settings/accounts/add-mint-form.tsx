import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useAddCashuAccount } from '~/features/accounts/account-hooks';
import { cashuMintValidator } from '~/features/shared/cashu';
import { useCashuAuthStore } from '~/features/shared/cashu-auth';
import { useUser } from '~/features/user/user-hooks';
import useLocationData from '~/hooks/use-location';
import { useToast } from '~/hooks/use-toast';
import { getCashuProtocolUnit } from '~/lib/cashu';
import type { Currency } from '~/lib/money';

type FormValues = {
  name: string;
  currency: Currency;
  mintUrl: string;
};

const currencies = [
  { value: 'BTC', label: 'BTC' },
  { value: 'USD', label: 'USD' },
];

const _validateMint = async (
  value: string,
  formValues: FormValues,
): Promise<string | true> => {
  const unit = getCashuProtocolUnit(formValues.currency);
  return cashuMintValidator(value, unit);
};

export function AddMintForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const addAccount = useAddCashuAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const defaultCurrency = useUser((u) => u.defaultCurrency);
  const { origin } = useLocationData();
  const { checkAuthRequired } = useCashuAuthStore();
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: {
      currency: defaultCurrency,
    },
  });

  // Auto-submit if URL parameters are present (after OIDC callback)
  useEffect(() => {
    const name = searchParams.get('name');
    const currency = searchParams.get('currency') as Currency;
    const mintUrl = searchParams.get('mintUrl');

    if (name && currency && mintUrl) {
      // Set form values from URL parameters
      setValue('name', name);
      setValue('currency', currency);
      setValue('mintUrl', mintUrl);

      // Clear URL parameters
      setSearchParams({});

      // Auto-submit the form
      const submitForm = async () => {
        try {
          await addAccount({
            name,
            currency,
            mintUrl,
            type: 'cashu',
          });

          toast({
            title: 'Success',
            description: 'Account added successfully',
          });
          navigate('/settings/accounts');
        } catch (e) {
          const message =
            e instanceof Error
              ? e.message
              : 'Unknown error. Failed to add account.';
          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          });
        }
      };

      submitForm();
    }
  }, [searchParams, setValue, setSearchParams, addAccount, toast, navigate]);

  const onSubmit = async (data: FormValues) => {
     // Encode form data in the return URL
     const params = new URLSearchParams({
      name: data.name,
      currency: data.currency,
      mintUrl: data.mintUrl,
    });
    const returnToUrl = `/settings/accounts/create/cashu?${params.toString()}`;

    // Store return URL temporarily in sessionStorage
    sessionStorage.setItem('oidc_return_to', returnToUrl);
    
    try {
      // Check if mint requires NUT-21 authentication
      const authResult = await checkAuthRequired(data.mintUrl);
      console.log('authResult', authResult);

      //  TODO: checkAuthRequired already starts auth, but we should be able to do it here.
      if (authResult.requiresClearAuth) {
        const _redirectUri = `${origin}/oidc-callback`;

        // This will redirect the user to login with the mint, then to /oidc-callback, and finally back here
        // await startAuth(data.mintUrl, redirectUri);
        return;
      }

      // Clear return to url if not doing oidc flow
      sessionStorage.removeItem('oidc_return_to');

      // No authentication required or already authenticated
      await addAccount({
        name: data.name,
        currency: data.currency,
        mintUrl: data.mintUrl,
        type: 'cashu',
      });

      toast({
        title: 'Success',
        description: 'Account added successfully',
      });
      navigate('/settings/accounts');
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Unknown error. Failed to add account.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const currency = getValues('currency');
  const unit = getCashuProtocolUnit(currency);

  return (
    <form
      className="mb-5 flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          aria-invalid={errors.name ? 'true' : 'false'}
          {...register('name', {
            required: 'Name is required',
          })}
        />
        {errors.name && (
          <span
            id="nameError"
            role="alert"
            aria-labelledby="nameError"
            className="text-red-500 text-sm"
          >
            {errors.name.message}
          </span>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="currency">Currency</Label>
        <Controller
          control={control}
          name="currency"
          rules={{ required: 'Currency is required' }}
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              value={field.value}
              name={field.name}
            >
              <SelectTrigger
                id="currency"
                aria-invalid={errors.currency ? 'true' : 'false'}
              >
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.currency && (
          <span
            id="currencyError"
            role="alert"
            aria-labelledby="currencyError"
            className="text-red-500 text-sm"
          >
            {errors.currency.message}
          </span>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mintUrl">Mint URL</Label>
        <Input
          id="mintUrl"
          type="url"
          placeholder="Mint URL (https://...)"
          {...register('mintUrl', {
            required: 'Mint URL is required',
            // validate: validateMint,
          })}
        />
        {errors.mintUrl && (
          <span
            id="mintUrlError"
            role="alert"
            aria-labelledby="mintUrlError"
            className="text-red-500 text-sm"
          >
            {errors.mintUrl.message}
          </span>
        )}
        <p className="text-muted-foreground text-sm">
          Search at{' '}
          <a
            className="underline"
            href={`https://bitcoinmints.com?show=cashu&units=${unit}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            bitcoinmints.com
          </a>
          . Understand mint{' '}
          {/* TODO: mint risks page doesn't exsit currently */}
          <Link className="underline" to="/mintrisks">
            risks
          </Link>
          .
        </p>
      </div>

      <Button type="submit" className="self-end" loading={isSubmitting}>
        Add
      </Button>
    </form>
  );
}
