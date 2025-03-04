import { useState } from 'react';
import { useTimeout } from 'usehooks-ts';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import useShouldShowPwaPrompt from './use-should-show-pwa-prompt';

const DEFAULT_ANIMATION_DURATION_MS = 300;
const DEFAULT_INITIAL_SHOW_DELAY_MS = 2000;

/** Return type for the useBanner hook */
type UseBannerReturn = {
  /** Whether the banner is currently visible */
  isVisible: boolean;
  /** Function to dismiss/hide the banner */
  handleDismiss: () => void;
};

/** Options for configuring the useBanner hook */
type UseBannerOptions = {
  /** Duration in ms of the show/hide animation. Defaults to 300ms */
  animationDuration?: number;
  /** Delay in ms before initially showing the banner. Defaults to 2000ms */
  initialShowDelay?: number;
};

/**
 * Hook for managing a banner component that can be shown and hidden with animations
 * @param onDismissed Optional callback that will be called after the banner is dismissed and animation completes
 * @param options Configuration options for animation timing
 */
function useBanner(
  onDismissed?: () => void,
  options: UseBannerOptions = {},
): UseBannerReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const animationDuration =
    options.animationDuration ?? DEFAULT_ANIMATION_DURATION_MS;
  const initialShowDelay =
    options.initialShowDelay ?? DEFAULT_INITIAL_SHOW_DELAY_MS;

  // Show the banner after initial delay
  useTimeout(() => setIsVisible(true), initialShowDelay);

  // Handle the callback after dismissal animation completes
  useTimeout(
    () => {
      if (onDismissed && isDismissed) {
        onDismissed();
        setIsDismissed(false);
      }
    },
    isDismissed ? animationDuration : null,
  );

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismissed) {
      setIsDismissed(true);
    }
  };

  return {
    isVisible,
    handleDismiss,
  };
}

export default function InstallPwaBanner({
  onClickInstall,
}: { onClickInstall: () => void }) {
  const { dismissTemporarily } = useShouldShowPwaPrompt();
  const { isVisible, handleDismiss } = useBanner(dismissTemporarily);

  return (
    <div
      className={cn(
        'fixed right-0 bottom-[env(safe-area-inset-bottom)] left-0 transform transition-all duration-300 ease-in-out',
        'border-t bg-background p-4',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Install Boardwalk for the best experience.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
          <Button variant="outline" size="sm" onClick={onClickInstall}>
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
