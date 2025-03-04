import { useLocalStorage } from 'usehooks-ts';

type DismissedValue =
  | { state: 'dismissed' }
  | { state: 'dismissed-temporarily'; showAfterTimestamp: number }
  | null;

const PROMPT_PERMANENTLY_DISMISSED: DismissedValue = { state: 'dismissed' };

/**
 * Generic hook that uses localStorage to manage when to show a prompt
 * @param promptName - The name of the prompt to manage
 * @example
 * ```tsx
 * const {
 *   shouldShow,
 *   handleDontShowAgain,
 *   handleDismissTemporarily
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

  const handleDismissTemporarily = (showAfter: number) => {
    const showAgainTimestamp = Date.now() + showAfter;
    setDismissedState({
      state: 'dismissed-temporarily',
      showAfterTimestamp: showAgainTimestamp,
    });
  };

  const isPermantentlyDismissed = dismissedState?.state === 'dismissed';
  const isTemporarilyDismissed =
    dismissedState?.state === 'dismissed-temporarily' &&
    Date.now() <= dismissedState.showAfterTimestamp;

  const shouldShow = !isPermantentlyDismissed && !isTemporarilyDismissed;

  return { shouldShow, handleDontShowAgain, handleDismissTemporarily };
};

export default useShouldShowPrompt;
