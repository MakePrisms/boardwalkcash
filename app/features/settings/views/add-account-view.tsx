import { useState } from 'react';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { SidebarContent } from '~/components/ui/sidebar';
import { AddLightningWalletForm } from '../components/add-ln-wallet-form';
import { AddMintForm } from '../components/add-mint-form';
import { SettingsViewHeader } from '../components/settings-view-header';

export function AddAccountView() {
  const [selectedType, setSelectedType] = useState<string>('');

  return (
    <>
      <SettingsViewHeader title="Add Account" />
      <SidebarContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-type">Account Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value)}
            >
              <SelectTrigger id="account-type">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spark">Spark</SelectItem>
                <SelectItem value="nwc">NWC Wallet</SelectItem>
                <SelectItem value="cashu">Cashu Mint</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedType === 'spark' && (
            <div className="text-muted-foreground text-sm">
              Spark wallet connection coming soon
            </div>
          )}

          {selectedType === 'nwc' && <AddLightningWalletForm />}

          {selectedType === 'cashu' && <AddMintForm unit="sat" />}
        </div>
      </SidebarContent>
    </>
  );
}
