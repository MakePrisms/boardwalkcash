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
  const selectSourceAccount = useSendStore((s) => s.selectSourceAccount);
  const sendCurrencyUnit = getDefaultUnit(sendAccount.currency);
  const displayDestination = useSendStore((s) => s.displayDestination);
  const selectDestination = useSendStore((s) => s.selectDestination);
  const clearDestination = useSendStore((s) => s.clearDestination);
  const confirm = useSendStore((s) => s.confirm);
  const status = useSendStore((s) => s.status);

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

  const handleContinue = async (inputValue: Money, convertedValue: Money) => {
    if (sendAccount.type !== 'cashu') {
      toast({
        title: 'Not implemented',
        description: 'Only sends from the cashu accounts are supported',
        variant: 'destructive',
      });
      return;
    }

    if (inputValue.isZero()) {
      return;
    }

    await confirm(inputValue, convertedValue);

    return navigate('/send/confirm', {
      applyTo: 'newView',
      transition: 'slideUp',
    });
  };

  // User can paste a bolt11, lightning address, or cashu request
  const handlePaste = async () => {
    const input = await readClipboard();
    if (!input) {
      return;
    }

    const result = await selectDestination(input);

    if (!result.success) {
      return toast({
        title: 'Invalid input',
        description: result.error,
        variant: 'destructive',
      });
    }

    const {
      data: { amount },
    } = result;

    if (amount) {
      const defaultUnit = getDefaultUnit(amount.currency);
      const { newInputValue, newConvertedValue } = setInputValue(
        amount.toString(defaultUnit),
        amount.currency,
      );

      // biome-ignore lint/style/noNonNullAssertion: TODO: see how avoid this !
      return handleContinue(newInputValue, newConvertedValue!);
    }

    // biome-ignore lint/style/noNonNullAssertion: TODO: see how avoid this !
    return handleContinue(inputValue, convertedValue!);
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
          {displayDestination && (
            <>
              <p>{displayDestination}</p>
              <X
                onClick={clearDestination}
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
              selectSourceAccount(account);
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
                onSelectContact={(contact) => {
                  selectDestination(contact.lud16);
                }}
                onSelectLud16={(lnAddress) => {
                  selectDestination(lnAddress);
                }}
              />
            </div>
            <div />

            <div className="flex items-center justify-end">
              <Button
                // biome-ignore lint/style/noNonNullAssertion: TODO: see how avoid this !
                onClick={() => handleContinue(inputValue, convertedValue!)}
                disabled={inputValue.isZero()}
                loading={status === 'confirming'}
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
