import { useParams } from '@remix-run/react';
import { Page } from '~/components/page';
import SingleAccount from '~/features/settings/accounts/$account_id';

export default function SingleAccountPage() {
  const { account_id } = useParams();

  if (!account_id) {
    throw new Error('Account ID is required');
  }

  return (
    <Page>
      <SingleAccount accountId={account_id} />
    </Page>
  );
}
