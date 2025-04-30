import { CopyIcon } from 'lucide-react';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useRouteLoaderData } from 'react-router';
import { PageContent, PageFooter } from '~/components/page';
import { Button } from '~/components/ui/button';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { useUser } from '~/features/user/user-hooks';

export default function ShareProfileQR() {
  const username = useUser((u) => u.username);
  const [copied, setCopied] = useState(false);

  const { domain } = useRouteLoaderData('root') as { domain: string };
  const lightningAddress = `${username}@${domain}`;

  const copyToClipboard = () => {
    if (lightningAddress) {
      navigator.clipboard.writeText(lightningAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <SettingsViewHeader
        title="Scan QR Code"
        navBack={{
          to: '/settings',
          transition: 'slideDown',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-6 p-4">
          <h2 className="font-semibold text-xl">@{username}</h2>
          <div className="rounded-lg p-4">QR Code</div>
          <p className="text-center text-muted-foreground text-sm">
            Scan to view profile
          </p>
          {lightningAddress && (
            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2">
                <span className="text-sm">{lightningAddress}</span>
                <Button
                  className="h-8 w-8 p-0"
                  onClick={copyToClipboard}
                  size="sm"
                  variant="ghost"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContent>
      <PageFooter>
        <div className="text-center text-sidebar-foreground/70 text-xs">
          Share your profile with others
        </div>
      </PageFooter>
    </>
  );
}
