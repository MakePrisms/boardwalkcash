import { ArrowUpDown, AtSign, Clipboard, Scan, X, ZapIcon } from 'lucide-react';
import { useState } from 'react';
import { MoneyDisplay, MoneyInputDisplay } from '~/components/money-display';
import { Numpad } from '~/components/numpad';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { SearchBar } from '~/components/search-bar';
import { Button } from '~/components/ui/button';
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { DrawerTrigger } from '~/components/ui/drawer';
import { Drawer } from '~/components/ui/drawer';
import { Skeleton } from '~/components/ui/skeleton';
import { useAccounts } from '~/features/accounts/account-hooks';
import { AccountSelector } from '~/features/accounts/account-selector';
import useAnimation from '~/hooks/use-animation';
import { useMoneyInput } from '~/hooks/use-money-input';
import { useToast } from '~/hooks/use-toast';
import { getLNURLPayParams, isLNURLError } from '~/lib/lnurl';
import type { Money } from '~/lib/money';
import { readClipboard } from '~/lib/read-clipboard';
import {
  LinkWithViewTransition,
  useNavigateWithViewTransition,
} from '~/lib/transitions';
import { AddContactDrawer, ContactsList } from '../contacts';
import type { Contact } from '../contacts/contact';
import { useContacts } from '../contacts/contact-hooks';
import { getDefaultUnit } from '../shared/currencies';
import { getErrorMessage } from '../shared/error';
import { useSendStore } from './send-provider';
import { useGetInvoiceFromLud16 } from './use-get-invoice-from-lud16';

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
  const { mutateAsync: getInvoiceFromLud16 } = useGetInvoiceFromLud16();
  const [isContinuing, setIsContinuing] = useState(false);

  const sendAmount = useSendStore((s) => s.amount);
  const sendAccount = useSendStore((s) => s.account);
  const sendCurrencyUnit = getDefaultUnit(sendAccount.currency);
  const lud16 = useSendStore((s) => s.lud16);
  const destination = useSendStore((s) => s.destination);
  const setSendAmount = useSendStore((s) => s.setAmount);
  const setSendAccount = useSendStore((s) => s.setAccount);
  const setPaymentRequest = useSendStore((s) => s.setPaymentRequest);
  const setLud16 = useSendStore((s) => s.setLud16);
  const setContact = useSendStore((s) => s.setContact);
  const clearDestinations = useSendStore((s) => s.clearDestinations);

  const {
    rawInputValue,
    maxInputDecimals,
    inputValue,
    convertedValue,
    exchangeRateError,
    handleNumberInput,
    switchInputCurrency,
    setInputValue,
    getInputValue,
  } = useMoneyInput({
    initialRawInputValue: sendAmount?.toString(sendCurrencyUnit) || '0',
    initialInputCurrency: sendAccount.currency,
    initialOtherCurrency: sendAccount.currency === 'BTC' ? 'USD' : 'BTC',
  });

  const handleContinue = async () => {
    setIsContinuing(true);
    if (inputValue.currency === sendAccount.currency) {
      setSendAmount(inputValue);
    } else {
      if (!convertedValue) {
        // Can't happen because when there is no converted value, the toggle will not be shown so input currency and receive currency must be the same
        return;
      }
      setSendAmount(convertedValue);
    }

    if (lud16) {
      const bitcoinInputValue = getInputValue('BTC');

      try {
        const bolt11 = await getInvoiceFromLud16({
          lud16,
          amount: bitcoinInputValue,
        });
        setPaymentRequest(bolt11);
      } catch (error) {
        toast({
          title: 'Error getting invoice from Lightning Address',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
        return;
      }
    }

    setIsContinuing(false);

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

  // User can paste a bolt11, lightning address, or cashu request
  const handlePaste = async () => {
    const input = await readClipboard();
    if (!input) {
      return;
    }

    if (await isValidLightningAddress(input)) {
      setLud16(input);
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
          {destination && (
            <>
              <p>{destination}</p>
              <X
                onClick={clearDestinations}
                className="h-4 w-4 cursor-pointer"
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

              <SelectContactOrLud16Drawer
                onSelectContact={setContact}
                onSelectLud16={setLud16}
              />
            </div>
            <div />

            <div className="flex items-center justify-end">
              <Button
                onClick={handleContinue}
                disabled={inputValue.isZero()}
                loading={isContinuing}
              >
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

const isValidLightningAddress = async (address: string) => {
  if (!address.includes('@') || !address.includes('.')) {
    return false;
  }
  try {
    const params = await getLNURLPayParams(address);
    return !isLNURLError(params);
  } catch {
    return false;
  }
};

type SelectContactOrLud16DrawerProps = {
  onSelectContact: (contact: Contact) => void;
  onSelectLud16: (lightningAddress: string) => void;
};

function SelectContactOrLud16Drawer({
  onSelectContact,
  onSelectLud16,
}: SelectContactOrLud16DrawerProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { toast } = useToast();
  const contacts = useContacts((contacts) =>
    contacts.filter((contact) =>
      contact.username.toLowerCase().includes(input.toLowerCase()),
    ),
  );

  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    setOpen(false);
    setInput('');
  };

  const handleCustomSelect = async (selection: string) => {
    if (await isValidLightningAddress(selection)) {
      onSelectLud16(selection);
    } else {
      return toast({
        title: 'Invalid Lightning Address',
        description: 'Please enter a valid Lightning Address',
        variant: 'destructive',
      });
    }
    setOpen(false);
    setInput('');
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" onClick={() => setOpen(true)}>
          <AtSign />
        </button>
      </DrawerTrigger>
      <DrawerContent className="h-[90vh] font-primary ">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Send to User</DrawerTitle>
          <AddContactDrawer />
        </DrawerHeader>
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0">
          <SearchBar
            placeholder="Username or Lightning Address"
            onSearch={setInput}
          />

          {input.includes('@') && input.includes('.') && (
            <button
              className="flex w-full items-center gap-3 p-3 hover:bg-accent"
              onClick={() => handleCustomSelect(input)}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-sm">
                <ZapIcon />
              </div>
              <p>Send to Lightning Address: {input}</p>
            </button>
          )}
          <ContactsList contacts={contacts} onClick={handleSelectContact} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
