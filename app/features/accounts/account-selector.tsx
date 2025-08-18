import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { ScrollArea } from '~/components/ui/scroll-area';
import { cn } from '~/lib/utils';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import { type ExtendedAccount, getAccountBalance } from './account';
import { AccountTypeIcon } from './account-icons';

export type AccountWithBadges<T extends ExtendedAccount = ExtendedAccount> =
  T & {
    /** Text to display as a badge in the account selector */
    badges?: string[];
    /** Whether the account is selectable */
    selectable?: boolean;
  };

function AccountItem({ account }: { account: AccountWithBadges }) {
  const balance = getAccountBalance(account);

  return (
    <div className="flex w-full items-center gap-4 px-3 py-4">
      <AccountTypeIcon type={account.type} />
      <div className="flex w-full flex-col justify-between gap-2 text-start">
        <span className="font-medium">{account.name}</span>
        <div className="flex items-center justify-between text-xs">
          <MoneyWithConvertedAmount money={balance} variant="inline" />
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

type AccountSelectorProps<T extends ExtendedAccount> = {
  accounts: AccountWithBadges<T>[];
  selectedAccount: AccountWithBadges<T>;
  onSelect?: (account: T) => void;
  disabled?: boolean;
};

export function AccountSelector<T extends ExtendedAccount>({
  accounts,
  onSelect,
  selectedAccount,
  disabled,
}: AccountSelectorProps<T>) {
  const [open, setOpen] = useState(false);

  const handleAccountSelect = (account: T) => {
    setOpen(false);
    onSelect?.(account);
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
      <DrawerContent className="h-[60dvh] pb-14 font-primary">
        <div className="mx-auto flex h-full w-full max-w-sm flex-col overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>Select account</DrawerTitle>
          </DrawerHeader>
          <ScrollArea hideScrollbar>
            <div className="flex flex-col gap-2 p-2">
              {[
                selectedAccount,
                ...accounts.filter((a) => a.id !== selectedAccount.id),
              ].map((account) => (
                <button
                  disabled={account.selectable === false}
                  type="button"
                  key={account.id}
                  onClick={() => handleAccountSelect(account)}
                  className={cn(
                    'rounded-lg hover:bg-muted',
                    selectedAccount.id === account.id && 'bg-muted',
                    account.selectable === false &&
                      'pointer-events-none cursor-not-allowed opacity-50',
                  )}
                >
                  <AccountItem account={account} />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
