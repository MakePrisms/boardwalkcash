import { useEffect, useState } from 'react';
import logo from '../assets/full_logo.png';

type ParsedLine = {
  type:
    | 'paragraph'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'listItem'
    | 'break';
  content: string;
};

type PolicyContainerProps = {
  content: string;
};

export function PolicyContainer({ content }: PolicyContainerProps) {
  const [parsedContent, setParsedContent] = useState<ParsedLine[]>([]);

  // Simple markdown parser without external libraries
  useEffect(() => {
    if (!content) return;

    const lines = content.split('\n');
    const parsed: ParsedLine[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        parsed.push({ type: 'break', content: '' });
      } else if (trimmedLine.startsWith('# ')) {
        parsed.push({ type: 'heading1', content: trimmedLine.substring(2) });
      } else if (trimmedLine.startsWith('## ')) {
        parsed.push({ type: 'heading2', content: trimmedLine.substring(3) });
      } else if (trimmedLine.startsWith('### ')) {
        parsed.push({ type: 'heading3', content: trimmedLine.substring(4) });
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        parsed.push({ type: 'listItem', content: trimmedLine.substring(2) });
      } else {
        parsed.push({ type: 'paragraph', content: trimmedLine });
      }
    });

    setParsedContent(parsed);
  }, [content]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-start">
        <a href="/">
          <img src={logo} alt="Agicash Logo" className="mr-4 h-16" />
        </a>
      </div>

      <div className="policy-content prose">
        {parsedContent.map((line) => {
          const key = `${line.content}`;
          switch (line.type) {
            case 'heading1':
              return (
                <h1 key={key} className="font-bold text-2xl">
                  {line.content}
                </h1>
              );
            case 'heading2':
              return (
                <h2 key={key} className="mt-6 mb-3 font-bold text-xl">
                  {line.content}
                </h2>
              );
            case 'heading3':
              return (
                <h3 key={key} className="mt-4 mb-2 font-bold text-lg">
                  {line.content}
                </h3>
              );
            case 'listItem':
              return (
                <div key={key} className="mb-2 ml-4 flex">
                  <span className="mr-2">•</span>
                  <span>{line.content}</span>
                </div>
              );
            case 'paragraph':
              return (
                <p key={key} className="mb-4">
                  {line.content}
                </p>
              );
            case 'break':
              return <div key={key} className="h-4" />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
