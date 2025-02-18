import type { LinksFunction } from '@remix-run/node';
import type { LucideIcon } from 'lucide-react';
import icon from '~/assets/icon-192x192.png';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';

export const links: LinksFunction = () => [
  { rel: 'preload', href: icon, as: 'image' },
];

export type InstallInstruction = {
  icon: LucideIcon;
  text: string;
};

type Props = {
  instructions: InstallInstruction[];
  showDialog: boolean;
  setShowDialog: (showDialog: boolean) => void;
  onDoNotShowAgain: () => void;
};

export default function InstallPwaInstructionsDialog({
  instructions,
  showDialog,
  setShowDialog,
  onDoNotShowAgain,
}: Props) {
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="px-4 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <img
              src={icon}
              alt="Boardwalk icon"
              className="h-16 w-16 rounded-lg"
            />
            <div className="flex h-full flex-col items-start justify-between">
              <DialogTitle className="text-left">Boardwalk</DialogTitle>
              <DialogDescription className="text-left">
                Install Boardwalk to your home screen for the best experience.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-6 flex w-full flex-col gap-4">
          {instructions.map((instruction, index) => {
            const Icon = instruction.icon;
            return (
              <div key={instruction.text} className="flex items-center gap-4">
                <Icon className="h-6 w-6 shrink-0" />
                <div className="flex items-center gap-1">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center font-medium">
                    {index + 1}.
                  </div>
                  <div>{instruction.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDoNotShowAgain}>
            Don't show again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
