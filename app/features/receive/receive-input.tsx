import { getDecodedToken } from '@cashu/cashu-ts';
import { ArrowUpDown, Clipboard, QrCode, Scan } from 'lucide-react';
import { useState } from 'react';
import { create } from 'zustand';
import { MoneyDisplay, MoneyInputDisplay } from '~/components/money-display';
import { Numpad } from '~/components/numpad';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import {
  type Account,
  AccountSelector,
} from '~/features/accounts/account-selector';
import { type AppCurrency, useExchangeRate } from '~/hooks/use-exchange-rate';
import { useToast } from '~/hooks/use-toast';
import { type CurrencyUnit, Money } from '~/lib/money';
import { readClipboard } from '~/lib/read-clipboard';
import {
  LinkWithViewTransition,
  useNavigateWithViewTransition,
} from '~/lib/transitions';
import { accounts } from '~/routes/_protected._index';

const currencyToDefaultUnit: Record<AppCurrency, CurrencyUnit<AppCurrency>> = {
  BTC: 'sat',
  USD: 'usd',
};

const defaultAccount = accounts[0];
const defaultFiatCurrency: Exclude<AppCurrency, 'BTC'> = 'USD';

type ReceiveStore<T extends AppCurrency = AppCurrency> = {
  /** The account to receive funds in */
  account: Account;
  /** The amount to receive in the account's currency */
  amount: Money<T> | null;
  /** Set the account to receive funds in */
  setAccount: (account: Account) => void;
  /** Set the amount to receive in the account's currency */
  setAmount: (amount: Money<T>) => void;
};

const receiveStore = create<ReceiveStore>((set) => ({
  account: defaultAccount,
  amount: null,
  setAccount: (account) =>
    set({ account, amount: Money.zero(account.currency) }),
  setAmount: (amount) => set({ amount }),
}));

type InputState = {
  value: string;
  money: Money<AppCurrency>;
};

export default function ReceiveInput() {
  const { account, setAccount, setAmount } = receiveStore();

  const [inputState, setInputState] = useState<InputState>({
    value: '0',
    money: Money.zero(account.currency),
  });

  const resetInputState = (currency: AppCurrency) => {
    setInputState({
      value: '0',
      money: Money.zero(currency),
    });
  };

  const { toast } = useToast();
  const navigateWithViewTransition = useNavigateWithViewTransition();
  const rates = useExchangeRate();

  const handleContinue = async () => {
    const amountToReceive = inputState.money.convert(
      account.currency,
      rates.getRate(inputState.money.currency, account.currency),
    );
    setAmount(amountToReceive);

    // use receiveAmount
    // depending on the account type:
    // cashu - show cashu request and bolt11
    // nwc - show bolt11
    console.log(
      amountToReceive.toLocaleString({
        unit: currencyToDefaultUnit[account.currency],
      }),
    );
  };

  const handlePaste = async () => {
    const clipboardContent = await readClipboard();
    if (!clipboardContent) {
      return;
    }
    try {
      // This will throw if the token is invalid
      getDecodedToken(clipboardContent);
      navigateWithViewTransition(`/receive/cashu-token#${clipboardContent}`, {
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

  const getOtherMoney = () => {
    const otherCurrency =
      inputState.money.currency === 'BTC' ? defaultFiatCurrency : 'BTC';

    const convertedMoney = inputState.money.convert(
      otherCurrency,
      rates.getRate(inputState.money.currency, otherCurrency),
    );

    return {
      money: convertedMoney,
      unit: currencyToDefaultUnit[otherCurrency],
    };
  };

  return (
    <>
      <PageHeader>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Receive</PageHeaderTitle>
      </PageHeader>
      <PageContent className="mx-auto flex flex-col items-center justify-between sm:justify-around">
        <div className="flex flex-col items-center gap-2">
          <MoneyInputDisplay
            inputValue={inputState.value}
            currency={inputState.money.currency}
            unit={inputState.money.currency === 'BTC' ? 'sat' : 'usd'}
          />
          <button
            type="button"
            className="flex items-center gap-2 text-muted-foreground"
            onClick={() =>
              resetInputState(
                inputState.money.currency === 'BTC' ? 'USD' : 'BTC',
              )
            }
          >
            <MoneyDisplay {...getOtherMoney()} size="sm" />
            <ArrowUpDown />
          </button>
        </div>
        <div className="w-full max-w-sm sm:max-w-none">
          <AccountSelector
            accounts={accounts}
            onSelect={(account) => {
              setAccount(account);
              resetInputState(account.currency);
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
                to="/receive/request"
                transition="slideUp"
                applyTo="newView"
              >
                <QrCode />
              </LinkWithViewTransition>
            </div>
            <div className="flex items-center justify-center" />
            <div className="flex items-center justify-end">
              <Button onClick={handleContinue}>Continue</Button>
            </div>
          </div>

          <Numpad
            value={inputState.value}
            onValueChange={(value) =>
              setInputState((prev) => ({
                money: new Money({
                  amount: value,
                  currency: prev.money.currency,
                  unit: currencyToDefaultUnit[prev.money.currency],
                }),
                value,
              }))
            }
            maxDecimals={inputState.money.getMaxDecimals(
              currencyToDefaultUnit[inputState.money.currency],
            )}
            onInvalidInput={() => {
              toast({
                title: 'Invalid input',
                description:
                  'We should do something like shake the screen instead of toast',
                variant: 'destructive',
              });
            }}
          />
        </div>
      </PageContent>
    </>
  );
}
