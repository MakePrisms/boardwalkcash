import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { Money } from '~/lib/money';
import type { Account } from './account';
import { getAccountIcon } from './account-icons';

function AccountItem({ account }: { account: Account }) {
  return (
    <div className="flex items-center gap-4 px-3 py-4 ">
      {getAccountIcon(account.type)}
      <div className="flex flex-col justify-between gap-2 text-start ">
        <span className="font-medium">{account.name}</span>
        <span className="text-muted-foreground text-xs">
          {new Money({
            amount: 0, // TODO: see how we will do this
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
};

export function AccountSelector({
  accounts,
  onSelect,
  selectedAccount,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleAccountSelect = (account: Account) => {
    setOpen(false);
    onSelect(account);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center rounded-lg border border-primary bg-background pr-4"
        >
          <AccountItem account={selectedAccount} />
          {open ? (
            <ChevronUp className="ml-auto h-4 w-4" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4" />
          )}
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
