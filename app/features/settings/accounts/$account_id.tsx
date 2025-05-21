import { PageContent } from '~/components/page';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  type Account,
  type ExtendedCashuAccount,
  getAccountBalance,
} from '~/features/accounts/account';
import { useAccount } from '~/features/accounts/account-hooks';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import { useSetDefaultAccount } from '~/features/user/user-hooks';
import { useToast } from '~/hooks/use-toast';
import { Money } from '~/lib/money';

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
      <div className="flex flex-col gap-6 p-6">
        <MoneyWithConvertedAmount money={getAccountBalance(account)} />

        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 w-full space-y-4 p-6 sm:max-w-sm">
          <div className="flex w-full justify-end">
            {account.isDefault && <Badge variant="outline">Default</Badge>}
          </div>
          {[
            { label: 'Type', value: account.type },
            { label: 'Currency', value: account.currency },
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

      {!account.isDefault && (
        <div className="fixed right-0 bottom-16 left-0 flex justify-center">
          <Button onClick={makeDefault}>Make default</Button>
        </div>
      )}
    </>
  );
}

function NwcAccount({
  account,
}: { account: Account & { type: 'nwc'; isDefault: boolean } }) {
  return (
    <div>
      <p>Account type: {account.type}</p>
      <p>Currency: {account.currency}</p>
      <p>NWC URL: {account.nwcUrl}</p>
      <p>
        {/* TODO: see about balance */}
        Balance:{' '}
        {new Money({ amount: 0, currency: account.currency }).toLocaleString()}
      </p>
    </div>
  );
}

export default function SingleAccount({ accountId }: { accountId: string }) {
  const account = useAccount(accountId);
  return (
    <>
      <SettingsViewHeader
        title={account.name}
        navBack={{
          to: '/settings/accounts',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        {account.type === 'cashu' && <CashuAccount account={account} />}
        {account.type === 'nwc' && <NwcAccount account={account} />}
      </PageContent>
    </>
  );
}
