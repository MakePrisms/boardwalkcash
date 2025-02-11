import type { Big } from 'big.js';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { LandmarkIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { type Currency, Money } from '~/lib/money';

export type AccountType = 'cashu' | 'nwc';

export type Account = {
  id: string;
  name: string;
  currency: Currency;
  type: AccountType;
  balance: Big;
} & (
  | {
      type: 'cashu';
      isTestMint: boolean;
      mintUrl: string;
    }
  | {
      type: 'nwc';
      nwcUrl: string;
    }
);

const CashuIcon = () => <LandmarkIcon className="h-4 w-4" />;
const NWCIcon = () => <Zap className="h-4 w-4" />;

const icons: Record<AccountType, ReactNode> = {
  cashu: <CashuIcon />,
  nwc: <NWCIcon />,
};

function AccountItem({ account }: { account: Account }) {
  return (
    <div className="flex items-center gap-4 px-3 py-4 ">
      {icons[account.type]}
      <div className="flex flex-col justify-between gap-2 text-start ">
        <span className="font-medium">{account.name}</span>
        <span className="text-muted-foreground text-xs">
          {new Money({
            amount: account.balance,
            currency: account.currency,
          }).toLocaleString({
            unit: account.currency === 'BTC' ? 'sat' : undefined,
          })}
        </span>
      </div>
    </div>
  );
}

type AccountSelectorProps = {
  accounts: Account[];
  selectedAccount: Account;
  onSelect: (account: Account) => void;
  disabled?: boolean;
};

export function AccountSelector({
  accounts,
  onSelect,
  selectedAccount,
  disabled,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleAccountSelect = (account: Account) => {
    setOpen(false);
    onSelect(account);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger disabled={disabled} asChild>
        <button
          type="button"
          className="flex w-full items-center rounded-lg border border-primary bg-background pr-4"
        >
          <AccountItem account={selectedAccount} />
          {!disabled &&
            (open ? (
              <ChevronUp className="ml-auto h-4 w-4" />
            ) : (
              <ChevronDown className="ml-auto h-4 w-4" />
            ))}
        </button>
      </DrawerTrigger>
      <DrawerContent className="font-primary">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>Select account</DrawerHeader>
          <div className="flex flex-col gap-2 p-4">
            {[
              selectedAccount,
              ...accounts.filter((a) => a.id !== selectedAccount.id),
            ].map((account) => (
              <button
                type="button"
                key={account.id}
                onClick={() => handleAccountSelect(account)}
                className={`rounded-lg hover:bg-muted ${
                  selectedAccount.id === account.id ? 'bg-muted' : ''
                }`}
              >
                <AccountItem account={account} />
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
