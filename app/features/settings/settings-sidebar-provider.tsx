import { type ReactNode, createContext, useContext, useState } from 'react';
import type {
  NavigateToView,
  SettingsSidebarState,
  SettingsView,
} from './types';

interface SettingsSidebarContextType {
  state: SettingsSidebarState;
  navigateToView: NavigateToView;
}

interface SettingsSidebarProviderProps {
  children: ReactNode;
}

const SettingsSidebarContext = createContext<
  SettingsSidebarContextType | undefined
>(undefined);

const defaultState: SettingsSidebarState = {
  view: 'main',
};

export function SettingsSidebarProvider({
  children,
}: SettingsSidebarProviderProps) {
  const [state, setState] = useState<SettingsSidebarState>(defaultState);

  const navigateToView: NavigateToView = (
    view: SettingsView,
    params?: { accountID: string },
  ) => {
    if (view === 'single-account') {
      // Can we make it so that params is always defined if we're navigating to single-account?
      if (!params) throw new Error('Missing accountID param');
      // TODO: Validate accountID
      setState({ view, selectedAccountID: params.accountID });
    } else {
      setState({ view });
    }
  };

  return (
    <SettingsSidebarContext.Provider
      value={{
        state,
        navigateToView,
      }}
    >
      {children}
    </SettingsSidebarContext.Provider>
  );
}

export function useSettingsSidebar() {
  const context = useContext(SettingsSidebarContext);
  if (context === undefined) {
    throw new Error(
      'useSettingsSidebar must be used within a SettingsSidebarProvider',
    );
  }
  return context;
}
