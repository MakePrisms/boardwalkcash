import { useSearchParams } from 'react-router';
import logo from '~/assets/full_logo.png';
import privacyContent from '~/assets/privacy-policy.md?raw';
import { Markdown } from '~/components/markdown';
import { ScrollArea } from '~/components/ui/scroll-area';
import { LinkWithViewTransition } from '~/lib/transitions';

export default function PrivacyPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  return (
    <ScrollArea className="mx-auto h-dvh max-w-4xl px-4 py-8" hideScrollbar>
      <header className="mb-8 flex items-center justify-start">
        <LinkWithViewTransition
          to={{
            pathname: redirectTo ?? '/',
          }}
          transition="slideDown"
          applyTo="oldView"
        >
          <img src={logo} alt="Agicash Logo" className="mr-4 h-8" />
        </LinkWithViewTransition>
      </header>
      <main>
        <Markdown content={privacyContent} />
      </main>
    </ScrollArea>
  );
}
