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
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import { Money } from '~/lib/money';
import type { Currency } from '~/lib/money/types';

type CurrencyOption = {
  label: string;
  /** Total balance of all accounts for this currency */
  balance: Money;
  /**
   * Whether this is an option the user can select.
   * Would be false if the user has not accounts for this currency
   */
  isAvailable: boolean;
};

// placeholder data that should be replaced with user's account data
const CURRENCY_OPTIONS: CurrencyOption[] = [
  {
    label: 'Bitcoin',
    balance: new Money({
      amount: 1500,
      currency: 'BTC' as Currency,
      unit: 'sat',
    }),
    isAvailable: true,
  },
  {
    label: 'US Dollar',
    balance: new Money({
      amount: 15,
      currency: 'USD' as Currency,
      unit: 'usd',
    }),
    isAvailable: true,
  },
];

type CurrencyOptionProps = {
  data: CurrencyOption;
  isSelected: boolean;
  onSelect: (currency: Currency) => void;
};

function CurrencyOption({ data, isSelected, onSelect }: CurrencyOptionProps) {
  const { label, balance, isAvailable } = data;
  const currency = balance.currency;
  const otherCurrency = currency === 'BTC' ? 'USD' : 'BTC';
  const { data: rate, isLoading: isRateLoading } = useExchangeRate(
    `${currency}-${otherCurrency}`,
  );
  // we only show conversion for BTC to USD
  const convertedBalance =
    currency === 'BTC' && rate ? balance.convert('USD', rate) : undefined;

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between"
      disabled={!isAvailable}
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
  const { setTheme, theme } = useTheme();
  // TODO: this should come from user settings and toggling should probably change that setting
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    theme.toUpperCase() as Currency,
  );

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
    setIsOpen(false);
    setTheme(currency.toLowerCase() as 'usd' | 'btc');
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <button type="button" className="flex items-center gap-1">
          {selectedCurrency}
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
                  isSelected={selectedCurrency === option.balance.currency}
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
