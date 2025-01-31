import { getDecodedToken } from '@cashu/cashu-ts';
import { ArrowUpDown, Clipboard, QrCode, Scan } from 'lucide-react';
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
import useAnimation from '~/hooks/use-animation';
import { useNumberInput } from '~/hooks/use-number-input';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { readClipboard } from '~/lib/read-clipboard';
import {
  LinkWithViewTransition,
  useNavigateWithViewTransition,
} from '~/lib/transitions';
import { accounts } from '~/routes/_protected._index';
import { getUnit } from '~/utils';
import { useReceiveStore } from './receive-provider';

type ConvertedMoneyToggleProps = {
  onSwitchInputCurrency: () => void;
  money: Money;
};

const ConvertedMoneyToggle = ({
  onSwitchInputCurrency,
  money,
}: ConvertedMoneyToggleProps) => {
  return (
    <button
      type="button"
      className="flex items-center gap-1"
      onClick={onSwitchInputCurrency}
    >
      <MoneyDisplay
        money={money}
        unit={getUnit(money.currency)}
        variant="secondary"
      />
      <ArrowUpDown className="mb-1" />
    </button>
  );
};

export default function ReceiveInput() {
  const navigate = useNavigateWithViewTransition();
  const { toast } = useToast();
  const { animationClass: shakeAnimationClass, start: startShakeAnimation } =
    useAnimation({ name: 'shake' });

  const receiveAccount = useReceiveStore((s) => s.account);
  const receiveAmount = useReceiveStore((s) => s.amount);
  const setReceiveAccount = useReceiveStore((s) => s.setAccount);
  const setReceiveAmount = useReceiveStore((s) => s.setAmount);

  const {
    inputCurrency,
    inputValue,
    inputMoney,
    otherMoney,
    maxInputDecimals,
    handleNumberInput,
    switchInputCurrency,
  } = useNumberInput({
    active: {
      value: receiveAmount?.toString(getUnit(receiveAccount.currency)) || '0',
      currency: receiveAccount.currency,
    },
    other: {
      value: '0',
      currency: receiveAccount.currency,
    },
  });

  const handleContinue = async () => {
    if (inputCurrency === receiveAccount.currency) {
      setReceiveAmount(inputMoney);
    } else {
      setReceiveAmount(otherMoney);
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
          <div className={shakeAnimationClass}>
            <MoneyInputDisplay
              inputValue={inputValue}
              currency={inputCurrency}
              unit={getUnit(inputCurrency)}
            />
          </div>

          <ConvertedMoneyToggle
            onSwitchInputCurrency={switchInputCurrency}
            money={otherMoney}
          />
        </div>

        <div className="w-full max-w-sm sm:max-w-none">
          <AccountSelector
            accounts={accounts}
            selectedAccount={receiveAccount}
            onSelect={(account) => {
              setReceiveAccount(account);
              if (account.currency !== inputCurrency) {
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

              <LinkWithViewTransition
                to={`/receive/request/${receiveAccount.id}`}
                transition="slideUp"
                applyTo="newView"
              >
                <QrCode />
              </LinkWithViewTransition>
            </div>
            <div /> {/* spacer */}
            <Button onClick={handleContinue} disabled={inputMoney.isZero()}>
              Continue
            </Button>
          </div>

          <Numpad
            showDecimal={maxInputDecimals > 0}
            onButtonClick={(button) => {
              handleNumberInput(button, startShakeAnimation);
            }}
          />
        </div>
      </PageContent>
    </>
  );
}
