import { MoreVertical, Plus, Share, SquarePlus } from 'lucide-react';
import { useState } from 'react';
import type { Browser } from '../../hooks/use-user-agent';
import InstallPwaBanner from './install-pwa-banner';
import type { InstallInstruction } from './install-pwa-instructions-dialog';
import InstallPwaInstructionsDialog from './install-pwa-instructions-dialog';
import useShouldShowPwaPrompt from './use-should-show-pwa-prompt';

const browserInstructions: Record<Browser, InstallInstruction[]> = {
  Safari: [
    { icon: Share, text: 'Press Share in Navigation Bar' },
    { icon: SquarePlus, text: 'Scroll down to "Add to Home Screen"' },
  ],
  Chrome: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Select "Install Boardwalk"' },
  ],
  ChromeiOS: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Select "Install Boardwalk"' },
  ],
  Firefox: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Select "Install"' },
  ],
  FirefoxiOS: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Select "Add page to"' },
    { icon: Plus, text: 'Select "Home screen"' },
  ],
  SamsungBrowser: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Select "Add page to"' },
    { icon: Plus, text: 'Select "Home screen"' },
  ],
  unknown: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Select "Add page to"' },
    { icon: Plus, text: 'Select "Home screen"' },
  ],
};

export const InstallPwaPrompt = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { shouldShowPwaPrompt, dontShowAgain, browser } =
    useShouldShowPwaPrompt();

  if (!shouldShowPwaPrompt) {
    return null;
  }

  return (
    <>
      <InstallPwaBanner onClickInstall={() => setShowDialog(true)} />
      <InstallPwaInstructionsDialog
        instructions={browserInstructions[browser]}
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        onDoNotShowAgain={dontShowAgain}
      />
    </>
  );
};
