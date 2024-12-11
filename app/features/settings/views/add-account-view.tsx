import { ChevronLeft, Landmark } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { SidebarContent, SidebarHeader } from '~/components/ui/sidebar';
import { AddLightningWalletForm } from '../components/add-ln-wallet-form';
import { AddMintForm } from '../components/add-mint-form';
import { SettingsNavButton } from '../components/settings-nav-button';
import { SettingsViewHeader } from '../components/settings-view-header';
import type { AccountType } from '../types';

export function AddAccountView() {
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const headerTitle =
    selectedType === null
      ? 'Add Account'
      : `Add ${selectedType.charAt(0).toUpperCase()}${selectedType.slice(1)}`;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedType}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{
            duration: 0.2,
            ease: 'linear',
          }}
        >
          {selectedType === null ? (
            <>
              <SettingsViewHeader title={headerTitle} />
              <SidebarContent>
                <SettingsNavButton onNavigate={() => setSelectedType('spark')}>
                  <span>Spark</span>
                </SettingsNavButton>
                <SettingsNavButton onNavigate={() => setSelectedType('nwc')}>
                  Lightning Wallet
                </SettingsNavButton>
                <SettingsNavButton onNavigate={() => setSelectedType('cashu')}>
                  <Landmark />
                  <span>Cashu Mint</span>
                </SettingsNavButton>
              </SidebarContent>
            </>
          ) : (
            <>
              <SidebarHeader>
                <div className="relative flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedType(null)}
                    className="absolute left-0"
                  >
                    <ChevronLeft />
                  </Button>
                  <h2 className="w-full text-center font-semibold text-lg">
                    {headerTitle}
                  </h2>
                </div>
              </SidebarHeader>
              {selectedType === 'spark' && <div>Spark coming soon</div>}
              {selectedType === 'nwc' && <AddLightningWalletForm />}
              {selectedType === 'cashu' && <AddMintForm unit="sat" />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
