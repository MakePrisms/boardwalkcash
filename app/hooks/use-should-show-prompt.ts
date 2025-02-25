import { useLocalStorage } from 'usehooks-ts';

type DismissedValue = 'dismissed' | number | null;

const PROMPT_PERMANENTLY_DISMISSED = 'dismissed';

/**
 * Generic hook that uses localStorage to manage when to show a prompt
 * @param promptName - The name of the prompt to manage
 * @example
 * ```tsx
 * const {
 *   shouldShow,
 *   handleDontShowAgain,
 *   handleDismissForNow
 * } = useShouldShowPrompt('showInstallPwaPrompt');
 * ```
 * */
const useShouldShowPrompt = (promptName: string) => {
  const [dismissedState, setDismissedState] = useLocalStorage<DismissedValue>(
    promptName,
    null,
  );

  const handleDontShowAgain = () => {
    setDismissedState(PROMPT_PERMANENTLY_DISMISSED);
  };

  const handleDismissForNow = (showAfter: number) => {
    const showAgainTimestamp = Date.now() + showAfter;
    setDismissedState(showAgainTimestamp);
  };

  const isPermantentlyDismissed =
    dismissedState === PROMPT_PERMANENTLY_DISMISSED;
  const isTemporarilyDismissed =
    typeof dismissedState === 'number' && Date.now() <= dismissedState;

  const shouldShow = !isPermantentlyDismissed && !isTemporarilyDismissed;

  return { shouldShow, handleDontShowAgain, handleDismissForNow };
};

export default useShouldShowPrompt;
