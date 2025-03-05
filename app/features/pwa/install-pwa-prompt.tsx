import type { LinksFunction } from '@remix-run/node';
import { useState } from 'react';
import InstallPwaBanner from './install-pwa-banner';
import InstallPwaInstructionsDialog, {
  links as dialogLinks,
} from './install-pwa-instructions-dialog';
import useShouldShowPwaPrompt from './use-should-show-pwa-prompt';

export const links: LinksFunction = () => [...dialogLinks()];

export const InstallPwaPrompt = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { shouldShowPwaPrompt, dontShowAgain, dismissTemporarily } =
    useShouldShowPwaPrompt();

  if (!shouldShowPwaPrompt) {
    return null;
  }

  return (
    <>
      <InstallPwaBanner
        onClickInstall={() => setShowDialog(true)}
        onDismiss={dismissTemporarily}
      />
      <InstallPwaInstructionsDialog
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        onDoNotShowAgain={dontShowAgain}
      />
    </>
  );
};
