import { Button } from '~/components/ui/button';
import useBanner from '~/hooks/use-banner';
import { cn } from '~/lib/utils';
import useShouldShowPwaPrompt from './use-should-show-pwa-prompt';

export default function InstallPwaBanner({
  onClickInstall,
}: { onClickInstall: () => void }) {
  const { dismissForNow } = useShouldShowPwaPrompt();
  const { isVisible, handleDismiss } = useBanner(dismissForNow);

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
