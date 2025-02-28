import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { Money } from '~/lib/money';
import type { Account, CashuAccount } from './account';
import { AccountTypeIcon } from './account-icons';

export type AccountWithBadges<T extends Account = Account> = T & {
  /** Text to display as a badge in the account selector */
  badges?: string[];
};
export type CashuAccountWithBadges = AccountWithBadges<CashuAccount>;

function AccountItem({ account }: { account: AccountWithBadges }) {
  return (
    <div className="flex w-full items-center gap-4 px-3 py-4">
      <AccountTypeIcon type={account.type} />
      <div className="flex w-full flex-col justify-between gap-2 text-start">
        <span className="font-medium">{account.name}</span>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {new Money({
              amount: 0, // TODO: see how we will do this
              currency: account.currency,
            }).toLocaleString({
              unit: account.currency === 'BTC' ? 'sat' : undefined,
            })}
          </span>
          {account.badges && (
            <div className="flex gap-2">
              {account.badges.map((badge) => (
                <Badge
                  className="px-2 py-0 font-normal text-2xs text-muted-foreground"
                  key={badge}
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type AccountSelectorProps<T extends Account> = {
  accounts: AccountWithBadges<T>[];
  selectedAccount: AccountWithBadges<T>;
  onSelect: (account: T) => void;
  disabled?: boolean;
};

export function AccountSelector<T extends Account>({
  accounts,
  onSelect,
  selectedAccount,
  disabled,
}: AccountSelectorProps<T>) {
  const [open, setOpen] = useState(false);

  const handleAccountSelect = (account: T) => {
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
          <div className="flex flex-col gap-2 p-2">
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
