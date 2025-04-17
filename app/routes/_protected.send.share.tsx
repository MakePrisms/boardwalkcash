import type { LoaderFunctionArgs } from 'react-router';
import {
  ClosePageButton,
  Page,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Redirect } from '~/components/redirect';
import { useSendStore } from '~/features/send';
import { ShareCashuToken } from '~/features/send/share-cashu-token';

// this loader is used in the ShareCashuToken component to generate the shareable link
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const protocol = url.origin.includes('localhost') ? 'http' : url.protocol;
  return { origin: `${protocol}://${url.host}`, pathname: url.pathname };
}

export default function SendShare() {
  const token = useSendStore((state) => state.token);
  const amount = useSendStore((state) => state.amount);

  if (!amount || !token) {
    return (
      <Redirect to="/send" logMessage="No amount or token in send store" />
    );
  }

  return (
    <Page>
      <PageHeader>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Send</PageHeaderTitle>
      </PageHeader>
      <ShareCashuToken token={token} amount={amount} />
    </Page>
  );
}
