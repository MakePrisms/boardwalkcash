import { type OpenSecretContextType, useOpenSecret } from '@opensecret/react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useRef } from 'react';

type KeyActions = {
  getPublicKey: OpenSecretContextType['getPublicKey'];
  getPrivateKey: OpenSecretContextType['getPrivateKeyBytes'];
};

export const useKeyActions = (): KeyActions => {
  const openSecret = useOpenSecret();

  // We are doing this to keep references for these actions constant. Open secret implementation currently creates a new
  // reference for each render. See https://github.com/OpenSecretCloud/OpenSecret-SDK/blob/master/src/lib/main.tsx#L350
  const getPublicKeyRef = useRef(openSecret.getPublicKey);
  const getPrivateKeyRef = useRef(openSecret.getPrivateKeyBytes);

  return {
    getPublicKey: getPublicKeyRef.current,
    getPrivateKey: getPrivateKeyRef.current,
  };
};

// We will end up replacing these with indexs when OpenSecret supports BIP-85
const sparkDerivationPaths = {
  REGTEST: "m/44'/1'/1/0",
  MAINNET: "m/44'/2'/1/0",
};

const sparkSeedQueryKey = 'spark-seed';

export const useSparkSeed = (network: 'REGTEST' | 'MAINNET') => {
  const { getPrivateKey } = useKeyActions();

  return useSuspenseQuery({
    queryKey: [sparkSeedQueryKey, network],
    queryFn: () => getPrivateKey(sparkDerivationPaths[network]),
  });
};
