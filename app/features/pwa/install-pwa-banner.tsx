import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import useShouldShowPwaPrompt from './use-should-show-pwa-prompt';

export default function InstallPwaBanner({
  onClickInstall,
}: { onClickInstall: () => void }) {
  const { dismissForNow } = useShouldShowPwaPrompt();

  return (
    <div className="fixed right-0 bottom-[env(safe-area-inset-bottom)] left-0 border-t bg-background p-6">
      <button
        type="button"
        onClick={dismissForNow}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
      >
        <X size={16} />
      </button>
      <p className="mb-4 text-muted-foreground text-sm">
        Install Boardwalk for the best experience.
      </p>
      <div className="container flex items-center justify-end gap-6">
        <Button
          variant="default"
          size="sm"
          onClick={onClickInstall}
          className="flex-1"
        >
          Install
        </Button>
      </div>
    </div>
  );
}
