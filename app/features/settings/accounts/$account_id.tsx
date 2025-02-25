import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import type { Account } from '~/features/accounts/account';
import { useAccount } from '~/features/accounts/account-hooks';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { useSetDefaultAccount } from '~/features/user/user-hooks';
import { useToast } from '~/hooks/use-toast';
import { Money } from '~/lib/money';

function CashuAccount({
  account,
}: { account: Account & { type: 'cashu'; isDefault: boolean } }) {
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
    <div>
      <p>Account type: {account.type}</p>
      <p>Currency: {account.currency}</p>
      <p>Mint URL: {account.mintUrl}</p>
      <p>
        {/* TODO: see about balance */}
        Balance:{' '}
        {new Money({ amount: 0, currency: account.currency }).toLocaleString()}
      </p>
      {account.isDefault ? (
        <p>Default account</p>
      ) : (
        <Button onClick={makeDefault}>Make default</Button>
      )}
    </div>
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
