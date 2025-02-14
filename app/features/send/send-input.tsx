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
import { AccountSelector } from '~/features/accounts/account-selector';
import useAnimation from '~/hooks/use-animation';
import { useMoneyInput } from '~/hooks/use-money-input';
import { useToast } from '~/hooks/use-toast';
import { type Currency, Money } from '~/lib/money';
import { readClipboard } from '~/lib/read-clipboard';
import {
  LinkWithViewTransition,
  useNavigateWithViewTransition,
} from '~/lib/transitions';
import { useAccounts } from '../accounts/use-accounts';
import { getDefaultUnit } from '../shared/currencies';
import { useSendStore } from './send-provider';
import { TextInputDrawer } from './text-input-drawer';

const toMoney = (amount: number | string, currency: Currency): Money => {
  return new Money({
    amount,
    currency,
    unit: getDefaultUnit(currency),
  });
};

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
  const {
    rawInputValue,
    maxInputDecimals,
    inputValue,
    convertedValue,
    exchangeRateError,
    handleNumberInput,
    switchInputCurrency,
    setInputValueAndCurrency,
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

  const handlePaste = async () => {
    const input = await readClipboard();
    if (!input) {
      return;
    }
    // this decode the payment request and add to the store if valid, otherwise return an error
    const result = setPaymentRequest(input);
    if (result.decoded) {
      const { amount, unit } = result.decoded;
      const currency = unit === 'cent' ? 'USD' : 'BTC';
      if (!amount && inputValue.isZero()) {
        // we enforce bolt11s to have an amount, but cashu requests don't need an amount
        // if the setPaymentRequest validation passes, that means the user just needs
        // to enter an amount then click continue. In the future bolt11s can be amountless
        // in cashu
        switchInputCurrency(currency);
        return;
      }
      if (amount) {
        // we got the amount from the payment request

        // set the input to match the request
        const { input: newInput, converted: newConverted } =
          setInputValueAndCurrency(
            amount.toString(unit === 'cent' ? 'usd' : unit),
            amount.currency,
          );

        if (!newConverted.value) {
          // this shouldn't happen as long as exchange rate is loaded
          return;
        }

        // set sentAmount to the value matching the sendAccount currency
        if (newInput.currency === sendAccount.currency) {
          setSendAmount(toMoney(newInput.value, newInput.currency));
        } else {
          if (Number(newConverted.value) === 0) {
            // this happens when the request is in BTC and less than 1 cent
            // ie. converter 5 sats to USD and you get 0
            return toast({
              title: `Try to send from a ${newInput.currency} account`,
              description: `Converting ${amount.toLocaleString({ unit })} to ${newConverted.currency} results in 0`,
              variant: 'destructive',
            });
          }
          setSendAmount(toMoney(newConverted.value, newConverted.currency));
        }
        return navigate('/send/confirm', {
          applyTo: 'newView',
          transition: 'slideLeft',
        });
      }
      // no amount, but input value not zero so we can continue
      return handleContinue();
    }

    // we got an error from the payment request
    const { type, error } = result;
    return toast({
      title:
        type === null
          ? 'Invalid input'
          : type === 'bolt11'
            ? 'Invalid invoice'
            : 'Invalid payment request',
      description: error,
      variant: 'destructive',
    });
  };

  const handleTextInputSubmit = (text: string) => {
    // TODO: handle lightning address or contact input
    console.log(text);
    toast({
      title: 'Not implemented',
      variant: 'destructive',
    });
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
                onClick={() => setPaymentRequest(null)}
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
                to="/receive/scan"
                transition="slideUp"
                applyTo="newView"
              >
                <Scan />
              </LinkWithViewTransition>

              <TextInputDrawer onSubmit={handleTextInputSubmit} />
              <button type="button">
                <Gift />
              </button>
            </div>

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
