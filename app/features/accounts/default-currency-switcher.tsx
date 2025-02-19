import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { useTheme } from '~/features/theme';
import { Money } from '~/lib/money';
import type { Currency } from '~/lib/money/types';
import { useUserStore } from '../user/user-provider';

type CurrencyOption = {
  label: string;
  currency: Currency;
};

const CURRENCY_OPTIONS: CurrencyOption[] = [
  {
    label: 'Bitcoin',
    currency: 'BTC',
  },
  {
    label: 'US Dollar',
    currency: 'USD',
  },
];

type CurrencyOptionProps = {
  data: CurrencyOption;
  isSelected: boolean;
  onSelect: (currency: Currency) => void;
};

function CurrencyOption({ data, isSelected, onSelect }: CurrencyOptionProps) {
  const { label, currency } = data;
  // TODO: see how we will handle balances
  // const otherCurrency = currency === 'BTC' ? 'USD' : 'BTC';
  const balance = new Money({
    amount: 0,
    currency,
  });
  const isRateLoading = false;
  const convertedBalance =
    currency === 'BTC'
      ? new Money({
          amount: 0,
          currency: 'USD',
        })
      : undefined;
  // const { data: rate, isLoading: isRateLoading } = useExchangeRate(
  //   `${currency}-${otherCurrency}`,
  // );
  // // we only show conversion for BTC to USD
  // const convertedBalance =
  //   currency === 'BTC' && rate ? balance.convert('USD', rate) : undefined;

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between"
      onClick={() => onSelect(currency)}
    >
      <div className="flex flex-col items-start gap-1">
        <span>{label}</span>
        {balance && (
          <span className="text-muted-foreground text-sm">
            {balance.toLocaleString({
              unit: currency === 'BTC' ? 'sat' : 'usd',
            })}
            {currency === 'BTC' &&
              (isRateLoading ? (
                <Skeleton className="h-4 w-4" />
              ) : (
                convertedBalance &&
                ` (~${convertedBalance.toLocaleString({ unit: 'usd' })})`
              ))}
          </span>
        )}
      </div>
      <RadioGroup value={isSelected ? currency : undefined}>
        <RadioGroupItem value={currency} />
      </RadioGroup>
    </button>
  );
}

/** A drawer that allows the user to switch their default currency */
export function DefaultCurrencySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { setTheme } = useTheme();
  const defaultCurrency = useUserStore((state) => state.user.defaultCurrency);
  const setDefaultCurrency = useUserStore((state) => state.setDefaultCurrency);

  const handleCurrencySelect = async (currency: Currency) => {
    await setDefaultCurrency(currency);
    setIsOpen(false);
    setTheme(currency.toLowerCase() as 'usd' | 'btc');
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <button type="button" className="flex items-center gap-1">
          {defaultCurrency}
          <ChevronDown className="h-4 w-4" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="font-primary">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Select Currency</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 p-4 pb-8">
            {CURRENCY_OPTIONS.map((option, index) => (
              <div key={option.label}>
                <CurrencyOption
                  data={option}
                  isSelected={defaultCurrency === option.currency}
                  onSelect={handleCurrencySelect}
                />
                {index < CURRENCY_OPTIONS.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
