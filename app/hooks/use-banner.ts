import { useState } from 'react';
import { useTimeout } from 'usehooks-ts';

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
export default function useBanner(
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
