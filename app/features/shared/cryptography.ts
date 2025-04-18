import { useOpenSecret } from '@opensecret/react';
import { useMemo } from 'react';

export const useCryptography = () => {
  const {
    getPrivateKey: getMnemonic,
    signMessage,
    getPublicKey,
  } = useOpenSecret();

  return useMemo(() => {
    return {
      getMnemonic,
      signMessage,
      getPublicKey,
    };
  }, [getMnemonic, signMessage, getPublicKey]);
};
