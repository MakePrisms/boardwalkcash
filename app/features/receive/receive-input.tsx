import { getDecodedToken } from '@cashu/cashu-ts';
import { ArrowUpDown, Clipboard, QrCode, Scan } from 'lucide-react';
import { useState } from 'react';
import { MoneyDisplay, MoneyInputDisplay } from '~/components/money-display';
import { Numpad } from '~/components/numpad';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { AccountSelector } from '~/features/accounts/account-selector';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import { useToast } from '~/hooks/use-toast';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';
import { readClipboard } from '~/lib/read-clipboard';
import {
  LinkWithViewTransition,
  useNavigateWithViewTransition,
} from '~/lib/transitions';
import { accounts } from '~/routes/_protected._index';
import { useReceiveStore } from './receive-provider';

const currencyToDefaultUnit: Record<Currency, CurrencyUnit<Currency>> = {
  BTC: 'sat',
  USD: 'usd',
};

const defaultFiatCurrency: Exclude<Currency, 'BTC'> = 'USD';

type ConvertedMoneyToggleProps = {
  onToggleInputCurrency: () => void;
  moneyToConvert: Money;
  convertToCurrency: Currency;
  exchangeRate: string;
};

const ConvertedMoneyToggle = ({
  onToggleInputCurrency,
  moneyToConvert,
  convertToCurrency,
  exchangeRate,
}: ConvertedMoneyToggleProps) => {
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-muted-foreground"
      onClick={onToggleInputCurrency}
    >
      <MoneyDisplay
        money={moneyToConvert.convert(convertToCurrency, exchangeRate)}
        unit={currencyToDefaultUnit[convertToCurrency]}
        variant="secondary"
      />
      <ArrowUpDown className="mb-1" />
    </button>
  );
};

type InputState = {
  value: string;
  currency: Currency;
  unit: CurrencyUnit<Currency>;
  convertTo: Currency;
};

const defaultInputState = (currency: Currency) => ({
  value: '0',
  currency,
  unit: currencyToDefaultUnit[currency],
  convertTo: currency === 'BTC' ? defaultFiatCurrency : ('BTC' as Currency),
});

export default function ReceiveInput() {
  const navigate = useNavigateWithViewTransition();
  const { toast } = useToast();
  // shakes the money input when the input is invalid
  const [shake, setShake] = useState(false);

  const receiveAccount = useReceiveStore((s) => s.account);
  const receiveAmount = useReceiveStore((s) => s.amount);
  const setReceiveAccount = useReceiveStore((s) => s.setAccount);
  const setReceiveAmount = useReceiveStore((s) => s.setAmount);

  const [inputState, setInputState] = useState<InputState>({
    ...defaultInputState(receiveAccount.currency),
    value:
      receiveAmount?.toString(currencyToDefaultUnit[receiveAccount.currency]) ??
      '0',
  });
  const inputMoney = new Money({
    amount: inputState.value,
    currency: inputState.currency,
    unit: inputState.unit,
  });

  const exchangeRate = useExchangeRate(
    `${inputState.currency}-${inputState.convertTo}`,
  );

  const handleContinue = async () => {
    if (inputState.currency === receiveAccount.currency) {
      setReceiveAmount(inputMoney);
    } else {
      setReceiveAmount(
        inputMoney.convert(receiveAccount.currency, exchangeRate),
      );
    }
    if (receiveAccount.type === 'cashu') {
      navigate('/receive/cashu', {
        transition: 'slideLeft',
        applyTo: 'newView',
      });
    } else {
      toast({
        title: 'Not implemented',
        description: 'Choose a cashu account and try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePaste = async () => {
    const clipboardContent = await readClipboard();
    if (!clipboardContent) {
      return;
    }
    try {
      // This will throw if the token is invalid
      getDecodedToken(clipboardContent);
      navigate(`/receive/cashu-token#${clipboardContent}`, {
        transition: 'slideLeft',
        applyTo: 'newView',
      });
    } catch (error) {
      toast({
        title: 'Invalid token',
        description:
          error instanceof Error ? error.message : 'Failed to decode token',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <PageHeader>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Receive</PageHeaderTitle>
      </PageHeader>

      <PageContent className="mx-auto flex flex-col items-center justify-between sm:justify-around">
        <div className="flex flex-col items-center gap-2">
          <div className={`${shake ? 'animate-shake' : ''}`}>
            <MoneyInputDisplay
              inputValue={inputState.value}
              currency={inputState.currency}
              unit={inputState.unit}
            />
          </div>

          <ConvertedMoneyToggle
            onToggleInputCurrency={() => {
              // NOTE: still figuring out how to do this better. There is also an issue with the precision
              // of the conversion I need to fix.
              setInputState((prev) => {
                const newCurrency =
                  prev.currency === inputState.currency
                    ? inputState.convertTo
                    : prev.currency;
                const newUnit = currencyToDefaultUnit[newCurrency];
                const newValue = inputMoney
                  .convert(newCurrency, exchangeRate)
                  .toString(newUnit);
                const newConvertTo = newCurrency === 'BTC' ? 'USD' : 'BTC';

                return {
                  currency: newCurrency,
                  unit: newUnit,
                  value: newValue,
                  convertTo: newConvertTo,
                };
              });
            }}
            moneyToConvert={inputMoney}
            convertToCurrency={inputState.convertTo}
            exchangeRate={exchangeRate}
          />
        </div>

        <div className="w-full max-w-sm sm:max-w-none">
          <AccountSelector
            accounts={accounts}
            selectedAccount={receiveAccount}
            onSelect={(account) => {
              setReceiveAccount(account);
              setInputState(defaultInputState(account.currency));
            }}
          />
        </div>

        <div className="flex w-full flex-col items-center gap-4 sm:items-start sm:justify-between">
          <div className="grid w-full max-w-sm grid-cols-3 gap-4 sm:max-w-none">
            <div className="flex items-center justify-start gap-4">
              <button type="button" onClick={handlePaste}>
                <Clipboard />
              </button>

              <LinkWithViewTransition
                to="/receive/scan"
                transition="slideUp"
                applyTo="newView"
              >
                <Scan />
              </LinkWithViewTransition>

              <LinkWithViewTransition
                to={`/receive/request/${receiveAccount.id}`}
                transition="slideUp"
                applyTo="newView"
              >
                <QrCode />
              </LinkWithViewTransition>
            </div>
            <div /> {/* spacer */}
            <Button
              onClick={handleContinue}
              disabled={Number.parseFloat(inputState.value) === 0}
            >
              Continue
            </Button>
          </div>

          <Numpad
            showDecimal={inputMoney.getMaxDecimals(inputState.unit) > 0}
            onButtonClick={(button) => {
              // NOTE: still figuring out how to put this somewhere like a store or a hook
              const { value, unit } = inputState;
              const onInvalidInput = () => {
                setShake(true);
                setTimeout(() => setShake(false), 200);
              };
              const onValueChange = (newValue: string) => {
                setInputState((prev) => ({ ...prev, value: newValue }));
              };
              const maxDecimals = inputMoney.getMaxDecimals(unit);

              if (button === 'Backspace') {
                if (inputState.value === '0') {
                  return onInvalidInput();
                }

                const newValue = value.length === 1 ? '0' : value.slice(0, -1);
                return onValueChange(newValue);
              }

              const valueHasDecimal = value.includes('.');

              if (button === '.') {
                // Only add decimal if one doesn't exist yet
                return valueHasDecimal
                  ? onInvalidInput()
                  : onValueChange(`${value}.`);
              }

              const hasMaxDecimals =
                valueHasDecimal &&
                value.length - value.indexOf('.') > maxDecimals;
              if (hasMaxDecimals) {
                return onInvalidInput();
              }

              if (button === '0' && value === '0') {
                return onInvalidInput();
              }

              // replace 0 value with button value
              const newValue = value === '0' ? button : value + button;

              onValueChange(newValue);
            }}
          />
        </div>
      </PageContent>
    </>
  );
}
