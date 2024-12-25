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
  onSelect: (account: Account) => void;
};

export function AccountSelector({ accounts, onSelect }: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account>(accounts[0]);

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setOpen(false);
    onSelect(account);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center rounded-lg border bg-background"
        >
          <AccountItem account={selectedAccount} />
          {open ? (
            <ChevronUp className="ml-auto h-4 w-4" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4" />
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent>
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
      </DrawerContent>
    </Drawer>
  );
}
