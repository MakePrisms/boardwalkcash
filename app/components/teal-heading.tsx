import { Text } from '@tamagui/web';
import type { ReactNode } from 'react';

export const TealHeading = ({ children }: { children: ReactNode }) => {
  return (
    <Text tag="h1" fontSize={23} color="teal" padding={109}>
      {children}
    </Text>
  );
};
