import { decodePaymentRequest } from '@cashu/cashu-ts';
import { ArrowUpDown, Clipboard, Gift, Scan } from 'lucide-react';
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
import { decodeBolt11 } from '~/lib/bolt11';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';
import { readClipboard } from '~/lib/read-clipboard';
import { LinkWithViewTransition } from '~/lib/transitions';
import { accounts } from '~/routes/_protected._index';
import { useSendStore } from './send-provider';
import { TextInputDrawer } from './text-input-drawer';

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
      className="flex items-center gap-2 text-muted-foreground"
      onClick={onToggleInputCurrency}
    >
      <MoneyDisplay
        money={moneyToConvert.convert(convertToCurrency, exchangeRate)}
        unit={currencyToDefaultUnit[convertToCurrency]}
        size="sm"
      />
      <ArrowUpDown />
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

export default function SendInput() {
  const { toast } = useToast();

  const sendAccount = useSendStore((s) => s.account);
  const setSendAccount = useSendStore((s) => s.setAccount);
  const setSendAmount = useSendStore((s) => s.setAmount);

  const [inputState, setInputState] = useState<InputState>(
    defaultInputState(sendAccount.currency),
  );
  const inputMoney = new Money({
    amount: inputState.value,
    currency: inputState.currency,
    unit: inputState.unit,
  });

  const exchangeRate = useExchangeRate(
    `${inputState.currency}-${inputState.convertTo}`,
  );

  const handleContinue = async () => {
    if (inputState.currency === sendAccount.currency) {
      setSendAmount(inputMoney);
    } else {
      setSendAmount(inputMoney.convert(sendAccount.currency, exchangeRate));
    }
    if (sendAccount.type === 'cashu') {
      // TODO: navigate to send cashu with the amount and sendAccount
    }
    toast({
      title: 'Not implemented',
      variant: 'destructive',
    });
  };

  const handlePaste = async () => {
    const clipboardContent = await readClipboard();
    if (!clipboardContent) {
      return;
    }

    if (clipboardContent.replace(/^lightning:/, '').startsWith('ln')) {
      const { network } = decodeBolt11(clipboardContent);
      if (network !== 'bitcoin') {
        toast({
          title: `Unsupported network: ${network}`,
          description: 'Only Bitcoin mainnet is supported',
          variant: 'destructive',
        });
        return;
      }
      // TODO: navigate to send page with lightning invoice
    } else if (clipboardContent.startsWith('creq')) {
      const cashuRequest = decodePaymentRequest(clipboardContent);
      if (!cashuRequest.amount) {
        toast({
          title: 'Enter an amount',
          variant: 'default',
        });
        return;
      }
      // TODO: navigate to send page with cashu request
    } else {
      toast({
        title: 'Invalid input',
        description:
          'You can only paste Lightning invoices and Cashu payment requests.',
        variant: 'destructive',
      });
    }
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
        <div className="flex flex-col items-center gap-2">
          <MoneyInputDisplay
            inputValue={inputState.value}
            currency={inputState.currency}
            unit={inputState.unit}
          />

          <ConvertedMoneyToggle
            onToggleInputCurrency={() => {
              setInputState(defaultInputState(inputState.convertTo));
            }}
            moneyToConvert={inputMoney}
            convertToCurrency={inputState.convertTo}
            exchangeRate={exchangeRate}
          />
        </div>

        <div className="w-full max-w-sm sm:max-w-none">
          <AccountSelector
            accounts={accounts}
            selectedAccount={sendAccount}
            onSelect={(account) => {
              setSendAccount(account);
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

              <TextInputDrawer onSubmit={handleTextInputSubmit} />
              <button type="button">
                <Gift />
              </button>
            </div>

            <div />

            <div className="flex items-center justify-end">
              <Button
                onClick={handleContinue}
                disabled={Number.parseFloat(inputState.value) === 0}
              >
                Continue
              </Button>
            </div>
          </div>

          <Numpad
            value={inputState.value}
            onValueChange={(value) =>
              setInputState((prev) => ({
                ...prev,
                value,
              }))
            }
            maxDecimals={inputMoney.getMaxDecimals(inputState.unit)}
            onInvalidInput={() => {
              // toast({
              //   title: 'Invalid input',
              //   description:
              //     'We should do something like shake the screen instead of toast',
              //   variant: 'destructive',
              // });
            }}
          />
        </div>
      </PageContent>
    </>
  );
}
