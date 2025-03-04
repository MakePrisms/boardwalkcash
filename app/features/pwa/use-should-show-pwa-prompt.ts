import { useEffect, useState } from 'react';
import useShouldShowPrompt from '~/hooks/use-should-show-prompt';
import useUserAgent, { type Browser } from '~/hooks/use-user-agent';

const key = 'showPwaPrompt';
const TEMPORARY_DISMISS_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

type Return = {
  /** True if the PWA prompt should be shown based on the user's browser, device, and if the app is already installed */
  shouldShowPwaPrompt: boolean;
  /** The user's browser parsed from the user agent string */
  browser: Browser;
  /** Function to permanently dismiss the PWA prompt */
  dontShowAgain: () => void;
  /** Function to temporarily dismiss the PWA prompt */
  dismissTemporarily: () => void;
};

/** Hook for managing when to show the PWA prompt */
export default function useShouldShowPwaPrompt(): Return {
  const { shouldShow, handleDontShowAgain, handleDismissTemporarily } =
    useShouldShowPrompt(key);
  const { isMobile, browser } = useUserAgent();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is installed (if it's installed we wont show the prompt)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }
  }, []);

  const shouldShowPwaPrompt = shouldShow && isMobile && !isStandalone;

  return {
    browser,
    shouldShowPwaPrompt,
    dontShowAgain: handleDontShowAgain,
    dismissTemporarily: () =>
      handleDismissTemporarily(TEMPORARY_DISMISS_DURATION_MS),
  };
}
