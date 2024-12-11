export type SettingsView =
  | 'main'
  | 'qr'
  | 'edit-profile'
  | 'all-accounts'
  | 'add-account'
  | 'single-account'
  | 'advanced'
  | 'appearance'
  | 'contacts';

export type AccountType = 'spark' | 'cashu' | 'nwc';

export type SettingsSidebarState = {
  view: SettingsView;
} & (
  | {
      view: 'single-account';
      selectedAccountID: string;
    }
  | {
      view: Exclude<SettingsView, 'single-account'>;
    }
);

// Goal is to specify params for specific viewss
export type NavigateToView = {
  (view: 'single-account', params: { accountID: string }): void;
  (view: Exclude<SettingsView, 'single-account'>): void;
};
