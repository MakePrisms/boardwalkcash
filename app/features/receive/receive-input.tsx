import { getDecodedToken } from '@cashu/cashu-ts';
import { ArrowUpDown, Clipboard, QrCode, Scan } from 'lucide-react';
import { useState } from 'react';
import { MoneyDisplay } from '~/components/money-display';
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

const defaultAccount = accounts[0];

const calculateDecimalPlacesEntered = (inputString: string) => {
  if (inputString.includes('.')) {
    return inputString.split('.')[1].length;
  }
  return undefined;
};

export default function ReceiveInput() {
  const { toast } = useToast();
  const navigateWithViewTransition = useNavigateWithViewTransition();

  // Primary currency for receiving payment
  const [receiveCurrency, setReceiveCurrency] = useState<AppCurrency>(
    defaultAccount.currency,
  );
  const receiveUnit: CurrencyUnit<typeof receiveCurrency> =
    receiveCurrency === 'BTC' ? 'sat' : 'usd';

  // Secondary currency for displaying converted amount
  const [convertCurrency, setConvertCurrency] = useState<AppCurrency>(
    receiveCurrency === 'BTC' ? 'USD' : 'BTC',
  );
  const convertedUnit: CurrencyUnit<typeof convertCurrency> =
    convertCurrency === 'BTC' ? 'sat' : 'usd';

  // Amount in primary receive currency
  const [receiveAmount, setReceiveAmount] = useState<
    Money<typeof receiveCurrency>
  >(new Money({ amount: 0, currency: receiveCurrency, unit: receiveUnit }));

  // Input string that gets changed by the numpad
  const [inputString, setInputString] = useState('0');
  // The currency used to display the input string
  const [activeInputCurrency, setActiveInputCurrency] =
    useState<AppCurrency>(receiveCurrency);

  // Converted amount in secondary currency
  const [convertedAmount, setConvertedAmount] = useState<
    Money<typeof convertCurrency>
  >(new Money({ amount: 0, currency: convertCurrency }));

  const rates = useExchangeRate();

  const handleContinue = async () => {
    // use receiveAmount
    // depending on the account type:
    // cashu - show cashu request and bolt11
    // nwc - show bolt11
    console.log(receiveAmount.toLocaleString({ unit: receiveUnit }));
  };

  const handleNumpadInputChange = (value: string) => {
    setInputString(value);

    if (activeInputCurrency === receiveCurrency) {
      // Input is in receive currency, calculate converted amount
      const newReceiveAmount = new Money({
        amount: value,
        currency: receiveCurrency,
        unit: receiveUnit,
      });
      setReceiveAmount(newReceiveAmount);

      const newConvertedAmount = newReceiveAmount.convert(
        convertCurrency,
        rates.getRate(receiveCurrency, convertCurrency),
      );
      setConvertedAmount(newConvertedAmount);
    } else {
      // Input is in converted currency, calculate receive amount
      const newConvertedAmount = new Money({
        amount: value,
        currency: convertCurrency,
        unit: convertedUnit,
      });
      setConvertedAmount(newConvertedAmount);

      const newReceiveAmount = newConvertedAmount.convert(
        receiveCurrency,
        rates.getRate(convertCurrency, receiveCurrency),
      );
      setReceiveAmount(newReceiveAmount);
    }
  };

  // the Money shown on top that reflects the input string
  const getMainDisplayValue = () =>
    activeInputCurrency === receiveCurrency ? receiveAmount : convertedAmount;

  // the Money shown below the main display value
  const getSecondaryDisplayValue = () => {
    if (activeInputCurrency === receiveCurrency) {
      return convertedAmount;
    }
    return receiveAmount;
  };

  const toggleInputCurrency = () => {
    // toggle the active input currency
    setActiveInputCurrency(
      activeInputCurrency === receiveCurrency
        ? convertCurrency
        : receiveCurrency,
    );

    if (Number.parseFloat(inputString) === 0) {
      // otherwise, if secondary display is 0.00, then input string will be 0.00
      setInputString('0');
    } else {
      // set input string to the secondary display value
      setInputString(
        activeInputCurrency === receiveCurrency
          ? convertedAmount.toString(convertedUnit)
          : receiveAmount.toString(receiveUnit),
      );
    }
  };

  const handleAccountSelect = (account: Account) => {
    const newReceiveCurrency = account.currency;
    const newConvertCurrency = newReceiveCurrency === 'BTC' ? 'USD' : 'BTC';

    setReceiveCurrency(newReceiveCurrency);
    setConvertCurrency(newConvertCurrency);
    setActiveInputCurrency(newReceiveCurrency);

    // Reset amounts with new currencies
    setReceiveAmount(new Money({ amount: 0, currency: newReceiveCurrency }));
    setConvertedAmount(new Money({ amount: 0, currency: newConvertCurrency }));
    setInputString('0');
  };

  const handlePaste = async () => {
    const clipboardContent = await readClipboard();
    if (!clipboardContent) {
      toast({
        title: 'Clipboard is empty',
        variant: 'destructive',
      });
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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to decode token';
      toast({
        title: 'Invalid token',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  console.log('\n========================');
  console.log('receiveCurrency', receiveCurrency);
  console.log('convertCurrency', convertCurrency);
  console.log('receiveUnit', receiveUnit);
  console.log('convertedUnit', convertedUnit);
  console.log('inputString', inputString);
  console.log('activeInputCurrency', activeInputCurrency);
  console.log(
    'receiveAmount',
    receiveAmount.toLocaleString({ unit: receiveUnit }),
  );
  console.log(
    'convertedAmount',
    convertedAmount.toLocaleString({ unit: convertedUnit }),
  );
  console.log('========================');

  return (
    <>
      <PageHeader>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Receive</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <MoneyDisplay
            money={getMainDisplayValue()}
            decimalPlaces={calculateDecimalPlacesEntered(inputString)}
          />
          <button
            type="button"
            className="flex items-center gap-2 text-gray-500"
            onClick={toggleInputCurrency}
          >
            <MoneyDisplay
              money={getSecondaryDisplayValue()}
              simpleFormat={true}
              size="sm"
            />
            <ArrowUpDown />
          </button>
        </div>
        <div className="w-full">
          <AccountSelector accounts={accounts} onSelect={handleAccountSelect} />
        </div>
        <div className="flex w-full flex-col gap-4">
          <div className="grid w-full max-w-sm grid-cols-3 gap-4 sm:w-auto">
            <div className="flex items-center justify-center gap-4">
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
            <div className="flex items-center justify-center">
              <Button onClick={handleContinue}>Continue</Button>
            </div>
          </div>
          {/* QUESTION: should this always be hidden on big screens? 
             If so, should we move the hidden class into the numpad component? */}
          <div className="sm:hidden">
            <Numpad
              value={inputString}
              onValueChange={handleNumpadInputChange}
              showDecimal={activeInputCurrency === 'USD'}
              onInvalidInput={() => {
                toast({
                  title: 'Invalid input',
                  description:
                    'We should do something like shake the screen instead of toast',
                  variant: 'destructive',
                });
                // shake the screen
                window.navigator.vibrate(100);
              }}
            />
          </div>
        </div>
      </PageContent>
    </>
  );
}
