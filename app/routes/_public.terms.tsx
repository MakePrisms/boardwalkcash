import logo from '~/assets/full_logo.png';
import termsContent from '~/assets/terms-of-use.md?raw';
import { Markdown } from '~/components/markdown';
import { ScrollArea } from '~/components/ui/scroll-area';

export default function TermsPage() {
  return (
    <ScrollArea className=" mx-auto h-dvh max-w-4xl px-4 py-8" hideScrollbar>
      <header className="mb-8 flex items-center justify-start">
        <a href="/">
          <img src={logo} alt="Agicash Logo" className="mr-4 h-16" />
        </a>
      </header>

      <main>
        <Markdown content={termsContent} />
      </main>
    </ScrollArea>
  );
}
