import type { LinksFunction } from '@remix-run/node';
import {
  House,
  Menu,
  MoreVertical,
  Plus,
  Share,
  SquarePlus,
} from 'lucide-react';
import { useState } from 'react';
import type { Browser } from '../../hooks/use-user-agent';
import InstallPwaBanner from './install-pwa-banner';
import type { InstallInstruction } from './install-pwa-instructions-dialog';
import InstallPwaInstructionsDialog, {
  links as dialogLinks,
} from './install-pwa-instructions-dialog';
import useShouldShowPwaPrompt from './use-should-show-pwa-prompt';

export const links: LinksFunction = () => [...dialogLinks()];

const browserInstructions: Record<Browser, InstallInstruction[]> = {
  Safari: [
    { icon: Share, text: 'Click the Share button in navigation bar' },
    { icon: SquarePlus, text: 'Scroll down to "Add to Home Screen"' },
  ],
  Chrome: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: SquarePlus, text: 'Scroll down to "Add to Home Screen"' },
  ],
  ChromeiOS: [
    { icon: Share, text: 'Click the Share button in search bar' },
    { icon: SquarePlus, text: 'Scroll down to "Add to Home Screen"' },
  ],
  Firefox: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Click "Install"' },
  ],
  FirefoxiOS: [
    { icon: Menu, text: 'Click the menu button' },
    { icon: Share, text: 'Click "Share"' },
    { icon: SquarePlus, text: 'Scroll down to "Add to Home Screen"' },
  ],
  SamsungBrowser: [
    { icon: Menu, text: 'Click the menu button' },
    { icon: Plus, text: 'Click "Add page to"' },
    { icon: House, text: 'Click "Home screen"' },
  ],
  unknown: [
    { icon: MoreVertical, text: 'Click the menu button' },
    { icon: Plus, text: 'Look for "Add to Home Screen" option' },
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
