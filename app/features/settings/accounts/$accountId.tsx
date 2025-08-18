import { PageContent } from '~/components/page';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  type ExtendedCashuAccount,
  getAccountBalance,
} from '~/features/accounts/account';
import { useAccount } from '~/features/accounts/account-hooks';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import { useSetDefaultAccount } from '~/features/user/user-hooks';
import { useToast } from '~/hooks/use-toast';

function AccountDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <Badge variant="secondary" className="text-sm">
        {label}
      </Badge>
      <div className="flex items-center">
        <Badge variant="outline" className="text-muted-foreground">
          {value}
        </Badge>
      </div>
    </div>
  );
}

function CashuAccount({ account }: { account: ExtendedCashuAccount }) {
  const { toast } = useToast();
  const setDefaultAccount = useSetDefaultAccount();

  const makeDefault = async () => {
    try {
      await setDefaultAccount(account);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to make account default. Please try again',
      });
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-12 pt-4">
        <div className="flex flex-col gap-12">
          <h1 className="text-center text-2xl">{account.name}</h1>
          <MoneyWithConvertedAmount money={getAccountBalance(account)} />
        </div>

        <div className="w-full space-y-8 sm:max-w-sm">
          <div className="h-[24px]">
            {account.isDefault && <Badge>Default</Badge>}
          </div>
          {[
            { label: 'Type', value: account.type },
            {
              label: 'Mint',
              value: account.mintUrl
                .replace('https://', '')
                .replace('http://', ''),
            },
          ].map((detail) => (
            <AccountDetailItem key={detail.label} {...detail} />
          ))}
        </div>
      </div>

      <div className="fixed right-0 bottom-16 left-0 flex h-[40px] justify-center">
        {!account.isDefault && (
          <Button onClick={makeDefault}>Make default</Button>
        )}
      </div>
    </>
  );
}

export default function SingleAccount({ accountId }: { accountId: string }) {
  const account = useAccount(accountId);
  return (
    <>
      <SettingsViewHeader
        navBack={{
          to: '/settings/accounts',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        {account.type === 'cashu' && (
          <CashuAccount account={account as ExtendedCashuAccount} />
        )}
      </PageContent>
    </>
  );
}
