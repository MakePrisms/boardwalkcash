import logo from '~/assets/full_logo.png';
import privacyContent from '~/assets/privacy-policy.md?raw';
import { Markdown } from '~/components/markdown';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-start">
        <a href="/">
          <img src={logo} alt="Agicash Logo" className="mr-4 h-16" />
        </a>
      </header>
      <main>
        <Markdown content={privacyContent} />
      </main>
    </div>
  );
}
