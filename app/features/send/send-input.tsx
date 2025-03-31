import { ArrowUpDown, Clipboard, Gift, Scan, X } from 'lucide-react';
import { MoneyDisplay, MoneyInputDisplay } from '~/components/money-display';
import { Numpad } from '~/components/numpad';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useAccounts } from '~/features/accounts/account-hooks';
import { AccountSelector } from '~/features/accounts/account-selector';
import useAnimation from '~/hooks/use-animation';
import { useMoneyInput } from '~/hooks/use-money-input';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { readClipboard } from '~/lib/read-clipboard';
import {
  LinkWithViewTransition,
  useNavigateWithViewTransition,
} from '~/lib/transitions';
import { getDefaultUnit } from '../shared/currencies';
import { useSendStore } from './send-provider';

type ConvertedMoneySwitcherProps = {
  onSwitchInputCurrency: () => void;
  money?: Money;
};

const ConvertedMoneySwitcher = ({
  onSwitchInputCurrency,
  money,
}: ConvertedMoneySwitcherProps) => {
  if (!money) {
    return <Skeleton className="h-6 w-24" />;
  }

  return (
    <button
      type="button"
      className="flex items-center gap-1"
      onClick={() => {
        onSwitchInputCurrency();
      }}
    >
      <MoneyDisplay
        money={money}
        unit={getDefaultUnit(money.currency)}
        variant="secondary"
      />
      <ArrowUpDown className="mb-1" />
    </button>
  );
};

export function SendInput() {
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();
  const { animationClass: shakeAnimationClass, start: startShakeAnimation } =
    useAnimation({ name: 'shake' });
  const { data: accounts } = useAccounts();

  const sendAmount = useSendStore((s) => s.amount);
  const sendAccount = useSendStore((s) => s.account);
  const sendCurrencyUnit = getDefaultUnit(sendAccount.currency);
  const paymentRequest = useSendStore((s) => s.paymentRequest);
  const setSendAmount = useSendStore((s) => s.setAmount);
  const setSendAccount = useSendStore((s) => s.setAccount);
  const setPaymentRequest = useSendStore((s) => s.setPaymentRequest);
  const clearPaymentRequest = useSendStore((s) => s.clearPaymentRequest);
  const {
    rawInputValue,
    maxInputDecimals,
    inputValue,
    convertedValue,
    exchangeRateError,
    handleNumberInput,
    switchInputCurrency,
    setInputValue,
  } = useMoneyInput({
    initialRawInputValue: sendAmount?.toString(sendCurrencyUnit) || '0',
    initialInputCurrency: sendAccount.currency,
    initialOtherCurrency: sendAccount.currency === 'BTC' ? 'USD' : 'BTC',
  });

  const handleContinue = async () => {
    if (inputValue.currency === sendAccount.currency) {
      setSendAmount(inputValue);
    } else {
      if (!convertedValue) {
        // Can't happen because when there is no converted value, the toggle will not be shown so input currency and receive currency must be the same
        return;
      }
      setSendAmount(convertedValue);
    }
    if (sendAccount.type === 'cashu') {
      return navigate('/send/confirm', {
        applyTo: 'newView',
        transition: 'slideUp',
      });
    }
    toast({
      title: 'Not implemented',
      variant: 'destructive',
    });
  };

  // User can paste a bolt11 or cashu request
  const handlePaste = async () => {
    const input = await readClipboard();
    if (!input) {
      return;
    }

    const result = setPaymentRequest(input);
    if (!result.valid) {
      const { error } = result;
      return toast({
        title: 'Invalid input',
        description: error,
        variant: 'destructive',
      });
    }
    const { amount, unit, currency } = result;

    if (!amount && inputValue.isZero()) {
      // we enforce bolt11s to have an amount, but cashu requests don't need an amount
      // if the setPaymentRequest validation passes, that means the user just needs
      // to enter an amount then click continue. In the future bolt11s can be amountless
      // in cashu and other account types can handle amountless bolt11s
      return;
    }
    if (amount) {
      // NOTE: I had to make this return these value so that we could set the sendAmount
      // in this same function.The goal here is:
      // 1. to update the input value displayed to the user
      // 2. to handle conversion logic if the payment request is in a different currency than the send account
      const { newInputValue, newConvertedValue } = setInputValue(
        amount.toString(unit),
        currency,
      );

      if (currency === sendAccount.currency) {
        setSendAmount(newInputValue);
      } else {
        if (!newConvertedValue) {
          // this shouldn't happen as long as exchange rate is loaded
          return;
        }
        setSendAmount(newConvertedValue);
      }

      return navigate('/send/confirm', {
        applyTo: 'newView',
        transition: 'slideUp',
      });
    }

    // no amount, but input value not zero so we can continue after setting the payment request
    return handleContinue();
  };

  return (
    <>
      <PageHeader>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Send</PageHeaderTitle>
      </PageHeader>

      <PageContent className="mx-auto flex flex-col items-center justify-between sm:justify-around">
        <div className="flex h-[124px] flex-col items-center gap-2">
          <div className={shakeAnimationClass}>
            <MoneyInputDisplay
              inputValue={rawInputValue}
              currency={inputValue.currency}
              unit={getDefaultUnit(inputValue.currency)}
            />
          </div>

          {!exchangeRateError && (
            <ConvertedMoneySwitcher
              onSwitchInputCurrency={switchInputCurrency}
              money={convertedValue}
            />
          )}
        </div>

        <div className="flex h-[24px] items-center justify-center gap-4">
          {paymentRequest && (
            <>
              <p>
                {paymentRequest.raw.slice(0, 5)}...
                {paymentRequest.raw.slice(-5)}
              </p>
              <X
                className="h-4 w-4 cursor-pointer"
                onClick={() => clearPaymentRequest()}
              />
            </>
          )}
        </div>

        <div className="w-full max-w-sm sm:max-w-none">
          <AccountSelector
            accounts={accounts}
            selectedAccount={sendAccount}
            onSelect={(account) => {
              setSendAccount(account);
              if (account.currency !== inputValue.currency) {
                switchInputCurrency();
              }
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
                to="/send/scan"
                transition="slideUp"
                applyTo="newView"
              >
                <Scan />
              </LinkWithViewTransition>

              <button type="button">
                <Gift />
              </button>
            </div>
            {/* TODO: add a button to select a contact */}
            <div />

            <div className="flex items-center justify-end">
              <Button onClick={handleContinue} disabled={inputValue.isZero()}>
                Continue
              </Button>
            </div>
          </div>

          <Numpad
            showDecimal={maxInputDecimals > 0}
            onButtonClick={(value) => {
              handleNumberInput(value, startShakeAnimation);
            }}
          />
        </div>
      </PageContent>
    </>
  );
}
