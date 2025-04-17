import { CashuMint } from '@cashu/cashu-ts';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
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
import { useToast } from '~/hooks/use-toast';
import { getCashuWallet } from '~/lib/cashu';
import type { Currency } from '~/lib/money';

type FormValues = {
  name: string;
  currency: Currency;
  mintUrl: string;
};

const currencies = [
  { value: 'BTC', label: 'BTC', unit: 'sat' },
  { value: 'USD', label: 'USD', unit: 'usd' },
];

const getCurrencyUnit = (currency: Currency) => {
  return currencies.find((x) => x.value === currency)?.unit;
};

const getUnitsSupportedByMint = async (
  mintUrl: string,
): Promise<string[] | null> => {
  try {
    const mint = new CashuMint(mintUrl);
    const { keysets } = await mint.getKeySets();
    const activeUnits = keysets.filter((x) => x.active).map((x) => x.unit);
    const distinctActiveUnits = [...new Set(activeUnits)];
    return distinctActiveUnits;
  } catch {
    return null;
  }
};

/**
 * We require that the mint supports the following features:
 * - NUT-4: Minting via Lightning (bolt11)
 * - NUT-5: Melting via Lightning (bolt11)
 * - NUT-7: Token state checks
 * - NUT-8: Overpaid Lightning fees
 * - NUT-9: Signature restoration
 * - NUT-10: Spending conditions
 * - NUT-11: P2PK
 * - NUT-12: DLEQ proofs
 * - NUT-17: WebSockets with commands: bolt11_melt_quote
 * - NUT-20: Signed mint quotes
 */
const validateMintFeatures = async (
  mintUrl: string,
  unit: string,
): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const wallet = getCashuWallet(mintUrl);
    const info = await wallet.getMintInfo();

    // Check if minting (NUT-4) is enabled
    const mintStatus = info.isSupported(4);
    if (mintStatus.disabled) {
      return {
        isValid: false,
        message: 'Mint does not support minting operations',
      };
    }

    // And minting supports bolt11 for the selected unit
    const hasBolt11Minting = mintStatus.params.some(
      (method) => method.method === 'bolt11' && method.unit === unit,
    );

    if (!hasBolt11Minting) {
      return {
        isValid: false,
        message: `Mint does not support Lightning (bolt11) minting for ${unit}`,
      };
    }

    // Check if melting (NUT-5) is enabled
    const meltStatus = info.isSupported(5);
    if (meltStatus.disabled) {
      return {
        isValid: false,
        message: 'Mint does not support melting operations',
      };
    }

    // And melting supports bolt11 for the selected unit
    const hasBolt11Melting = meltStatus.params.some(
      (method) => method.method === 'bolt11' && method.unit === unit,
    );

    if (!hasBolt11Melting) {
      return {
        isValid: false,
        message: `Mint does not support Lightning (bolt11) melting for ${unit}`,
      };
    }

    // Check other required NUTs
    const requiredNutChecks: {
      id: 7 | 8 | 9 | 10 | 11 | 12 | 20;
      name: string;
    }[] = [
      { id: 7, name: 'token state checks' },
      { id: 8, name: 'overpaid lightning fees' },
      { id: 9, name: 'signature restoration' },
      { id: 10, name: 'spending conditions' },
      { id: 11, name: 'P2PK' },
      { id: 12, name: 'DLEQ proofs' },
      { id: 20, name: 'signed mint quotes' },
    ];

    for (const { id, name } of requiredNutChecks) {
      const status = info.isSupported(id);
      if (!status.supported) {
        return {
          isValid: false,
          message: `Mint does not support ${name} (NUT-${id})`,
        };
      }
    }

    const nut17Status = info.isSupported(17);
    if (!nut17Status.supported) {
      return {
        isValid: false,
        message: 'Mint does not support WebSockets (NUT-17)',
      };
    }

    // Check if NUT-17 supports the required bolt11 commands for the selected unit
    const requiredCommands = ['bolt11_melt_quote'];

    const hasBolt11WebSocketSupport = nut17Status.params?.some(
      (support) =>
        support.method === 'bolt11' &&
        support.unit === unit &&
        requiredCommands.every((cmd) => support.commands.includes(cmd)),
    );

    if (!hasBolt11WebSocketSupport) {
      return {
        isValid: false,
        message: `Mint does not support required WebSocket commands for ${unit} via bolt11`,
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      message: 'Failed to connect to mint or validate features',
    };
  }
};

const validateMint = async (
  value: string,
  formValues: FormValues,
): Promise<string | true> => {
  if (!/^https?:\/\/.+/.test(value)) {
    return 'Must be a valid URL starting with http(s)://';
  }

  const selectedUnit = getCurrencyUnit(formValues.currency);
  if (!selectedUnit) {
    return true;
  }

  const units = await getUnitsSupportedByMint(value);

  if (!units) {
    return 'Failed to connect to mint. Please make sure the URL is correct or try again.';
  }

  if (!units.includes(selectedUnit)) {
    return 'Mint does not support this currency';
  }

  const featuresResult = await validateMintFeatures(value, selectedUnit);
  if (!featuresResult.isValid) {
    return featuresResult.message || 'Mint does not support required features';
  }

  return true;
};

export function AddMintForm() {
  const addAccount = useAddCashuAccount();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();
  const navigate = useNavigate();

  const onSubmit = async (data: FormValues) => {
    try {
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
  const unit = currency === 'BTC' ? 'sat' : currency;

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
            validate: validateMint,
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

      <Button type="submit" disabled={isSubmitting} className="self-end">
        Add
      </Button>
    </form>
  );
}
