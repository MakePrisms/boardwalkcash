import * as React from 'react';

export function useSettings() {
  const addAccount = React.useCallback(() => {
    // TODO: Implement account creation logic
    console.log('Adding new account...');
  }, []);

  return {
    addAccount,
  };
}
