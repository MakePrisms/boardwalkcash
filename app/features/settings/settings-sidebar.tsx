import { Cog } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
} from '~/components/ui/sidebar';
import {
  SettingsSidebarProvider,
  useSettingsSidebar,
} from './settings-sidebar-provider';
import { AddAccountView } from './views/add-account-view';
import { AdvancedSettingsView } from './views/advanced-settings-view';
import { AllAccountsView } from './views/all-accounts-view';
import { AppearanceView } from './views/appearance-view';
import { ContactsView } from './views/contacts-view';
import { EditProfileView } from './views/edit-profile-view';
import { MainView } from './views/main-view';
import { QrView } from './views/qr-view';
import { SingleAccountView } from './views/single-account-view';

export function SettingsSidebarContent() {
  const { state } = useSettingsSidebar();
  const { view } = state;

  return (
    <Sidebar side="right">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{
            duration: 0.2,
            ease: 'linear',
          }}
        >
          {view === 'main' && <MainView />}

          {view === 'qr' && <QrView />}

          {view === 'edit-profile' && <EditProfileView />}

          {view === 'all-accounts' && <AllAccountsView />}

          {view === 'single-account' && (
            <SingleAccountView accountID={state.selectedAccountID} />
          )}

          {view === 'contacts' && <ContactsView />}

          {view === 'appearance' && <AppearanceView />}

          {view === 'add-account' && <AddAccountView />}

          {view === 'advanced' && <AdvancedSettingsView />}
        </motion.div>
      </AnimatePresence>
    </Sidebar>
  );
}

export function SettingsSidebar() {
  return (
    <SidebarProvider defaultOpen={false}>
      <SettingsSidebarProvider>
        <SidebarTrigger icon={<Cog />} />
        <SettingsSidebarContent />
      </SettingsSidebarProvider>
    </SidebarProvider>
  );
}
