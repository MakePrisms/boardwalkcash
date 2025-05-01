import { CashuMint } from '@cashu/cashu-ts';
import type { WebSocketSupport } from '@cashu/cashu-ts';
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
import type { MintInfo } from '~/lib/cashu/types';
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

type NutValidationResult =
  | { isValid: false; message: string }
  | { isValid: true };

type NutValidation = {
  nut: number;
  validate: (info: MintInfo, unit: string) => NutValidationResult;
};

const validateBolt11Support = (
  info: MintInfo,
  operation: 'minting' | 'melting',
  unit: string,
): NutValidationResult => {
  const nut = operation === 'minting' ? 4 : 5;
  const status = info.isSupported(nut);

  if (status.disabled) {
    return {
      isValid: false,
      message: `${operation} is disabled on this mint`,
    };
  }

  const hasBolt11Support = status.params.some(
    (method) => method.method === 'bolt11' && method.unit === unit,
  );

  if (!hasBolt11Support) {
    return {
      isValid: false,
      message: `Mint does not support Lightning (bolt11) ${operation} for ${unit}`,
    };
  }

  return { isValid: true };
};

const validateGenericNut = (
  info: MintInfo,
  nut: 7 | 8 | 9 | 10 | 11 | 12 | 20,
  message: string,
): NutValidationResult => {
  const status = info.isSupported(nut);
  if (!status.supported) {
    return {
      isValid: false,
      message,
    };
  }
  return { isValid: true };
};

const nutValidations: NutValidation[] = [
  {
    nut: 4,
    validate: (info, unit) => validateBolt11Support(info, 'minting', unit),
  },
  {
    nut: 5,
    validate: (info, unit) => validateBolt11Support(info, 'melting', unit),
  },
  {
    nut: 7,
    validate: (info) =>
      validateGenericNut(
        info,
        7,
        'Mint does not support token state checks (NUT-7)',
      ),
  },
  {
    nut: 8,
    validate: (info) =>
      validateGenericNut(
        info,
        8,
        'Mint does not support overpaid lightning fees (NUT-8)',
      ),
  },
  {
    nut: 9,
    validate: (info) =>
      validateGenericNut(
        info,
        9,
        'Mint does not support signature restoration (NUT-9)',
      ),
  },
  {
    nut: 10,
    validate: (info) =>
      validateGenericNut(
        info,
        10,
        'Mint does not support spending conditions (NUT-10)',
      ),
  },
  {
    nut: 11,
    validate: (info) =>
      validateGenericNut(info, 11, 'Mint does not support P2PK (NUT-11)'),
  },
  {
    nut: 12,
    validate: (info) =>
      validateGenericNut(
        info,
        12,
        'Mint does not support DLEQ proofs (NUT-12)',
      ),
  },
  {
    nut: 17,
    validate: (info, unit) => {
      const status = info.isSupported(17);
      if (!status.supported) {
        return {
          isValid: false,
          message: 'Mint does not support WebSockets (NUT-17)',
        };
      }

      const requiredCommands = ['bolt11_melt_quote'];
      const hasBolt11WebSocketSupport = status.params?.some(
        (support: WebSocketSupport) =>
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
    },
  },
  {
    nut: 20,
    validate: (info) =>
      validateGenericNut(
        info,
        20,
        'Mint does not support signed mint quotes (NUT-20)',
      ),
  },
];

const validateMintFeatures = async (
  mintUrl: string,
  unit: string,
): Promise<NutValidationResult> => {
  try {
    const wallet = getCashuWallet(mintUrl);
    const info = await wallet.getMintInfo();

    for (const validation of nutValidations) {
      const result = validation.validate(info, unit);
      if (!result.isValid) {
        return result;
      }
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
    return featuresResult.message;
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
