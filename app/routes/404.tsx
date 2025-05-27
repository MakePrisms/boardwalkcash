import { Page, PageContent } from '~/components/page';
import { useSearchParams } from 'react-router';

export default function NotFoundPage() {
  const [params] = useSearchParams();
  const message = params.get('message') || 'Page not found';

  return (
    <Page>
      <PageContent className="justify-center text-center">
        <h1 className="font-medium text-xl">404</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
      </PageContent>
    </Page>
  );
}
