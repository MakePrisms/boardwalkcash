import { useEffect, useState } from 'react';

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

  const animationDuration =
    options.animationDuration ?? DEFAULT_ANIMATION_DURATION_MS;
  const initialShowDelay =
    options.initialShowDelay ?? DEFAULT_INITIAL_SHOW_DELAY_MS;

  // Show the banner after initial delay
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), initialShowDelay);
    return () => clearTimeout(timer);
  }, [initialShowDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismissed) {
      const timer = setTimeout(onDismissed, animationDuration);
      return () => clearTimeout(timer);
    }
  };

  return {
    isVisible,
    handleDismiss,
  };
}
