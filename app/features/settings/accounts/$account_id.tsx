import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import type {
  Account,
  ExtendedCashuAccount,
} from '~/features/accounts/account';
import { useAccount } from '~/features/accounts/account-hooks';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { useSetDefaultAccount } from '~/features/user/user-hooks';
import { useToast } from '~/hooks/use-toast';
import { Money } from '~/lib/money';
import { AccountBalance } from '~/features/accounts/account-balance';

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
    <Card className="w-full">
      <CardContent className="space-y-3">
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-sm'>Account type</span>
          <div className='flex items-center gap-2'>
            <Badge variant="outline">{account.type}</Badge>
            {account.isDefault && <Badge variant="outline">Default</Badge>}
          </div>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-sm'>Currency</span>
          <span>{account.currency}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-sm'>Mint URL</span>
          <span className='max-w-[60%] truncate text-right text-sm'>{account.mintUrl.replace('https://', '').replace('http://', '')}</span>
        </div>
        <div className='flex items-center justify-between pt-2'>
          <span className='text-muted-foreground text-sm'>Balance</span>
          <AccountBalance account={account} />
        </div>
      </CardContent>
      {!account.isDefault && (
        <CardFooter className="justify-end">
          <Button onClick={makeDefault}>Make default</Button>
        </CardFooter>
      )}
    </Card>
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
