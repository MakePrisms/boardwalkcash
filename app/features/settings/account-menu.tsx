import { Plus, User } from 'lucide-react';
import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import { useSettings } from './use-settings';

export function AccountMenu() {
  const { addAccount } = useSettings();

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="accounts">
        <AccordionTrigger className="flex gap-2">
          <User className="size-4" />
          <span>Accounts</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-2">
            <Button variant="ghost" className="justify-start">
              Profile
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={addAccount}
            >
              <Plus className="mr-2 size-4" />
              <span>Add Account</span>
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
