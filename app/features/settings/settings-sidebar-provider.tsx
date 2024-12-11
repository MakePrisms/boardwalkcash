import { type ReactNode, createContext, useContext, useState } from 'react';
import type {
  NavigateToView,
  SettingsSidebarState,
  SettingsView,
} from './types';

interface SettingsSidebarContextType {
  state: SettingsSidebarState;
  navigateToView: NavigateToView;
  goBack: () => void;
}

interface SettingsSidebarProviderProps {
  children: ReactNode;
}

const SettingsSidebarContext = createContext<
  SettingsSidebarContextType | undefined
>(undefined);

const defaultState: SettingsSidebarState = {
  view: 'main',
  previousState: null,
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
      if (!params) throw new Error('Missing accountID param');
      setState((prevState) => ({
        view,
        selectedAccountID: params.accountID,
        previousState: prevState,
      }));
    } else {
      setState((prevState) => ({
        view,
        previousState: prevState,
      }));
    }
  };

  const goBack = () => {
    setState((prevState) => {
      if (!prevState.previousState) return defaultState;

      if (prevState.previousState.view === 'single-account') {
        if (!prevState.previousState.selectedAccountID)
          throw new Error('Missing previous accountID');
        return {
          view: prevState.previousState.view,
          selectedAccountID: prevState.previousState.selectedAccountID,
          previousState: null,
        };
      }

      return {
        view: prevState.previousState.view,
        previousState: null,
      };
    });
  };

  return (
    <SettingsSidebarContext.Provider
      value={{
        state,
        navigateToView,
        goBack,
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
