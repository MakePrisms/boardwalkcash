import { useState } from 'react';
import { useTimeout } from 'usehooks-ts';

const DEFAULT_DISMISS_DELAY_MS = 300;
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
  /** Delay in ms before initially showing the banner. Defaults to 2000ms */
  initialShowDelay?: number;
  /** Delay in ms before the banner is dismissed. Defaults to 300ms */
  onDismissedDelay?: number;
};

/**
 * Hook for managing a banner component
 * @param onDismissed Optional callback that will be called after the banner is dismissed
 * @param options Configuration options
 */
export default function useBanner(
  onDismissed?: () => void,
  options: UseBannerOptions = {},
): UseBannerReturn {
  const [isVisible, setIsVisible] = useState(false);

  const onDismissedDelay = options.onDismissedDelay ?? DEFAULT_DISMISS_DELAY_MS;
  const initialShowDelay =
    options.initialShowDelay ?? DEFAULT_INITIAL_SHOW_DELAY_MS;

  // Show the banner after initial delay
  useTimeout(() => setIsVisible(true), initialShowDelay);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismissed) {
      setTimeout(onDismissed, onDismissedDelay);
    }
  };

  return {
    isVisible,
    handleDismiss,
  };
}
